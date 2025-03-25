import Campaign from "../../models/campaign.model.js";
import dotenv from "dotenv";
import Contacts from "../../models/contacts.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import User from "../../models/user.model.js";
import {
	overview,
	sendMessagesReports,
	getFailedReportsById,
	getRepliesReportsById,
	getReadReportsById,
	getDeliveredReportsById,
	getSentReportsById,
	getCampaignOverview,
} from "./reports.functions.js";
import {
	isNumber,
	isString,
	isBoolean,
} from "../../middleWares/sanitiseInput.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { agenda } from "../../config/db.js";
import { sendCampaignScheduledEmail } from "../../services/OTP/reportsEmail.js";
// import { user.FB_ACCESS_TOKEN } from "../../backEnd-Routes/facebook.backEnd.routes.js";

dotenv.config();

export const getCampaignList = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser.owner;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) next();

		const { status, timeFrame, phoneNumberId } = req.query;

		if (!isString(status, timeFrame)) next();

		let matchQuery = {
			useradmin: userId,
			deleted: { $ne: true }, // Adjust based on your campaign schema
		};

		if (status === "scheduled") {
			matchQuery["status"] = { $in: ["SCHEDULED", "IN_QUEUE"] };
		} else if (status === "all") {
			delete matchQuery["status"];
		} else {
			matchQuery["status"] = { $nin: ["SCHEDULED", "IN_QUEUE"] };
		}

		if (timeFrame) {
			const [startDateStr, endDateStr] = timeFrame.split(" to ");
			if (startDateStr && endDateStr) {
				const startDate = new Date(startDateStr);
				const endDate = new Date(endDateStr);

				startDate.setHours(0, 0, 0, 0);
				endDate.setHours(23, 59, 59, 999);
				endDate.setTime(endDate.getTime() + 1000 * 60 * 60 * 24);

				// console.log(startDate.getTime());
				// console.log(endDate.getTime());

				matchQuery["createdAt"] = {
					$gte: startDate.getTime(),
					$lte: endDate.getTime(), 
				};
			}
		}

		let phoneNumbers = await User.findOne({ unique_id: userId });

		phoneNumbers = phoneNumbers.FB_PHONE_NUMBERS;

		let selectedNumber = phoneNumbers.find((num) => num.selected == true);

		if (selectedNumber) {
			matchQuery.phoneNumberId = selectedNumber.phone_number_id;
		}

		if (phoneNumberId && phoneNumberId != "All") {
			matchQuery.phoneNumberId = phoneNumberId;
		} else if (phoneNumberId == "All") {
			delete matchQuery.phoneNumberId;
		}

		// Fetch campaigns created by the user
		const campaigns = await Campaign.aggregate([
			{
				$match: matchQuery,
			},
			{
				$lookup: {
					from: "campaignreports",
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					total: { $size: "$reports" }, // Total number of reports

					sent: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $ne: ["$$report.status", "FAILED"] },
							},
						},
					},

					read: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "READ"] },
							},
						},
					},

					failed: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "FAILED"] },
							},
						},
					},

					delivered: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "DELIVERED"] },
							},
						},
					},

					replied: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "REPLIED"] },
							},
						},
					},
				},
			},
			{
				$sort: { createdAt: -1 },
			},
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = campaigns[0]?.paginatedResults || [];
		const totalCount = campaigns[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.type) {
				res.render("Reports/campaign", {
					access: access,
					campaigns: paginatedResults,
					page,
					totalPages,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
					phoneNumbers,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: userId });
			res.render("Reports/campaign", {
				access: access.access,
				campaigns: paginatedResults,
				page,
				totalPages,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
				whatsAppStatus: req.session?.user?.whatsAppStatus,
				phoneNumbers,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

export const getCampaignListFilter = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const search = req.query?.search;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isString(search)) next();

		let matchQuery = {
			useradmin: userId,
			deleted: { $ne: true }, // Adjust based on your campaign schema
		};

		const trimmedQuery = search.trim();
		const escapeRegex = (text) =>
			text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		const escapedQuery = escapeRegex(trimmedQuery);

		if (search) {
			matchQuery["name"] = { $regex: escapedQuery, $options: "imsx" };
		}

		// Fetch filtered campaigns first
		const result = await Campaign.aggregate([
			{
				$match: matchQuery,
			},
			{
				$lookup: {
					from: "campaignreports", // Reports collection
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					total: { $size: "$reports" }, // Total number of reports

					sent: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "SENT"] },
							},
						},
					},

					read: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "READ"] },
							},
						},
					},

					failed: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "FAILED"] },
							},
						},
					},

					delivered: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "DELIVERED"] },
							},
						},
					},

					replied: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "REPLIED"] },
							},
						},
					},
				},
			},
			{
				$sort: { createdAt: -1 },
			},
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = result[0]?.paginatedResults || [];
		const totalCount = result[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.type) {
				res.render("Reports/partials/campaignTable", {
					access: access,
					campaigns: paginatedResults,
					page,
					totalPages,
					photo: req.session.addedUser?.photo,
					name: req.session.addedUser.name,
					color: req.session.addedUser.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: userId });
			res.render("Reports/partials/campaignTable", {
				access: access.access,
				campaigns: paginatedResults,
				page,
				totalPages,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

export const getCampaignReports = async (req, res, next) => {
	const { filter } = req.query;

	if (!isString(filter)) return next();

	if (filter == "sent") {
		await getSentReportsById(req, res, next);
	} else if (filter == "delivered") {
		await getDeliveredReportsById(req, res, next);
	} else if (filter == "read") {
		await getReadReportsById(req, res, next);
	} else if (filter == "replies") {
		await getRepliesReportsById(req, res, next);
	} else if (filter == "failed") {
		await getFailedReportsById(req, res, next);
	} else {
		await getCampaignOverview(req, res, next);
	}
};

export const getSendBroadcast = async (req, res, next) => {
	// console.log(req.body);
	const data = req.session?.sendBroadcast;
	// console.log(data);
	if (data) {
		// delete req.session.tempData;
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({ unique_id: permissions });
			if (
				access.contactList.sendBroadcast &&
				req.session?.addedUser?.whatsAppStatus
			) {
				// const access = Permissions.findOne({ unique_id: permissions });
				res.render("Reports/createCampaign", {
					access,
					name: req.session?.addedUser?.name,
					photo: req.session?.addedUser?.photo,
					color: req.session?.addedUser?.color,
					data,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else if (req.session?.user?.whatsAppStatus) {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/createCampaign", {
				access: access.access,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
				data,
			});
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});

			res.render("Reports/createCampaign", {
				access: access.access,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
				data,
			});
			// res.render("errors/notAllowed");
		}
	} else {
		console.log("broadcast data not found");
		return res.render("errors/serverError");
	}
};

export const createCampaignData = async (req, res, next) => {
	try {
		// console.log(req.body);
		req.session.sendBroadcast = req.body;
		res.json({ success: true, message: "got the details" });
	} catch (error) {
		console.log(error);
		res.json({ success: false, message: error });
	}
};

export const createCampaign = async (req, res, next) => {
	try {
		// console.log(req.body);
		let {
			templateId,
			contactListId,
			variables,
			schedule,
			name,
			contactList,
		} = req.body;

		if (!templateId || !contactListId || !name) {
			return res.status(400).json({
				message: "All fields are required",
			});
		}

		if (!isString(name)) return next();

		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;
		schedule =
			typeof schedule === "string" ? JSON.parse(schedule) : schedule;

		let id = req.session?.user?.id || req.session?.addedUser?.owner;

		let user = await User.findOne({ unique_id: id });

		const phone_number = user.FB_PHONE_NUMBERS.find(
			(n) => n.selected == true,
		).phone_number_id;

		if (!phone_number) {
			throw new Error("No phone number selected.");
		}

		// Find contacts by contactListId
		const contactLists = await Contacts.find({
			contactId: contactListId,
		});

		// console.log(contactLists);

		contactList = contactLists.filter((c) => {
			// console.log(c.wa_id);
			return contactList.some((cl) => {
				console.log(cl.recipientPhone);
				return (
					c.wa_id === cl.recipientPhone || // Match directly with wa_id
					"91" + c.wa_id === cl.recipientPhone // Match with "91" prefix
				);
			});
		});

		// console.log(phone_number);

		// Create new campaign object
		const newCampaign = new Campaign({
			useradmin: id,
			unique_id: generateUniqueId(),
			templateId,
			contactListId,
			variables,
			name,
			contactList,
			phoneNumberId: phone_number,
		});

		if (!schedule) {
			await sendMessagesReports(
				newCampaign,
				user,
				generateUniqueId(),
				contactList,
				phone_number,
			);

			const time = Date.now() + 15 * 60 * 1000;
			const reportTime = new Date(time);
			agenda.schedule(reportTime, "send campaign report email", {
				campaignId: newCampaign.unique_id,
				userId: newCampaign.useradmin,
			});

			await ActivityLogs.create({
				useradmin: id,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name
					? req.session?.user?.name
					: req.session?.addedUser?.name,
				actions: "Send",
				details: `Sent campaign named: ${name}`,
			});
		} else {
			newCampaign.scheduledAt = Number(schedule) * 1000;
			newCampaign.status = "SCHEDULED";

			await sendCampaignScheduledEmail(
				user.email,
				name,
				newCampaign.scheduledAt,
			);

			await ActivityLogs.create({
				useradmin: id,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name
					? req.session?.user?.name
					: req.session?.addedUser?.name,
				actions: "Send",
				details: `Scheduled new campaign named: ${name}`,
			});
		}

		// try {
		// 	const userId =
		// 		id;
		// 	const user = await User.findOne({ unique_id: userId });

		// 	if (user?.email) {
		// 		await sendCampaignScheduledEmail(
		// 			user.email,
		// 			name,
		// 			newCampaign.scheduledAt,
		// 		);
		// 	} else {
		// 		console.warn("No email found for user:", userId);
		// 	}
		// } catch (emailError) {
		// 	console.error(
		// 		"Failed to send scheduled confirmation email:",
		// 		emailError,
		// 	);
		// }

		// Save the campaign
		await newCampaign.save();
		res.status(201).json({
			message: "Campaign created successfully",
			campaign: newCampaign,
		});
	} catch (error) {
		console.error("Error creating campaign:", error.message);
		res.status(500).json({
			message: `Error creating campaign: ${error.message}`,
		});
	}
};

export const getCostReport = async (req, res) => {
	try {
		console.log("here");
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const user = await User.findOne({ unique_id: userId });

		const WABA_ID = user.WABA_ID;
		const graph = process.env.FB_GRAPH_VERSION;

		if (!user || !WABA_ID || !graph) {
			return res.status(400).json({
				error: "User does not have required credentials",
			});
		}

		// Get timestamps from query parameters
		const start =
			req.query.start ||
			Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60; // Default 90 days ago
		const end = req.query.end || Math.floor(Date.now() / 1000);
		const categories = ["MARKETING", "UTILITY", "AUTHENTICATION"];

		// Meta API Endpoint for conversation analytics
		const apiURL =
			`https://graph.facebook.com/${graph}/${WABA_ID}?fields=conversation_analytics` +
			`.start(${start})` +
			`.end(${end})` +
			`.granularity(DAILY)` +
			`.conversation_categories(${JSON.stringify(categories)})` +
			`.dimensions(["CONVERSATION_CATEGORY"])` +
			`&access_token=${user.FB_ACCESS_TOKEN}`;

		const response = await fetch(apiURL, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
			},
		});

		const data = await response.json();
		// console.log(data);
		if (!response.ok) {
			console.error(
				"Error fetching conversation analytics:",
				data.error?.message,
			);
			return res.status(response.status).json({
				error:
					data.error?.message ||
					"Failed to fetch conversation analytics",
			});
		}

		// Process the data into a more usable format
		const data_points = [];

		if (data.conversation_analytics?.data?.[0]?.data_points) {
			// Group data points by date and category
			const groupedData = new Map();

			data.conversation_analytics.data[0].data_points.forEach((point) => {
				const date = new Date(point.start * 1000)
					.toISOString()
					.split("T")[0];
				if (!groupedData.has(date)) {
					groupedData.set(date, {
						MARKETING: { conversations: 0, cost: 0 },
						UTILITY: { conversations: 0, cost: 0 },
						AUTHENTICATION: { conversations: 0, cost: 0 },
					});
				}

				const category = point.conversation_category;
				const categoryData = groupedData.get(date)[category] || {
					conversations: 0,
					cost: 0,
				};
				categoryData.conversations += point.conversation || 0;
				categoryData.cost += point.cost || 0;
				groupedData.get(date)[category] = categoryData;
			});

			// Convert grouped data back to array format
			for (const [date, categoryData] of groupedData) {
				for (const category of categories) {
					data_points.push({
						start: new Date(date).getTime() / 1000,
						end: new Date(date).getTime() / 1000 + 86400, // Add 24 hours
						conversation_category: category,
						conversation: categoryData[category].conversations,
						cost: categoryData[category].cost,
					});
				}
			}
		}
		// console.log(data_points);
		// Check permissions and render response
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});

			if (access.reports?.costReports) {
				return res.json(data_points);
			} else {
				return res.status(403).json({ error: "Not allowed" });
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			return res.json(data_points);
		}
	} catch (error) {
		console.error("Error fetching cost report :", error);
		return res.status(500).json({ error: "Internal server error" });
	}
};

export const renderGetCostReport = async (req, res) => {
	try {
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (
				access.contactList.sendBroadcast &&
				req.session?.addedUser?.whatsAppStatus
			) {
				res.render("Reports/costReport", {
					access,
					name: req.session?.addedUser?.name,
					photo: req.session?.addedUser?.photo,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else if (req.session?.user?.whatsAppStatus) {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/costReport", {
				access: access.access,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
			});
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});

			res.render("Reports/costReport", {
				access: access.access,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
			});
			// res.render("errors/notAllowed");
		}
	} catch (err) {
		console.log("Error rendering costReports :", err);
		return res.render("errors/serverError");
	}
};

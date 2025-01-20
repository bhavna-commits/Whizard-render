import Campaign from "../../models/campaign.model.js";
import Contacts from "../../models/contacts.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import User from "../../models/user.model.js";
import { overview } from "./reports.functions.js";
import { sendMessages } from "./reports.functions.js";
import {
	isNumber,
	isString,
	isBoolean,
} from "../../middleWares/sanitiseInput.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";

export const getCampaignList = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser.owner;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) next();
		// Fetch campaigns created by the user
		const campaigns = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					deleted: { $ne: true },
				},
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
					photo: req.session.addedUser?.photo,
					name: req.session.addedUser.name,
					color: req.session.addedUser.color,
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
		await getSentReportsById(req, res);
	} else if (filter == "delivered") {
		await getDeliveredReportsById(req, res);
	} else if (filter == "read") {
		await getReadReportsById(req, res);
	} else if (filter == "replies") {
		await getRepliesReportsById(req, res);
	} else if (filter == "failed") {
		await getFailedReportsById(req, res);
	} else {
		await getCampaignOverview(req, res);
	}
};

export const getCampaignListFilter = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const { status, timeFrame, search } = req.query;

		if (!isString(status, timeFrame, search)) next();
		if (!isNumber(page)) next();

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

		const trimmedQuery = search.trim();
		const escapeRegex = (text) =>
			text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		const escapedQuery = escapeRegex(trimmedQuery);

		if (search) {
			matchQuery["name"] = { $regex: escapedQuery, $options: "imsx" };
		}

		if (timeFrame) {
			const [startDateStr, endDateStr] = timeFrame.split(" to ");
			if (startDateStr && endDateStr) {
				const startDate = new Date(startDateStr);
				const endDate = new Date(endDateStr);

				startDate.setHours(0, 0, 0, 0);
				endDate.setHours(23, 59, 59, 999);

				matchQuery["createdAt"] = {
					$gte: startDate.getTime(),
					$lte: endDate.getTime(),
				};
			}
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

const getCampaignOverview = async (req, res, next) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;

		if (!isNumber(page)) return next();
		if (!isString(id)) return next();

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const limit = 6;
		const skip = (page - 1) * limit;

		// Fetch campaigns created by the user
		const campaigns = await overview(id, userId, page, limit, skip);

		const paginatedResults = campaigns[0]?.paginatedResults || [];
		const totalCount = campaigns[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

		paginatedResults.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact.Name;
				}
			});
		});
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.reports?.conversationReports?.viewReports) {
				res.render("Reports/campaignOverview", {
					access,
					campaigns: paginatedResults[0].reports,
					id,
					page,
					totalPages,
					totalMessages: paginatedResults[0].totalMessages || 0,
					messagesSent: paginatedResults[0].messagesSent || 0,
					messagesDelivered:
						paginatedResults[0].messagesDelivered || 0,
					messagesRead: paginatedResults[0].messagesRead || 0,
					messagesReplied: paginatedResults[0].messagesReplied || 0,
					messagesFailed: paginatedResults[0].messagesFailed || 0,
					percentSent:
						paginatedResults[0].percentSent?.toFixed(2) || 0,
					percentDelivered:
						paginatedResults[0].percentDelivered?.toFixed(2) || 0,
					percentRead:
						paginatedResults[0].percentRead?.toFixed(2) || 0,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			// console.log(access.access);
			res.render("Reports/campaignOverview", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				id,
				page,
				totalPages,
				totalMessages: paginatedResults[0].totalMessages || 0,
				messagesSent: paginatedResults[0].messagesSent || 0,
				messagesDelivered: paginatedResults[0].messagesDelivered || 0,
				messagesRead: paginatedResults[0].messagesRead || 0,
				messagesReplied: paginatedResults[0].messagesReplied || 0,
				messagesFailed: paginatedResults[0].messagesFailed || 0,
				percentSent: paginatedResults[0].percentSent?.toFixed(2) || 0,
				percentDelivered:
					paginatedResults[0].percentDelivered?.toFixed(2) || 0,
				percentRead: paginatedResults[0].percentRead?.toFixed(2) || 0,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getSentReportsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(id)) return next();

		// Fetch Sent campaign reports
		const sentReports = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					unique_id: id,
					deleted: { $ne: true },
				},
			},
			{
				$lookup: {
					from: "campaignreports",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										{ $eq: ["$status", "SENT"] },
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					// Add messagesSent count for SENT status
					messagesSent: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);

		// Attach the relevant contact information to each report
		sentReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact.Name;
				}
			});
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.viewReports) {
				res.render("Reports/campaignSent", {
					access,
					totalCount: sentReports[0]?.messagesSent,
					campaigns: sentReports[0]?.reports,
					contact: sentReports[0]?.contacts[0],
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/campaignSent", {
				access: access.access,
				campaigns: sentReports[0]?.reports,
				contact: sentReports[0]?.contacts[0],
				totalCount: sentReports[0]?.messagesSent,
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

const getDeliveredReportsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(id)) return next();

		// Fetch Delivered campaign reports
		const deliveredReports = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					unique_id: id,
					deleted: { $ne: true },
				},
			},
			{
				$lookup: {
					from: "campaignreports",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										{ $eq: ["$status", "DELIVERED"] },
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					// Add messagesDelivered count for DELIVERED status
					messagesDelivered: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);

		// Attach the relevant contact information to each report
		deliveredReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact
						? contact.Name
						: "Unknown Contact";
				}
			});
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.viewReports) {
				res.render("Reports/campaignDelivered", {
					access,
					campaigns: deliveredReports[0]?.reports,
					contact: deliveredReports[0]?.contacts[0],
					totalCount: deliveredReports[0]?.messagesDelivered,
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/campaignDelivered", {
				access: access.access,
				campaigns: deliveredReports[0]?.reports,
				contact: deliveredReports[0]?.contacts[0],
				totalCount: deliveredReports[0]?.messagesDelivered,
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

const getReadReportsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(id)) return next();

		// Fetch Read campaign reports
		const readReports = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					unique_id: id,
					deleted: { $ne: true },
				},
			},
			{
				$lookup: {
					from: "campaignreports",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										{ $eq: ["$status", "READ"] },
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					// Add messagesRead count for READ status
					messagesRead: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);

		const paginatedResults = readReports || [];

		// Attach the relevant contact information to each report
		paginatedResults.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact
						? contact.Name
						: "Unknown Contact";
				}
			});
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.viewReports) {
				res.render("Reports/campaignRead", {
					access,
					campaigns: paginatedResults[0].reports,
					contact: paginatedResults[0].contacts[0],
					totalCount: paginatedResults[0].messagesRead,
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/campaignRead", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				contact: paginatedResults[0].contacts[0],
				totalCount: paginatedResults[0].messagesRead,
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

const getRepliesReportsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(id)) return next();

		// Fetch campaign reports where there are replies
		const repliedReports = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					unique_id: id,
					deleted: { $ne: true },
				},
			},
			{
				$lookup: {
					from: "campaignreports",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										{
											$and: [
												{
													$ne: [
														"$replyContent",
														null,
													],
												}, // Not null
												{ $ne: ["$replyContent", ""] }, // Not empty string
												{ $type: "$replyContent" }, // Ensure field exists
											],
										},
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					// Add messagesReplied count where replies exist
					messagesReplied: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);

		// Attach the relevant contact information to each report
		repliedReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact
						? contact.Name
						: "Unknown Contact";
				}
			});
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.viewReports) {
				res.render("Reports/campaignReplies", {
					access,
					campaigns: repliedReports[0]?.reports,
					contact: repliedReports[0]?.contacts[0],
					totalCount: repliedReports[0]?.messagesReplied,
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/campaignReplies", {
				access: access.access,
				campaigns: repliedReports[0]?.reports,
				contact: repliedReports[0]?.contacts[0],
				totalCount: repliedReports[0]?.messagesReplied,
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

const getFailedReportsById = async (req, res, next) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(id)) return next();

		// Fetch Failed campaign reports
		const failedReports = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					unique_id: id,
					deleted: { $ne: true },
				},
			},
			{
				$lookup: {
					from: "campaignreports",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										{ $eq: ["$status", "FAILED"] },
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					// Add messagesFailed count where the status is "FAILED"
					messagesFailed: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);

		// Attach the relevant contact information to each report
		failedReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact
						? contact.Name
						: "Unknown Contact";
				}
			});
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.reports.conversationReports.viewReports) {
				res.render("Reports/campaignFailed", {
					access,
					campaigns: failedReports[0]?.reports || [],
					contact: failedReports[0]?.contacts[0] || {},
					totalCount: failedReports[0]?.messagesFailed || 0,
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Reports/campaignFailed", {
				access: access.access,
				campaigns: failedReports[0]?.reports || [],
				contact: failedReports[0]?.contacts[0] || {},
				totalCount: failedReports[0]?.messagesFailed || 0,
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

export const getSendBroadcast = async (req, res, next) => {
	// console.log(req.body);
	const data = req.session?.tempData;
	// console.log(data);
	if (data) {
		delete req.session.tempData;
	} else {
		console.log("broadcast data not found");
		return res.render("errors/serverError");
	}
	const permissions = req.session?.addedUser?.permissions;
	if (permissions) {
		const access = Permissions.findOne({ unique_id: permissions });
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
		const access = await User.findOne({ unique_id: req.session?.user?.id });
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
};

export const createCampaignData = async (req, res, next) => {
	try {
		// console.log(req.body);
		req.session.tempData = req.body;
		res.json({ success: true, message: "got the details" });
	} catch (error) {
		console.log(error);
		res.json({ success: false, message: error });
	}
};

export const createCampaign = async (req, res, next) => {
	try {
		let {
			templateId,
			contactListId,
			variables,
			schedule,
			name,
			contactList,
		} = req.body;

		if (!templateId || !contactListId || name) {
			return res.status(400).json({
				message: "All fields are required",
			});
		}

		if (!isString(templateId, contactListId, variables, schedule, name))
			return next();

		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;
		schedule =
			typeof schedule === "string" ? JSON.parse(schedule) : schedule;

		// Create new campaign object
		const newCampaign = new Campaign({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			templateId,
			contactListId,
			variables,
			name,
			contactList,
		});

		// Find contacts by contactListId
		const contactLists = await Contacts.find({
			contactId: contactListId,
		});

		contactList = contactLists.map((c) =>
			contactList.forEach((cl) => c.wa_id == cl.recipientPhone),
		);

		if (!schedule) {
			await sendMessages(
				newCampaign,
				req.session?.user?.id || req.session?.addedUser?.owner,
				generateUniqueId(),
				contactList,
			);

			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session.user.name
					? req.session.user.name
					: req.session.addedUser.name,
				actions: "Send",
				details: `Sent campaign named: ${name}`,
			});
		} else {
			newCampaign.scheduledAt = Number(schedule) * 1000;
			newCampaign.status = "SCHEDULED";

			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session.user.name
					? req.session.user.name
					: req.session.addedUser.name,
				actions: "Send",
				details: `Scheduled new campaign named: ${name}`,
			});
		}

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

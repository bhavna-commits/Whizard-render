import User from "../../models/user.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import dotenv from "dotenv";
import Contacts from "../../models/contacts.model.js";
import {
	convertUTCToLocal,
	oneDayInMilliSeconds,
} from "../../utils/utilFunctions.js";

dotenv.config();

export const getDashboard = async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		const user = await User.findOne({ unique_id: id });
		// Convert startDate and endDate to timestamps
		const startTimestamp = startDate ? convertUTCToLocal(startDate) : null;
		const endTimestamp = endDate
			? convertUTCToLocal(endDate) + oneDayInMilliSeconds
			: null;
		console.log(startTimestamp, endTimestamp);
		// Build the filter for the query
		const filter = { useradmin: id, deleted: false };

		if (startTimestamp && endTimestamp) {
			filter.createdAt = { $gte: startTimestamp, $lte: endTimestamp };
		}
		// if (status && status !== "All") {
		// 	filter.status = status;
		// }

		// Now query the CampaignReport with the filter
		const campaignOverview = await Report.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: null,
					totalMessages: { $sum: 1 },
					messagesSent: {
						$sum: {
							$cond: [
								{
									$in: [
										"$status",
										[
											"SENT",
											"DELIVERED",
											"READ",
											"REPLIED",
											"FAILED",
										],
									],
								},
								1,
								0,
							],
						},
					},
					messagesDelivered: {
						$sum: {
							$cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0],
						},
					},
					messagesRead: {
						$sum: {
							$cond: [{ $eq: ["$status", "READ"] }, 1, 0],
						},
					},
					messagesReplied: {
						$sum: {
							$cond: [{ $eq: ["$status", "REPLIED"] }, 1, 0],
						},
					},
					messagesFailed: {
						$sum: {
							$cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
						},
					},
					totalCampaigns: { $sum: 1 },
				},
			},
		]);

		// Default values if no reports found
		const campaignStats =
			campaignOverview.length > 0
				? campaignOverview[0]
				: {
						totalMessages: 0,
						messagesSent: 0,
						messagesDelivered: 0,
						messagesRead: 0,
						messagesReplied: 0,
						messagesFailed: 0,
						totalCampaigns: 0,
				  };

		// Aggregate contact list data (same as before)
		const contactLists = await ContactList.aggregate([
			{ $match: { useradmin: id, deleted: { $ne: true } } },
			{
				$lookup: {
					from: "contacts",
					localField: "_id",
					foreignField: "contactList",
					as: "contacts",
				},
			},
			{
				$unwind: {
					path: "$contacts",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: null,
					totalContacts: { $sum: 1 },
					totalLists: { $sum: 1 },
				},
			},
		]);

		const contactOverview =
			contactLists.length > 0
				? contactLists[0]
				: {
						totalContacts: 0,
						totalLists: 0,
				  };

		// Calculate percentages
		const percentSent =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesSent / campaignStats.totalMessages) *
				  100
				: 0;
		const percentDelivered =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesDelivered /
						campaignStats.totalMessages) *
				  100
				: 0;
		const percentRead =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesRead / campaignStats.totalMessages) *
				  100
				: 0;

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access) {
				// console.log(access);
				res.render("Dashboard/dashboard", {
					access,
					config: process.env.CONFIG_ID,
					app: process.env.FB_APP_ID,
					graph: process.env.FB_GRAPH_VERSION,
					status: user.WhatsAppConnectStatus,
					secret: process.env.FB_APP_SECRET,
					totalMessages: campaignStats.totalMessages,
					messagesSent: campaignStats.messagesSent,
					messagesDelivered: campaignStats.messagesDelivered,
					messagesRead: campaignStats.messagesRead,
					messagesReplied: campaignStats.messagesReplied,
					messagesFailed: campaignStats.messagesFailed,
					totalCampaigns: campaignStats.totalCampaigns,
					percentSent: percentSent.toFixed(2),
					percentDelivered: percentDelivered.toFixed(2),
					percentRead: percentRead.toFixed(2),
					totalContacts: contactOverview.totalContacts,
					totalLists: contactOverview.totalLists,
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
			res.render("Dashboard/dashboard", {
				access: access.access,
				config: process.env.CONFIG_ID,
				app: process.env.FB_APP_ID,
				graph: process.env.FB_GRAPH_VERSION,
				status: user.WhatsAppConnectStatus,
				secret: process.env.FB_APP_SECRET,
				totalMessages: campaignStats.totalMessages,
				messagesSent: campaignStats.messagesSent,
				messagesDelivered: campaignStats.messagesDelivered,
				messagesRead: campaignStats.messagesRead,
				messagesReplied: campaignStats.messagesReplied,
				messagesFailed: campaignStats.messagesFailed,
				totalCampaigns: campaignStats.totalCampaigns,
				percentSent: percentSent.toFixed(2),
				percentDelivered: percentDelivered.toFixed(2),
				percentRead: percentRead.toFixed(2),
				totalContacts: contactOverview.totalContacts,
				totalLists: contactOverview.totalLists,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).send("Server error");
	}
};

export const getFilters = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const query = req.query.value;
		const { startDate, endDate } = req.query;

		const startTimestamp = startDate ? convertUTCToLocal(startDate) : null;
		const endTimestamp = endDate
			? convertUTCToLocal(endDate) + oneDayInMilliSeconds
			: null;
		// console.log(startTimestamp, endTimestamp);
		// Build the filter for the query
		const filter = {
			useradmin: id,
			deleted: { $ne: true },
		};

		if (startTimestamp && endTimestamp) {
			filter.createdAt = { $gte: startTimestamp, $lte: endTimestamp };
		}

		const sentReports = await Campaign.aggregate([
			{
				$match: filter,
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
										...(query !== "SENT"
											? [{ $eq: ["$status", query] }]
											: []),
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
					messagesSent: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);
		const allData = [];

		// console.log(sentReports);

		sentReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const perUser = {};
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					perUser.contactName = contact?.Name;
					perUser.createdAt = report.timestamp || report.createdAt;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					perUser.contactName = contact?.Name;
					perUser.createdAt = report.timestamp || report.createdAt;
				}
				allData.push(perUser);
			});
		});

		console.log(allData);

		if (allData.length == 0)
			return res.json({ success: false, message: "No Data found" });

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.viewUsers) {
				res.json(allData);
			} else {
				res.json({ success: false, message: "Not Allowed" });
			}
		} else {
			res.json(allData);
		}
	} catch (err) {
		console.log(err);
		res.json({ success: false, message: err });
	}
};

export const addNumber = async (req, res) => {
	try {
		const { phoneNumber } = req.body;
		const userId = req.user.id;

		// Add to database
		await User.findOneAndUpdate(
			{ unique_id: userId },
			{
				$push: {
					phoneNumbers: {
						phone_number_id: phoneNumber,
						friendly_name: `Number ${new Date().toLocaleDateString()}`,
					},
				},
			},
			{ new: true, upsert: true },
		);

		res.redirect("/manage-numbers");
	} catch (error) {
		res.render("add-number", {
			error: "Failed to register number. Please try again.",
		});
	}
};

export const verifyNumber = async (req, res) => {
	try {
		const { code, phoneNumberId } = req.body;
		const userId = req.user.id;

		// Update verification status
		await User.findOneAndUpdate(
			{
				unique_id: userId,
				"phoneNumbers.phone_number_id": phoneNumberId,
			},
			{
				$set: {
					"phoneNumbers.$.verified": true,
				},
			},
		);

		res.redirect("/manage-numbers");
	} catch (error) {
		res.render("verify-number", {
			error: "Verification failed. Please try again.",
		});
	}
};

export const selectPhoneNumber = async (req, res) => {
	try {
		const { phoneNumberId } = req.body;
		const userId = req.user.id;

		// Reset all selected flags
		await User.updateOne(
			{ unique_id: userId },
			{ $set: { "phoneNumbers.$[].selected": false } },
		);

		// Set new selected number
		await User.updateOne(
			{
				unique_id: userId,
				"phoneNumbers.phone_number_id": phoneNumberId,
			},
			{ $set: { "phoneNumbers.$.selected": true } },
		);

		res.redirect("/manage-numbers");
	} catch (error) {
		res.render("manage-numbers", {
			error: "Failed to select phone number",
		});
	}
};
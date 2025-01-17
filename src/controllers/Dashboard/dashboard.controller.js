import User from "../../models/user.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import dotenv from "dotenv";

dotenv.config();

export const getDashboard = async (req, res) => {
	try {
		const { startDate, endDate } = req.query;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		const user = await User.findOne({ unique_id: id });
		// Convert startDate and endDate to timestamps
		const startTimestamp = startDate
			? new Date(startDate).getTime() / 1000
			: null;
		const endTimestamp = endDate
			? new Date(endDate).getTime() / 1000
			: null;

		// Build the filter for the query
		const filter = { useradmin: id };

		if (startTimestamp && endTimestamp) {
			filter.timestamp = { $gte: startTimestamp, $lte: endTimestamp };
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
						$sum: { $cond: [{ $eq: ["$status", "SENT"] }, 1, 0] },
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
			const access = Permissions.findOne({ unique_id: permissions });
			if (access) {
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

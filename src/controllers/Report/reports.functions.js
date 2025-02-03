import dotenv from "dotenv";
import cron from "node-cron";
import {
	replaceDynamicVariables,
	sendMessageThroughWhatsApp,
	generatePreviewMessage,
} from "../ContactList/campaign.functions.js";
import {
	sendCampaignReportEmail,
	sendCampaignScheduledEmail,
} from "../../services/OTP/reportsEmail.js";
import { agenda } from "../../config/db.js";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import User from "../../models/user.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { sendMessages } from "../ContactList/campaign.functions.js";

dotenv.config();

export const overview = async (id, userId, page, limit, skip) =>
	await Campaign.aggregate([
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
				let: {
					campaignUniqueId: "$unique_id",
					campaignUseradmin: "$useradmin",
				},
				pipeline: [
					{
						$match: {
							$expr: {
								$and: [
									{
										$eq: [
											"$campaignId",
											"$$campaignUniqueId",
										],
									},
									{
										$eq: [
											"$useradmin",
											"$$campaignUseradmin",
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
			$addFields: {
				reports: { $ifNull: ["$reports", []] },
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
				totalMessages: { $size: "$reports" },
				messagesSent: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: { $ne: ["$$report.status", "FAILED"] },
						},
					},
				},
				messagesDelivered: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: { $eq: ["$$report.status", "DELIVERED"] },
						},
					},
				},
				messagesRead: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: { $eq: ["$$report.status", "READ"] },
						},
					},
				},
				messagesReplied: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: { $eq: ["$$report.status", "REPLIED"] },
						},
					},
				},
				messagesFailed: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: { $eq: ["$$report.status", "FAILED"] },
						},
					},
				},
			},
		},
		{
			$addFields: {
				percentSent: {
					$cond: [
						{ $eq: ["$totalMessages", 0] },
						0,
						{
							$multiply: [
								{
									$divide: [
										"$messagesSent",
										"$totalMessages",
									],
								},
								100,
							],
						},
					],
				},
				percentDelivered: {
					$cond: [
						{ $eq: ["$totalMessages", 0] },
						0,
						{
							$multiply: [
								{
									$divide: [
										"$messagesDelivered",
										"$totalMessages",
									],
								},
								100,
							],
						},
					],
				},
				percentRead: {
					$cond: [
						{ $eq: ["$totalMessages", 0] },
						0,
						{
							$multiply: [
								{
									$divide: [
										"$messagesRead",
										"$totalMessages",
									],
								},
								100,
							],
						},
					],
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

export async function sendMessagesReports(
	campaign,
	id,
	unique_id,
	contactList,
) {
	try {
		let phone_number_id = await User.findOne({ unique_id: id });
		phone_number_id = phone_number_id.FB_PHONE_ID;
		// Find the template by unique_id
		const template = await Template.findOne({
			unique_id: campaign.templateId,
		});

		if (!template) {
			throw new Error(
				`Template with ID ${campaign.templateId} not found`,
			);
		}

		if (contactList?.length === 0) {
			throw new Error(
				`No contacts found for contact list ID ${campaign.contactListId}`,
			);
		}
		console.log(contactList);
		// Loop through each contact in the contact list
		for (let contact of contactList) {
			// Replace dynamic variables in the template with contact-specific data
			const personalizedMessage = replaceDynamicVariables(
				template,
				campaign.variables,
				contact,
			);

			const response = await sendMessageThroughWhatsApp(
				phone_number_id,
				template,
				contact.wa_id,
				personalizedMessage,
			);

			const messageTemplate = generatePreviewMessage(
				template,
				personalizedMessage,
			);

			if (response.status === "FAILED") {
				console.error(
					`Failed to send message to ${contact.wa_id}: ${response.response}`,
				);
				throw new Error(
					`Failed to send message to ${contact.wa_id}: ${response.response}`,
				);
			}
			// console.log(JSON.stringify(response));
			const user = await User.findOne({ unique_id: id });
			// Create a report for each sent message
			const report = new Report({
				WABA_ID: user.WABA_ID,
				FB_PHONE_ID: user.FB_PHONE_ID,
				useradmin: id,
				unique_id,
				campaignName: campaign.name,
				campaignId: campaign.unique_id,
				recipientPhone: contact.wa_id,
				status: response.status,
				messageId: response.response.messages[0].id,
				messageTemplate,
			});
			await report.save();
		}

		// Update the campaign status to 'SENT' after messages are sent
		await Campaign.findByIdAndUpdate(campaign._id, { status: "SENT" });
	} catch (error) {
		console.error("Error sending messages:", error.message);
		throw new Error(`${error.message}`);
	}
}

const scheduleCampaign = async (campaign) => {
	try {
		const { scheduledAt, _id, contactListId, contactList } = campaign;
		if (contactList) {
			agenda.schedule(new Date(scheduledAt), "process reports campaign", {
				campaignId: _id,
				contactList,
				scheduledAt,
			});
		} else {
			agenda.schedule(new Date(scheduledAt), "process campaign", {
				campaignId: _id,
				contactListId,
				scheduledAt,
			});
		}
		// Mark the campaign as IN_QUEUE so it won’t be processed multiple times
		await Campaign.findByIdAndUpdate(_id, { status: "IN_QUEUE" });
		console.log(`Campaign ${_id} scheduled successfully.`);
	} catch (err) {
		console.error("Error schedling campagin", err);
	}
};

agenda.define("process campaign", async (job) => {
	const { campaignId } = job.attrs.data;

	try {
		const campaign = await Campaign.findById(campaignId);
		if (campaign?.status === "IN_QUEUE") {
			await sendMessages(
				campaign,
				campaign.useradmin,
				generateUniqueId(),
			);
			await Campaign.findByIdAndUpdate(campaignId, { status: "SENT" });

			const time = Date.now();
			// + 15 * 60 * 1000;
			const reportTime = new Date(time);
			agenda.schedule(reportTime, "send campaign report email", {
				campaignId,
				userId: campaign.useradmin,
			});
		}
	} catch (error) {
		console.error(`Error processing campaign ${campaignId}:`, error);
	}
});

agenda.define("process reports campaign", async (job) => {
	const { campaignId, contactList } = job.attrs.data;

	try {
		const campaign = await Campaign.findById(campaignId);
		if (campaign?.status === "IN_QUEUE") {
			await sendMessagesReports(
				campaign,
				campaign.useradmin,
				generateUniqueId(),
				contactList,
			);
			await Campaign.findByIdAndUpdate(campaignId, { status: "SENT" });

			const time = Date.now();
			// + 15 * 60 * 1000;
			const reportTime = new Date(time);
			agenda.schedule(reportTime, "send campaign report email", {
				campaignId,
				userId: campaign.useradmin,
			});
		}
	} catch (error) {
		console.error(`Error processing campaign ${campaignId}:`, error);
	}
});

agenda.define("send campaign report email", async (job) => {
	const { campaignId, userId } = job.attrs.data;
	await sendCampaignReportEmail(campaignId, userId);
});

cron.schedule("* * * * *", async () => {
	try {
		const now = Date.now();
		// console.log(now);
		// Find all campaigns that are scheduled to be sent
		const scheduledCampaigns = await Campaign.find({
			scheduledAt: { $lte: now },
			status: "SCHEDULED",
		});

		for (let campaign of scheduledCampaigns) {
			await scheduleCampaign(campaign);
		}
	} catch (error) {
		console.error("Error checking scheduled campaigns:", error);
	}
});

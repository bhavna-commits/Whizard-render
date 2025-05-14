import dotenv from "dotenv";
import cron from "node-cron";
import {
	replaceDynamicVariables,
	sendMessageThroughWhatsApp,
	generatePreviewMessage,
	getMediaPreviewFromTemplate,
	generatePreviewComponents,
} from "../ContactList/campaign.functions.js";
import {
	sendCampaignReportEmail,
	sendCampaignScheduledEmail,
} from "../../services/OTP/reportsEmail.js";
import { agenda } from "../../config/db.js";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Permissions from "../../models/permissions.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import User from "../../models/user.model.js";
import Chat from "../../models/chats.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { sendMessages } from "../ContactList/campaign.functions.js";
import { isString, isNumber } from "../../middleWares/sanitiseInput.js";
import TempMessageModel from "../../models/TempMessage.model.js";

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
							cond: {
								$and: [
									{ $ne: ["$$report.status", "SENT"] },
									{ $ne: ["$$report.status", "FAILED"] },
								],
							},
						},
					},
				},
				messagesRead: {
					$size: {
						$filter: {
							input: "$reports",
							as: "report",
							cond: {
								$in: ["$$report.status", ["READ", "REPLIED"]],
							},
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
	user,
	unique_id,
	contactList,
	phone_number,
	addedUserId,
) {
	try {
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

		let chat;
		let chatsTemp;
		// Loop through each contact in the contact list
		for (let contact of contactList) {
			// Replace dynamic variables in the template with contact-specific data
			// console.log(contact);
			const personalizedMessage = replaceDynamicVariables(
				template,
				campaign.variables,
				contact,
			);
			// console.log(personalizedMessage);
			const response = await sendMessageThroughWhatsApp(
				user,
				template,
				contact.wa_id,
				personalizedMessage,
				phone_number,
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

			const mediaPreview = getMediaPreviewFromTemplate(template);

			const components = generatePreviewComponents(
				template,
				personalizedMessage,
			);

			let reportData = {
				WABA_ID: user.WABA_ID,
				FB_PHONE_ID: phone_number,
				useradmin: user.unique_id,
				unique_id,
				campaignName: campaign.name,
				campaignId: campaign.unique_id,
				contactName: contact.Name,
				recipientPhone: contact.wa_id,
				status: response.status,
				messageId: response.response.messages[0].id,
				messageTemplate,
			};

			if (mediaPreview) {
				// If media exists, store media details instead of the messageTemplate preview.
				reportData.media = {
					url: mediaPreview.url,
					fileName: mediaPreview.fileName,
				};
			}

			// const report = new Report(reportData);
			// await report.save();

			reportData.components = components;
			reportData.templateId = campaign.templateId;
			reportData.templatename = template.name;
			reportData.agent = addedUserId ? addedUserId : user.unique_id;
			reportData.type = "Campaign";

			let reportData2 = {
				name: contact.Name,
				wabaId: user.WABA_ID,
				messageId: response.response.messages[0].id,
				from: contact.wa_id,
				timestamp: Date.now(),
				type: "text",
				text: { body: messageTemplate.slice(0, 11) },
				mediaId: "",
				fbPhoneId: phone_number,
				status: "sent",
			};

			await TempMessageModel.create(reportData2);
			const chat = new Chat(reportData);
			// await ChatsTemp.create(reportData);
			await chat.save();
		}

		// Update the campaign status to 'SENT' after messages are sent
		campaign.status = "SENT";
		await campaign.save();
		// await chat.save();
	} catch (error) {
		console.error("Error sending messages:", error.message);
		throw new Error(`${error.message}`);
	}
}

export const getCampaignOverview = async (req, res, next) => {
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
		// console.log(campaigns);
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
					campaigns: paginatedResults[0]?.reports,
					id,
					page,
					totalPages,
					totalMessages: paginatedResults[0]?.totalMessages || 0,
					messagesSent: paginatedResults[0]?.messagesSent || 0,
					messagesDelivered:
						paginatedResults[0]?.messagesDelivered || 0,
					messagesRead: paginatedResults[0]?.messagesRead || 0,
					messagesReplied: paginatedResults[0]?.messagesReplied || 0,
					messagesFailed: paginatedResults[0]?.messagesFailed || 0,
					percentSent:
						paginatedResults[0]?.percentSent?.toFixed(2) || 0,
					percentDelivered:
						paginatedResults[0]?.percentDelivered?.toFixed(2) || 0,
					percentRead:
						paginatedResults[0]?.percentRead?.toFixed(2) || 0,
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
				campaigns: paginatedResults[0]?.reports,
				id,
				page,
				totalPages,
				totalMessages: paginatedResults[0]?.totalMessages || 0,
				messagesSent: paginatedResults[0]?.messagesSent || 0,
				messagesDelivered: paginatedResults[0]?.messagesDelivered || 0,
				messagesRead: paginatedResults[0]?.messagesRead || 0,
				messagesReplied: paginatedResults[0]?.messagesReplied || 0,
				messagesFailed: paginatedResults[0]?.messagesFailed || 0,
				percentSent: paginatedResults[0]?.percentSent?.toFixed(2) || 0,
				percentDelivered:
					paginatedResults[0]?.percentDelivered?.toFixed(2) || 0,
				percentRead: paginatedResults[0]?.percentRead?.toFixed(2) || 0,
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

export const getSentReportsById = async (req, res, next) => {
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
										{
											$ne: ["$status", "FAILED"],
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

export const getDeliveredReportsById = async (req, res, next) => {
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
										{ $ne: ["$status", "FAILED"] },
										{ $ne: ["$status", "SENT"] },
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

export const getReadReportsById = async (req, res, next) => {
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
										{
											$in: [
												"$status",
												["READ", "REPLIED"],
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

export const getRepliesReportsById = async (req, res, next) => {
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
										{ $eq: ["$status", "REPLIED"] },
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

export const getFailedReportsById = async (req, res, next) => {
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

const scheduleCampaign = async (campaign) => {
	try {
		const { scheduledAt, unique_id, contactListId, contactList } = campaign;
		if (contactList) {
			agenda.schedule(new Date(scheduledAt), "process reports campaign", {
				campaignId: unique_id,
				contactList,
				scheduledAt,
			});
		} else {
			agenda.schedule(new Date(scheduledAt), "process campaign", {
				campaignId: unique_id,
				contactListId,
				scheduledAt,
			});
		}
		// Mark the campaign as IN_QUEUE so it won’t be processed multiple times
		await Campaign.findOneAndUpdate({ unique_id }, { status: "IN_QUEUE" });
		console.log(`Campaign ${unique_id} scheduled successfully.`);
	} catch (err) {
		console.error("Error schedling campagin", err);
	}
};

agenda.define("process campaign", async (job) => {
	const { campaignId } = job.attrs.data;

	try {
		const campaign = await Campaign.findOne({ unique_id: campaignId });

		let user = await User.findOne({ unique_id: campaign.useradmin });

		const phone_number = user.FB_PHONE_NUMBERS.find(
			(n) => n.selected === true,
		).phone_number_id;

		if (!phone_number) {
			throw new Error("No phone number selected.");
		}

		if (campaign?.status === "IN_QUEUE") {
			await sendMessages(
				campaign,
				user,
				generateUniqueId(),
				phone_number,
			);

			await Campaign.findOneAndUpdate(
				{ unique_id: campaignId },
				{ status: "SENT" },
			);

			const time = Date.now() + 15 * 60 * 1000;
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
		const campaign = await Campaign.findOne({ unique_id: campaignId });

		let user = await User.findOne({ unique_id: campaign.useradmin });

		const phone_number = user.FB_PHONE_NUMBERS.find(
			(n) => n.selected == true,
		).phone_number_id;

		if (!phone_number) {
			throw "No phone number selected.";
		}

		if (campaign?.status === "IN_QUEUE") {
			await sendMessagesReports(
				campaign,
				user,
				generateUniqueId(),
				contactList,
				phone_number,
			);

			await Campaign.findOneAndUpdate(
				{ unique_id: campaignId },
				{ status: "SENT" },
			);

			const time = Date.now() + 15 * 60 * 1000;
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

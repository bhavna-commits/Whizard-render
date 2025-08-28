import dotenv from "dotenv";
import {
	replaceDynamicVariables,
	sendMessageThroughWhatsApp,
	generatePreviewMessage,
	getMediaPreviewFromTemplate,
	generatePreviewComponents,
} from "../ContactList/campaign.functions.js";
import { sendCampaignReportEmail } from "../../services/OTP/reportsEmail.js";
import { agenda } from "../../config/db.js";
import Template from "../../models/templates.model.js";
import Permissions from "../../models/permissions.model.js";
import Campaign from "../../models/campaign.model.js";
import User from "../../models/user.model.js";
import Chat from "../../models/chats.model.js";
import { sendMessages } from "../ContactList/campaign.functions.js";
import { isString, isNumber } from "../../middleWares/sanitiseInput.js";
import TempMessageModel from "../../models/TempMessage.model.js";
import { help } from "../../utils/dropDown.js";

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
				from: "chats",
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
									{ $eq: ["$type", "Campaign"] },
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
	userData,
	unique_id,
	contactList,
	phone_number,
	addedUserId,
	url,
	fileName,
) {
	try {
		const template = await Template.findOne({
			unique_id: campaign.templateId,
		});
		if (!template)
			throw new Error(
				`Template with ID ${campaign.templateId} not found`,
			);

		if (!contactList?.length)
			throw new Error(
				`No contacts found for contact list ID ${campaign.contactListId}`,
			);

		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (fileName && headerComponent) {
			const fileUrl = `${url}/uploads/${userData.unique_id}/${fileName}`;
			if (
				["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)
			) {
				headerComponent.example.header_url = fileUrl;
			}
		}

		const user = await User.findOne({ unique_id: userData.unique_id });

		console.log("Loaded User:", JSON.stringify(user?.payment, null, 2));

		let messagesCount = user?.payment?.messagesCount || 0;
		const totalCount = user?.payment?.totalMessages || 0;
		let remainingCount = totalCount - messagesCount;

		console.log(
			`Starting counts => messagesCount: ${messagesCount}, total: ${totalCount}, remaining: ${remainingCount}`,
		);

		if (!user?.payment?.unlimited) {
			if (contactList.length > remainingCount) {
				throw new Error(
					`Not enough credits. You have ${remainingCount} left, need ${contactList.length}`,
				);
			}
		}

		const chatBulkOps = [];
		const tempMsgBulkOps = [];

		for (let contact of contactList) {
			try {
				const personalizedMessage = replaceDynamicVariables(
					template,
					campaign.variables,
					contact,
				);

				const response = await sendMessageThroughWhatsApp(
					user,
					template,
					contact.wa_id,
					personalizedMessage,
					phone_number,
				);

				if (response.status === "FAILED") {
					console.error(
						`Failed to send message to ${contact.wa_id}: ${response.response}`,
					);
					continue;
				}

				const messageTemplate = generatePreviewMessage(
					template,
					personalizedMessage,
				);
				const mediaPreview = getMediaPreviewFromTemplate(template);
				const components = generatePreviewComponents(
					template,
					personalizedMessage,
				);

				const reportData = {
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
					components,
					templateId: campaign.templateId,
					templatename: template.name,
					agent: addedUserId || user.unique_id,
					type: "Campaign",
					...(mediaPreview
						? {
								media: {
									url: mediaPreview.url,
									fileName: mediaPreview.fileName,
								},
						  }
						: {}),
				};

				const tempMsgData = {
					insertOne: {
						document: {
							name: contact.Name,
							wabaId: user.WABA_ID,
							messageId: response.response.messages[0].id,
							from: contact.wa_id,
							timestamp: Date.now(),
							type: "text",
							text: { body: messageTemplate },
							fbPhoneId: phone_number,
							status: "sent",
						},
					},
				};

				tempMsgBulkOps.push(tempMsgData);
				chatBulkOps.push({ insertOne: { document: reportData } });

				if (!user?.payment?.unlimited) {
					messagesCount++;
					remainingCount--;
					console.log(
						`Message sent ✅ to ${contact.wa_id}, updated messagesCount: ${messagesCount}, remaining: ${remainingCount}`,
					);
				}
			} catch (error) {
				console.error(
					"Error sending message to contact:",
					contact.wa_id,
					error.message,
				);
				continue;
			}
		}

		if (chatBulkOps.length) await Chat.bulkWrite(chatBulkOps);
		if (tempMsgBulkOps.length)
			await TempMessageModel.bulkWrite(tempMsgBulkOps);

		if (!user?.payment?.unlimited) {
			console.log(
				`Final update => messagesCount: ${messagesCount}, total: ${totalCount}, remaining: ${
					totalCount - messagesCount
				}`,
			);
			user.payment.messagesCount = messagesCount;
			user.markModified("payment"); // make sure nested object persists
			await user.save();
			console.log("User payment updated in DB:", user.payment);
		}
	} catch (error) {
		console.error("Error sending messages:", error.message);
		throw new Error(error.message);
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
					help,
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
				help,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
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
					from: "chats",
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
										{ $eq: ["$type", "Campaign"] },
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
					help,
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
				help,
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
					from: "chats",
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
										{ $eq: ["$type", "Campaign"] },
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
					help,
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
				help,
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
					from: "chats",
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
										{ $eq: ["$type", "Campaign"] },
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

		console.log(paginatedResults[0].reports);

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
					help,
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
				help,
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
					from: "chats",
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
										{ $eq: ["$type", "Campaign"] },
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
					help,
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
				help,
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
					from: "chats",
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
										{ $eq: ["$type", "Campaign"] },
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
					help,
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
				help,
			});
		}
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

export function safeParseJSON(str, fallback = null) {
	if (typeof str !== "string") return fallback;
	const trimmed = str.trim();
	if (!trimmed) return fallback;
	try {
		return JSON.parse(trimmed);
	} catch {
		return fallback;
	}
}

export const checkPlanValidity = (user) => {
	if (user?.payment?.unlimited) {
		return;
	}
	if (user?.payment?.expiry === 0) {
		throw "Please buy a plan first";
	}
	if (user?.payment?.expiry < Date.now()) {
		throw `Your access to dashboard has expired on ${new Date(
			user?.payment?.expiry,
		).toUTCString()}. Please recharge!`;
	}
};

export const checkCredits = (user, contactListLength) => {
	const messagesCount = user?.payment?.messagesCount || 0;
	const totalCount = user?.payment?.totalMessages || 0;

	if (
		!user?.payment?.unlimited &&
		contactListLength > totalCount - messagesCount
	) {
		throw `Not enough credits. You have ${
			totalCount - messagesCount
		} messages left, but you're trying to send ${contactListLength}.`;
	}
};

agenda.define("process campaign", async (job) => {
	const {
		newCampaign,
		user,
		unique_id,
		phone_number,
		addedUserId,
		url,
		fileName,
		contactList,
		template,
	} = job.attrs.data;

	console.log("Sending Campaign");
	try {
		await sendMessages(
			newCampaign,
			user,
			unique_id,
			phone_number,
			addedUserId,
			url,
			fileName,
			contactList,
			template,
		);

		await Campaign.updateOne(
			{ _id: newCampaign._id },
			{ $set: { status: "SENT" } },
		);

		agenda.schedule(
			new Date(Date.now() + 15 * 60 * 1000),
			"send campaign report email",
			{
				campaignId: newCampaign.unique_id,
				userId: newCampaign.useradmin,
			},
		);
	} catch (error) {
		console.error(
			`Error processing campaign ${newCampaign.unique_id}:`,
			error,
		);
	}
});

agenda.define("process reports campaign", async (job) => {
	const {
		newCampaign,
		user,
		unique_id,
		contactList,
		phone_number,
		addedUserId,
		url,
		fileName,
	} = job.attrs.data;
	console.log("here");
	try {
		await sendMessagesReports(
			newCampaign,
			user,
			unique_id,
			contactList,
			phone_number,
			addedUserId,
			url,
			fileName,
		);

		await Campaign.findOneAndUpdate(
			{ unique_id: newCampaign.unique_id },
			{ status: "SENT" },
		);

		const time = Date.now() + 15 * 60 * 1000;
		const reportTime = new Date(time);
		agenda.schedule(reportTime, "send campaign report email", {
			campaignId: newCampaign.unique_id,
			userId: newCampaign.useradmin,
		});
	} catch (error) {
		console.error(
			`Error processing campaign ${newCampaign.unique_id}:`,
			error,
		);
	}
});

agenda.define("send campaign report email", async (job) => {
	const { campaignId, userId } = job.attrs.data;
	await sendCampaignReportEmail(campaignId, userId);
});

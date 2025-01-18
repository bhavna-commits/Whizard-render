import Reports from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import User from "../../models/user.model.js";
import { overview } from "./reports.functions.js";
import {
	isNumber,
	isString,
	isBoolean,
} from "../../middleWares/sanitiseInput.js";

// Controller to fetch campaign reports and render them page-wise
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

export const getCampaignReports = async (req, res) => {
	const { filter } = req.query;
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

const getCampaignOverview = async (req, res) => {
	try {
		const { id } = req.params;
		const page = parseInt(req.query.page) || 1;
		if (!isNumber(page)) next();
		if (!isString(id)) next();
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

const getSentReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		if (!isNumber(page)) next();
		if (!isString(id)) next();
		const limit = 6;
		const skip = (page - 1) * limit;

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
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = sentReports[0]?.paginatedResults || [];
		const totalCount = sentReports[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

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
					campaigns: paginatedResults[0].reports,
					page,
					totalPages,
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
			// console.log(access.access);
			res.render("Reports/campaignSent", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				page,
				totalPages,
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

const getDeliveredReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;

		if (!isNumber(page)) next();
		if (!isString(id)) next();

		const limit = 6;
		const skip = (page - 1) * limit;

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
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = deliveredReports[0]?.paginatedResults || [];
		const totalCount = deliveredReports[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

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
				res.render("Reports/campaignDelivered", {
					access,
					campaigns: paginatedResults[0].reports,
					page,
					totalPages,
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
			// console.log(access.access);
			res.render("Reports/campaignDelivered", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				page,
				totalPages,
				id,
				
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
			});
		}
		console.log(paginatedResults[0].reports);
	} catch (err) {
		console.error(err);
		res.render("errors/serverError");
	}
};

const getReadReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;

		if (!isNumber(page)) next();
		if (!isString(id)) next();

		const limit = 6;
		const skip = (page - 1) * limit;

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
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = readReports[0]?.paginatedResults || [];
		const totalCount = readReports[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

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
					page,
					totalPages,
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
				page,
				totalPages,
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

const getRepliesReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;

		if (!isNumber(page)) next();
		if (!isString(id)) next();

		const limit = 6;
		const skip = (page - 1) * limit;

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
										{ $ne: ["$replyContent", null] }, // Only fetch reports with replies
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
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = repliedReports[0]?.paginatedResults || [];
		const totalCount = repliedReports[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

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
				res.render("Reports/campaignReplies", {
					access,
					campaigns: paginatedResults[0].reports,
					page,
					totalPages,
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
			// console.log(access.access);
			res.render("Reports/campaignReplies", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				page,
				totalPages,
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

const getFailedReportsById = async (req, res) => { 
	try {
		const { id } = req.params;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;

		if (!isNumber(page)) next();
		if (!isString(id)) next();

		const limit = 6;
		const skip = (page - 1) * limit;

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
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const paginatedResults = failedReports[0]?.paginatedResults || [];
		const totalCount = failedReports[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

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
				res.render("Reports/campaignFailed", {
					access,
					campaigns: paginatedResults[0].reports,
					page,
					totalPages,
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
			// console.log(access.access);
			res.render("Reports/campaignFailed", {
				access: access.access,
				campaigns: paginatedResults[0].reports,
				page,
				totalPages,
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

// export const getUserAccountOverview = async (req, res) => {
// 	try {
// 		const userId = req.session.user.id;

// 		// Fetch all campaigns created by the user
// 		const campaigns = await Campaign.aggregate([
// 			{
// 				$match: {
// 					useradmin: userId,
// 					deleted: { $ne: true },
// 				},
// 			},
// 			{
// 				$lookup: {
// 					from: "campaignreports",
// 					let: {
// 						campaignId: "$_id",
// 						campaignUseradmin: "$useradmin",
// 					},
// 					pipeline: [
// 						{
// 							$match: {
// 								$expr: {
// 									$and: [
// 										{
// 											$eq: [
// 												"$campaignId",
// 												"$$campaignId",
// 											],
// 										},
// 										{
// 											$eq: [
// 												"$useradmin",
// 												"$$campaignUseradmin",
// 											],
// 										},
// 									],
// 								},
// 							},
// 						},
// 					],
// 					as: "reports",
// 				},
// 			},
// 			{
// 				$group: {
// 					_id: null,
// 					totalMessages: { $sum: { $size: "$reports" } },
// 					messagesSent: {
// 						$sum: {
// 							$size: {
// 								$filter: {
// 									input: "$reports",
// 									as: "report",
// 									cond: { $eq: ["$$report.status", "SENT"] },
// 								},
// 							},
// 						},
// 					},
// 					messagesDelivered: {
// 						$sum: {
// 							$size: {
// 								$filter: {
// 									input: "$reports",
// 									as: "report",
// 									cond: {
// 										$eq: ["$$report.status", "DELIVERED"],
// 									},
// 								},
// 							},
// 						},
// 					},
// 					messagesRead: {
// 						$sum: {
// 							$size: {
// 								$filter: {
// 									input: "$reports",
// 									as: "report",
// 									cond: { $eq: ["$$report.status", "READ"] },
// 								},
// 							},
// 						},
// 					},
// 					messagesReplied: {
// 						$sum: {
// 							$size: {
// 								$filter: {
// 									input: "$reports",
// 									as: "report",
// 									cond: {
// 										$eq: ["$$report.status", "REPLIED"],
// 									},
// 								},
// 							},
// 						},
// 					},
// 					messagesFailed: {
// 						$sum: {
// 							$size: {
// 								$filter: {
// 									input: "$reports",
// 									as: "report",
// 									cond: {
// 										$eq: ["$$report.status", "FAILED"],
// 									},
// 								},
// 							},
// 						},
// 					},
// 					totalCampaigns: { $sum: 1 },
// 				},
// 			},
// 		]);

// 		// If no campaigns were found
// 		const campaignOverview =
// 			campaigns.length > 0
// 				? campaigns[0]
// 				: {
// 						totalMessages: 0,
// 						messagesSent: 0,
// 						messagesDelivered: 0,
// 						messagesRead: 0,
// 						messagesReplied: 0,
// 						messagesFailed: 0,
// 						totalCampaigns: 0,
// 				  };

// 		// Fetch contact lists and total number of contacts
// 		const contactLists = await ContactList.aggregate([
// 			{ $match: { useradmin: userId, deleted: { $ne: true } } },
// 			{
// 				$group: {
// 					_id: null,
// 					totalContacts: { $sum: { $size: "$contacts" } },
// 					totalLists: { $sum: 1 },
// 				},
// 			},
// 		]);

// 		const contactOverview =
// 			contactLists.length > 0
// 				? contactLists[0]
// 				: {
// 						totalContacts: 0,
// 						totalLists: 0,
// 				  };

// 		// Calculate percentages
// 		const percentSent =
// 			campaignOverview.totalMessages > 0
// 				? (campaignOverview.messagesSent /
// 						campaignOverview.totalMessages) *
// 				  100
// 				: 0;
// 		const percentDelivered =
// 			campaignOverview.totalMessages > 0
// 				? (campaignOverview.messagesDelivered /
// 						campaignOverview.totalMessages) *
// 				  100
// 				: 0;
// 		const percentRead =
// 			campaignOverview.totalMessages > 0
// 				? (campaignOverview.messagesRead /
// 						campaignOverview.totalMessages) *
// 				  100
// 				: 0;

// 		// Render account overview page
// 		res.render("Reports/accountOverview", {
// 			user,
// 			totalMessages: campaignOverview.totalMessages,
// 			messagesSent: campaignOverview.messagesSent,
// 			messagesDelivered: campaignOverview.messagesDelivered,
// 			messagesRead: campaignOverview.messagesRead,
// 			messagesReplied: campaignOverview.messagesReplied,
// 			messagesFailed: campaignOverview.messagesFailed,
// 			totalCampaigns: campaignOverview.totalCampaigns,
// 			percentSent: percentSent.toFixed(2),
// 			percentDelivered: percentDelivered.toFixed(2),
// 			percentRead: percentRead.toFixed(2),
// 			totalContacts: contactOverview.totalContacts,
// 			totalLists: contactOverview.totalLists,
// 			photo: req.session.user?.photo,
// 			name: req.session.user.name,
// 			color: req.session.user.color,
// 		});
// 	} catch (err) {
// 		console.error(err);
// 		res.status(500).send("Server Error");
// 	}
// };

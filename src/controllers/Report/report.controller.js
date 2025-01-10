import Reports from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";

// Controller to fetch campaign reports and render them page-wise
export const getCampaignList = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1; // Current page
		const limit = 6; // Results per page
		const skip = (page - 1) * limit; // Calculate how many records to skip

		// Fetch campaigns created by the user
		const campaigns = await Campaign.aggregate([
			{
				$match: {
					useradmin: userId,
					deleted: { $ne: true }, // If you have a deleted field in campaigns
				},
			},
			{
				$lookup: {
					from: "campaignreports", // Use the name of the reports collection
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

		// console.log(paginatedResults);
		res.render("Reports/campaign", {
			campaigns: paginatedResults,
			page,
			totalPages,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
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

export const getCampaignReportsFilter = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const { status, timeFrame } = req.query;
		// console.log(status);
		// Match query for campaigns
		let matchQuery = {
			useradmin: userId,
			deleted: { $ne: true }, // Adjust based on your campaign schema
		};

		if (status === "scheduled") {
			matchQuery["status"] = { $in: ["SCHEDULED", "IN_QUEUE"] };
		} else if (status === "all") {
			// Remove any filtering on status for 'all'
			delete matchQuery["status"];
		} else {
			matchQuery["status"] = { $nin: ["SCHEDULED", "IN_QUEUE"] };
		}

		// console.log(matchQuery);
		// Apply time frame filter on campaigns
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
					messagesSent: { $size: "$reports" },
					messagesFailed: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "FAILED"] },
							},
						},
					},
					totalDelivered: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "DELIVERED"] },
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

		res.render("Reports/partials/campaignTable", {
			campaigns: paginatedResults,
			page,
			totalPages,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getCampaignOverview = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		// Fetch campaigns created by the user
		const campaigns = await Campaign.aggregate([
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
				$lookup: {
					from: "contactlists",
					localField: "contactListId",
					foreignField: "_id",
					as: "contactList",
				},
			},
			{
				$unwind: {
					path: "$contactList",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactList.contacts.contactId",
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
								cond: { $eq: ["$$report.status", "SENT"] },
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

		const paginatedResults = campaigns[0]?.paginatedResults || [];
		const totalCount = campaigns[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

		if (paginatedResults.length > 0) {
			const firstCampaign = paginatedResults[0]; // Access the first element of paginatedResults

			res.render("Reports/campaignOverview", {
				campaigns: paginatedResults,
				id,
				page,
				totalPages,
				totalMessages: firstCampaign.totalMessages || 0,
				messagesSent: firstCampaign.messagesSent || 0,
				messagesDelivered: firstCampaign.messagesDelivered || 0,
				messagesRead: firstCampaign.messagesRead || 0,
				messagesReplied: firstCampaign.messagesReplied || 0,
				messagesFailed: firstCampaign.messagesFailed || 0,
				percentSent: firstCampaign.percentSent?.toFixed(2) || 0,
				percentDelivered:
					firstCampaign.percentDelivered?.toFixed(2) || 0,
				percentRead: firstCampaign.percentRead?.toFixed(2) || 0,
			});
		} else {
			// Handle the case when no campaigns are returned
			res.render("Reports/campaignOverview", {
				campaigns: [],
				id,
				page,
				totalPages,
				totalMessages: 0,
				messagesSent: 0,
				messagesDelivered: 0,
				messagesRead: 0,
				messagesReplied: 0,
				messagesFailed: 0,
				percentSent: 0,
				percentDelivered: 0,
				percentRead: 0,
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
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
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
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					messagesSent: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "SENT"] },
							},
						},
					},
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

		res.render("Reports/sentReports", {
			campaigns: paginatedResults,
			page,
			totalPages,
			id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getDeliveredReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
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
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					messagesDelivered: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "DELIVERED"] },
							},
						},
					},
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

		res.render("Reports/deliveredReports", {
			campaigns: paginatedResults,
			page,
			totalPages,
			id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getReadReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
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
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					messagesRead: {
						$size: {
							$filter: {
								input: "$reports",
								as: "report",
								cond: { $eq: ["$$report.status", "READ"] },
							},
						},
					},
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

		res.render("Reports/readReports", {
			campaigns: paginatedResults,
			page,
			totalPages,
			id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getRepliesReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
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
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
					messagesReplied: {
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

		res.render("Reports/repliedReports", {
			campaigns: paginatedResults,
			page,
			totalPages,
			id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};

const getFailedReportsById = async (req, res) => {
	try {
		const { id } = req.params;
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
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
					localField: "unique_id",
					foreignField: "campaignId",
					as: "reports",
				},
			},
			{
				$addFields: {
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

		res.render("Reports/failedReports", {
			campaigns: paginatedResults,
			page,
			totalPages,
			id,
		});
	} catch (err) {
		console.error(err);
		res.status(500).send("Server Error");
	}
};
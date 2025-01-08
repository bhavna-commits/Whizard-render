import Reports from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";

// Controller to fetch campaign reports and render them page-wise
export const getCampaignReports = async (req, res) => {
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

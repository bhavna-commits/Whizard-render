import Reports from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";

// Controller to fetch campaign reports and render them page-wise
export const getCampaignReports = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1; // Current page
		const limit = 6; // Results per page
		const skip = (page - 1) * limit; // Calculate how many records to skip

		// Prepare the match object for aggregation
		let matchQuery = {
			useradmin: userId,
			deleted: { $ne: true },
		};

		const result = await Reports.aggregate([
			{
				$match: matchQuery,
			},
			{
				$group: {
					_id: "$campaignId",
					messagesSent: { $sum: 1 },
					messagesFailed: {
						$sum: {
							$cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
						},
					},
					totalDelivered: {
						$sum: {
							$cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0],
						},
					},
					createdAt: { $max: "$timestamp" },
				},
			},
			{
				$lookup: {
					from: "campaigns",
					localField: "_id",
					foreignField: "unique_id",
					as: "campaignDetails",
				},
			},
			{ $unwind: "$campaignDetails" },
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
		const page = parseInt(req.query.page) || 1; // Current page
		const limit = 6; // Results per page
		const skip = (page - 1) * limit; // Calculate how many records to skip

		const { status, timeFrame } = req.query;

		// Initial match object for CampaignReport fields
		let initialMatch = {
			useradmin: userId,
			deleted: { $ne: true },
		};
		console.log(status);
		// Apply status filter on CampaignReport
		if (status === "scheduled") {
			initialMatch["status"] = "SCHEDULED";
		} else {
			initialMatch["status"] = { $ne: "SCHEDULED" };
		}

		let startTimestamp;
		let endTimestamp;
		// Apply time frame filter on CampaignReport (if applicable)
		// Note: Adjust this if you intend to filter based on Campaign's createdAt
		if (timeFrame) {
			const [startDateStr, endDateStr] = timeFrame.split(" to ");
			if (startDateStr && endDateStr) {
				console.log(startDateStr, endDateStr);
				const startDate = new Date(startDateStr);
				const endDate = new Date(endDateStr);

				startDate.setHours(0, 0, 0, 0);
				endDate.setHours(23, 59, 59, 999);

				startTimestamp = startDate.getTime();
				endTimestamp = endDate.getTime();
				console.log(startTimestamp, endTimestamp);

				initialMatch["timestamp"] = {
					$gte: startTimestamp,
					$lte: endTimestamp,
				};
			}
		}

		const result = await Reports.aggregate([
			{
				$match: initialMatch,
			},
			{
				$lookup: {
					from: "campaigns",
					localField: "campaignId",
					foreignField: "unique_id",
					as: "campaignDetails",
				},
			},
			{ $unwind: "$campaignDetails" },
			// Secondary match on campaignDetails.createdAt
			{
				$match: {
					"campaignDetails.createdAt": {
						$gte: startTimestamp, // Replace with dynamic values if needed
						$lte: endTimestamp,
					},
				},
			},
			{
				$group: {
					_id: "$campaignId",
					messagesSent: { $sum: 1 },
					messagesFailed: {
						$sum: {
							$cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
						},
					},
					totalDelivered: {
						$sum: {
							$cond: [{ $eq: ["$status", "DELIVERED"] }, 1, 0],
						},
					},
					createdAt: { $max: "$timestamp" },
				},
			},
			{
				$lookup: {
					from: "campaigns",
					localField: "_id",
					foreignField: "unique_id",
					as: "campaignDetails",
				},
			},
			{ $unwind: "$campaignDetails" },
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
		console.log(paginatedResults);
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

import Reports from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";
import ContactList from "../../models/contactList.model.js";

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

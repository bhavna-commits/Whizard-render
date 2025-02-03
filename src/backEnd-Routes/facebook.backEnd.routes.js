import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import Template from "../models/templates.model.js";
import Campaign from "../models/campaign.model.js";
import User from "../models/user.model.js";
import Reports from "../models/report.model.js";
import axios from "axios";
import { generateUniqueId } from "../utils/otpGenerator.js";

dotenv.config();

const router = express.Router();

router.post("/auth_code", async (req, res) => {
	const { access_token: code, waba_id, phone_number_id } = req.body;

	console.log(
		"access token :",
		code,
		"waba id :",
		waba_id,
		"phone id :",
		phone_number_id,
	);

	try {
		// // Step 1: Exchange authorization code for access toke
		let response;
		try {
			response = await axios.get(
				`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token`,
				{
					params: {
						client_id: process.env.FB_APP_ID,
						client_secret: process.env.FB_APP_SECRET,
						redirect_uri: "https://chat.lifestylehead.com/",
						code,
					},
				},
			);

			console.log("Access Token:", response.data.access_token);
		} catch (error) {
			console.error("Error details:", error.response.data.error.message);
		}
		if (response.status === 200) {
			const { access_token: newAccessToken, expires_in } = response.data;

			// Step 2: Store access token and calculate expiration time
			const expirationTime = Date.now() + expires_in * 1000;
			await User.findOneAndUpdate(
				{
					unique_id:
						req.session?.user?.id || req.session?.addedUser?.owner,
				},
				{
					FB_ACCESS_TOKEN: newAccessToken,
					FB_ACCESS_TOKEN_EXPIRY: expirationTime,
					WABA_ID: waba_id,
					PHONE_NUMBER_ID: phone_number_id,
				},
			);

			// Step 3: Automatically exchange short-lived token for a long-lived token
			// const longLivedToken = await getPermanentAccessToken(
			// 	waba_id,
			// 	phone_number_id,
			// 	newAccessToken,
			// );
			// if (longLivedToken) {
			// 	// const longLivedExpirationTime =
			// 	// 	Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds
			// 	await User.findByIdAndUpdate(req.session.user.id, {
			// 		FB_ACCESS_TOKEN: longLivedToken,
			// 		// FB_ACCESS_TOKEN_EXPIRY: longLivedExpirationTime,
			// 	});

			// 	res.json({ access_token: longLivedToken });
			// } else {
			// 	res.status(500).json({
			// 		error: "Failed to exchange for a long-lived token",
			// 	});
			// }
		} else {
			console.log(response.data.error);
		}
	} catch (error) {
		console.error("Error making axios request:", error);
		res.status(500).json({
			error: "Failed to exchange authorization code",
		});
	}
});

router.post("/webhook", async (req, res) => {
	try {
		const { entry } = req.body;

		for (const entryItem of entry) {
			const user = await User.findOne({ WABA_ID: entryItem.id });
			if (!user) continue; // Skip if no user found
			console.log(JSON.stringify(entryItem));

			if (entryItem.changes) {
				for (const change of entryItem.changes) {
					const messagingEvent = change.value;
					console.log(messagingEvent);

					// Handle template status updates
					if (messagingEvent.statuses) {
						for (const statusEvent of messagingEvent.statuses) {
							const {
								id: messageId,
								status,
								timestamp,
								recipient_id: recipientPhone,
								errors,
							} = statusEvent;

							const campaign = await Campaign.findOne({
								useradmin: user.unique_id,
								deleted: false,
							})
								.sort({ createdAt: -1 })
								.limit(1);

							let report = await Reports.findOne({ messageId });

							if (report) {
								report.status = status.toUpperCase();
								report.updatedAt = timestamp * 1000;
								report.recipientPhone = recipientPhone;

								// Check if the status is "failed"
								if (
									status === "failed" &&
									errors &&
									errors.length > 0
								) {
									const { code, title } = errors[0];
									report.failed = {
										code: code || "UNKNOWN_ERROR",
										text:
											title ||
											"No error message provided",
									};
								}

								await report.save();
							}
						}
					}

					// Check for template rejection (Updated for both old and new JSON structure)
					if (
						messagingEvent.event === "REJECTED" ||
						messagingEvent.status === "REJECTED"
					) {
						let templateId,
							templateName,
							templateLanguage,
							rejectedReason;

						if (messagingEvent.event === "REJECTED") {
							// New structure with the rejection reason inside 'changes'
							templateId = messagingEvent.message_template_id;
							templateName = messagingEvent.message_template_name;
							templateLanguage =
								messagingEvent.message_template_language;
							rejectedReason = messagingEvent.reason;
						} else if (messagingEvent.status === "REJECTED") {
							// Old structure without detailed reason
							templateId = entryItem.id;
							rejectedReason = "Unknown reason";
						}

						// Update the template status and rejection reason in the database
						let template = await Template.findOne({
							template_id: String(templateId),
						});
						console.log(template);
						if (template) {
							template.status = "Rejected";
							template.rejected_reason = rejectedReason;

							await template.save();
						} else {
							console.log(
								`Template with ID ${templateId} not found.`,
							);
						}
					}

					// Handle incoming messages/replies
					if (messagingEvent.messages) {
						for (const messageEvent of messagingEvent.messages) {
							const {
								id: messageId,
								from: recipientPhone,
								timestamp,
								text,
								type,
								image,
							} = messageEvent;

							const campaign = await Campaign.findOne({
								useradmin: user.unique_id,
								deleted: false,
							})
								.sort({ createdAt: -1 })
								.limit(1);

							let report = await Reports.findOne({
								campaignId: campaign.unique_id,
								recipientPhone,
							});
							console.log("1", text.body);
							if (report) {
								if (type === "text") {
									console.log("2", text.body);
									report.replyContent = String(text.body);
									report.status = "REPLIED";
								} else if (type === "image" && image) {
									const { id: imageId, mime_type: mimeType } =
										image;

									// Handle image if needed, e.g. save to disk or cloud
								}

								await report.save(); // Save the report
							} else {
								console.log("3", text.body);
								await Reports.create({
									messageId,
									recipientPhone,
									WABA_ID: user.WABA_ID || "",
									FB_PHONE_ID: user.FB_PHONE_ID || "",
									useradmin: user.unique_id || "",
									messageId,
									status: "REPLIED",
									updatedAt: timestamp,
									recipientPhone,
									campaignId: campaign
										? campaign.unique_id
										: "",
									unique_id: generateUniqueId(),
								});
							}
						}
					}
				}
			}
		}

		res.status(200).send("EVENT_RECEIVED");
	} catch (err) {
		console.error("Error processing webhook:", err);
		res.status(500).send("Server Error");
	}
});

// Function to refresh the long-lived token
const refreshLongLivedToken = async (userId, oldToken) => {
	try {
		const response = await axios.get(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&fb_exchange_token=${oldToken}`,
		);

		if (response.data.access_token) {
			const newAccessToken = response.data.access_token;
			const expirationTime = Date.now() + 50 * 24 * 60 * 60 * 1000; // 50 days in milliseconds

			// Save the new token and expiration time to the database
			await User.findByIdAndUpdate(userId, {
				FB_ACCESS_TOKEN: newAccessToken,
				FB_ACCESS_TOKEN_EXPIRY: expirationTime,
			});

			console.log(`Token refreshed for user ${userId}`);
		} else {
			console.error("Failed to get a new access token:", response.data);
		}
	} catch (error) {
		console.error("Error refreshing long-lived token:", error);
	}
};

async function getPermanentAccessToken(
	wabaId,
	phoneNumberId,
	systemUserAccessToken,
) {
	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${wabaId}/phone_numbers?access_token=${systemUserAccessToken}`;

		const response = await axios.get(url);

		if (response.status === 200) {
			const phoneNumbers = response.data.data;
			const phoneNumber = phoneNumbers.find(
				(number) => number.id === phoneNumberId,
			);

			if (phoneNumber) {
				// Use the phone number's access token
				const phoneNumberAccessToken = phoneNumber.access_token;
				console.log("Permanent Access Token:", phoneNumberAccessToken);
				return phoneNumberAccessToken;
			} else {
				console.error("Phone number not found.");
			}
		} else {
			console.error("Error fetching phone numbers:", response.data);
		}
	} catch (error) {
		console.error("Error:", error);
	}
}

// Cron job to check token expiration every day at midnight
cron.schedule("0 10 * * *", async () => {
	console.log("Checking token expiration...");

	try {
		// Find all users whose token is about to expire in the next 10 days (i.e., 50 days have passed)
		const currentTime = Date.now();
		const tenDaysInMs = 10 * 24 * 60 * 60 * 1000;

		const users = await User.find({
			FB_ACCESS_TOKEN_EXPIRY: { $lt: currentTime + tenDaysInMs }, // Tokens expiring in less than 10 days
		});

		if (users.length > 0) {
			console.log(
				`${users.length} users' tokens are about to expire. Refreshing...`,
			);

			for (const user of users) {
				await refreshLongLivedToken(user._id, user.FB_ACCESS_TOKEN);
			}
		} else {
			console.log("No tokens need to be refreshed today.");
		}
	} catch (error) {
		console.error("Error checking token expiration:", error);
	}
});

export default router;

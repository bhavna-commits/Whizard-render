import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import Template from "../models/templates.model.js";
import Campaign from "../models/campaign.model.js";
import User from "../models/user.model.js";
import Reports from "../models/report.model.js";
import axios from "axios";
import { generateUniqueId } from "../utils/otpGenerator.js";
// import { dummyPayload } from "../utils/dummy.js";

dotenv.config();

const router = express.Router();

router.get("/auth_code", async (req, res) => {
	// const { code } = req.body;

	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token?client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&redirect_uri=https://localhost:5000&code=HFnK$H{U5^7ik[fDlEgJ*!HwNc0S];`;

		// Step 1: Exchange authorization code for access token
		const response = await axios.post(url);

		if (response.status === 200) {
			const { access_token, expires_in } = response.data;

			// Step 2: Store access token and calculate expiration time (current time + expires_in)
			const expirationTime = Date.now() + expires_in * 1000; // expires_in is in seconds
			await User.findOneAndUpdate(
				req.session?.user?.id || req.session?.addedUser?.owner,
				{
					FB_ACCESS_TOKEN: access_token,
					FB_ACCESS_TOKEN_EXPIRY: expirationTime,
				},
			);

			// Step 3: Automatically exchange short-lived token for a long-lived token
			const longLivedToken = await exchangeForLongLivedToken(
				access_token,
			);
			if (longLivedToken) {
				// Store the long-lived token and update its expiration time
				const longLivedExpirationTime =
					Date.now() + 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds
				await User.findByIdAndUpdate(req.session.user.id, {
					FB_ACCESS_TOKEN: longLivedToken,
					FB_ACCESS_TOKEN_EXPIRY: longLivedExpirationTime,
				});

				res.json({ access_token: longLivedToken });
			} else {
				res.status(500).json({
					error: "Failed to exchange for a long-lived token",
				});
			}
		} else {
			console.error(
				"Error exchanging code for access token:",
				response.data,
			);
			res.status(500).json({
				error: "Failed to exchange authorization code",
			});
		}
	} catch (error) {
		console.error("Error making axios request:", error);
		res.status(500).json({
			error: "Failed to exchange authorization code",
		});
	}
});

// Function to exchange the short-lived token for a long-lived one
const exchangeForLongLivedToken = async (shortLivedToken) => {
	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token`;
		const response = await axios.get(url, {
			params: {
				grant_type: "fb_exchange_token",
				client_id: process.env.FB_APP_ID,
				client_secret: process.env.FB_APP_SECRET,
				fb_exchange_token: shortLivedToken,
			},
		});

		if (response.status === 200) {
			return response.data.access_token;
		} else {
			console.error(
				"Failed to exchange for long-lived token:",
				response.data,
			);
			return null;
		}
	} catch (error) {
		console.error("Error refreshing token:", error);
		return null;
	}
};

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
								report.updatedAt = timestamp;
								report.recipientPhone = recipientPhone;

								await report.save();
							} else {
								report = new Reports({
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

					// Check for template rejection (Updated according to the new JSON structure)
					if (messagingEvent.event === "REJECTED") {
						const {
							message_template_id: templateId,
							message_template_name: templateName,
							message_template_language: templateLanguage,
							reason: rejectedReason,
						} = messagingEvent;

						// Update the template status and rejection reason in the database
						let template = await Template.findOne({
							fb_id: templateId,
						});

						if (template) {
							template.status = "Rejected";
							template.rejected_reason = `Template '${templateName}' (Language: ${templateLanguage}) was rejected. Reason: ${rejectedReason}.`;

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

export default router;

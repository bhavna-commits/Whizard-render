import express from "express";
import dotenv from "dotenv";
// import cron from "node-cron";
import Template from "../models/templates.model.js";
import Campaign from "../models/campaign.model.js";
import User from "../models/user.model.js";
import Token from "../models/token.model.js";
import Reports from "../models/report.model.js";
import Chat from "../models/chats.model.js";
// import axios from "axios";
import { generateUniqueId } from "../utils/otpGenerator.js";

dotenv.config();

const router = express.Router();

router.post("/auth_code", async (req, res) => {
	const { access_token: code, waba_id, phone_number_id } = req.body;

	try {
		// Step 1: Exchange authorization code for access token
		let tokenResponse;
		try {
			const tokenUrl = `https://graph.facebook.com/v22.0/oauth/access_token`;
			tokenResponse = await fetch(tokenUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					client_id: process.env.FB_APP_ID,
					client_secret: process.env.FB_APP_SECRET,
					code,
				}),
			});
			tokenResponse = await tokenResponse.json();
			if (tokenResponse?.error) {
				console.log(
					"Error while exchanging code for access token:",
					tokenResponse.error.message,
				);
				return res.status(400).json({
					success: false,
					message: tokenResponse.error.message,
				});
			}
		} catch (error) {
			console.error("Error details while exchanging token:", error);
			return res.status(500).json({
				success: false,
				message: "Error exchanging code for access token.",
			});
		}
		console.log("Token exchange response:", tokenResponse);
		const { access_token: newAccessToken, expires_in } = tokenResponse;

		// Step 2: Subscribe the app to the WABA (webhooks)
		try {
			const subscribeUrl = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${waba_id}/subscribed_apps`;
			const subscribeResponse = await fetch(subscribeUrl, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${newAccessToken}`,
					"Content-Type": "application/json",
				},
			});
			const subscribeData = await subscribeResponse.json();
			if (!subscribeResponse.ok) {
				throw new Error(
					subscribeData.error?.message ||
						"Failed to subscribe app to WABA.",
				);
			}
			console.log("Subscription response:", subscribeData);
		} catch (error) {
			console.error("Error subscribing app:", error);
			return res.status(500).json({
				success: false,
				message: "Failed to subscribe app to WABA.",
			});
		}

		// Step 3: Update user data with WABA and token details
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		await User.findOneAndUpdate(
			{ unique_id: userId },
			{
				WABA_ID: waba_id,
				FB_ACCESS_TOKEN: newAccessToken,
				WhatsAppConnectStatus: "Live",
				$push: {
					FB_PHONE_NUMBERS: {
						phone_number_id,
					},
				},
			},
			{ new: true },
		);

		// Update session data accordingly
		if (req.session?.user) {
			req.session.user.whatsAppStatus = "Live";
		} else if (req.session?.addedUser) {
			req.session.addedUser.whatsAppStatus = "Live";
		}

		res.status(201).json({ success: true });
	} catch (error) {
		console.error("Error making request:", error);
		res.status(500).json({
			success: false,
			error: "Failed to complete authentication process.",
		});
	}
});

router.post("/webhook", async (req, res) => {
	try {
		const { entry } = req.body;

		for (const entryItem of entry) {
			const user = await User.findOne({ WABA_ID: entryItem.id });
			console.log(user);
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
						// Extract FB_PHONE_ID from webhook metadata if available
						// This assumes that the messagingEvent contains a metadata object similar to:
						// "metadata": { "display_phone_number": "...", "phone_number_id": "610364625484830" }
						const fbPhoneId =
							messagingEvent.metadata?.phone_number_id ||
							user.FB_PHONE_ID ||
							"";

						for (const messageEvent of messagingEvent.messages) {
							const {
								id: messageId,
								from: recipientPhone,
								timestamp,
								text,
								type,
								image,
							} = messageEvent;

							// Fetch the most recent campaign for the user
							const campaign = await Campaign.findOne({
								useradmin: user.unique_id,
								deleted: false,
							})
								.sort({ createdAt: -1 })
								.limit(1);

							// Try to find an existing report for this campaign and recipient
							let report = await Reports.findOne({
								campaignId: campaign.unique_id,
								recipientPhone,
							});

							// If there's an existing report, update it with reply content or media info
							if (report) {
								if (type === "text") {
									report.replyContent = String(text.body);
									report.status = "REPLIED";
								} else if (type !== "text" && image) {
									// When a media message is received, we attempt to store a URL (if 
									report.status = "REPLIED";
								}
								await report.save();
							}

							// Always create a new Chat record for every message received
							await Chat.create({
								messageId,
								recipientPhone,
								WABA_ID: user.WABA_ID || "",
								FB_PHONE_ID: fbPhoneId,
								useradmin: user.unique_id || "",
								status: "REPLIED",
								updatedAt: timestamp,
								campaignId: campaign ? campaign.unique_id : "",
								unique_id: generateUniqueId(),
								// Save message content and media info accordingly
								replyContent: type === "text" ? text.body : "",
								textSent: type === "text" ? text.body : "",
								media:
									type !== "text" && image
										? {
												url: image.url || "",
												fileName: image.fileName || "",
												caption: text?.body || "",
										  }
										: {},
								type: "Chat",
							});
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

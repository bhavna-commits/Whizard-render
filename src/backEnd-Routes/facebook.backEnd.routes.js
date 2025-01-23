import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import User from "../models/user.model.js";
import Reports from "../models/report.model.js";
import axios from "axios";
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
		console.log(JSON.stringify(entry));

		// Iterate over all the entries (since multiple events can be sent at once)
		for (const entryItem of entry) {
			const user = await User.findOne({ WABA_ID: entryItem.id });
			if (entryItem.changes) {
				for (const change of entryItem.changes) {
					const messagingEvent = change.value;

					// Handle statuses (SENT, DELIVERED, READ, etc.)
					if (messagingEvent.statuses) {
						for (const statusEvent of messagingEvent.statuses) {
							const {
								id: messageId,
								status,
								timestamp,
								recipient_id: recipientPhone,
							} = statusEvent;

							// Check if we already have a report for this messageId
							let report = await Reports.findOne({ messageId });

							if (report) {
								// Update the existing report
								report.status = status.toUpperCase();
								report.updatedAt = timestamp;
								report.recipientPhone = recipientPhone;
							} else {
								// Create a new report if none exists
								report = new Reports({
									WABA_ID: user.WABA_ID,
									FB_PHONE_ID: user.FB_PHONE_ID,
									useradmin: user.unique_id,
									messageId,
									status: status.toUpperCase(),
									updatedAt: timestamp,
									recipientPhone,
									// Populate other necessary fields (depending on your schema)
								});
							}
							await report.save();
						}
					}

					// Handle replies (TEXT, IMAGE, etc.)
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

							// Create or update the report for this message
							let report = await Reports.findOne({ messageId });

							if (!report) {
								// Create a new report if it doesn't exist
								report = new Reports({
									messageId,
									recipientPhone,
									// Set any default values required in your schema
								});
							}

							// Capture reply content based on the type of message
							if (type === "text") {
								report.replyContent = text.body; // Update reply content
							} else if (type === "image" && image) {
								const { id: imageId, mime_type: mimeType } =
									image;

								// Handle image if needed, e.g. save to disk or cloud
							}

							await report.save(); // Save the report
						}
					}
				}
			}
		}

		// Respond to the webhook with a success message
		res.status(200).send("EVENT_RECEIVED");
	} catch (err) {
		console.error("Error processing webhook:", err);
		res.status(500).send("Server Error");
	}
});

export default router;

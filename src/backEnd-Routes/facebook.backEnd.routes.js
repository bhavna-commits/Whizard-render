import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import User from "../models/user.model.js";
import Reports from "../models/report.model.js";
import axios from "axios";
import { dummyPayload } from "../utils/dummy.js";

dotenv.config();

const router = express.Router();

router.post("/auth_code", async (req, res) => {
	const { code } = req.body;

	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token?client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&redirect_uri=https://localhost:5000&code=${code}`;

		const response = await fetch(url, {
			method: "POST",
		});

		const data = await response.json();

		if (response.ok) {
			const accessToken = data.access_token;
			await User.findByIdAndUpdate(req.session.user.id, { accessToken });
			res.json({ access_token: accessToken });
		} else {
			console.error("Error exchanging code for access token:", data);
			res.status(500).json({
				error: "Failed to exchange authorization code",
			});
		}
	} catch (error) {
		console.error("Error making fetch request:", error);
		res.status(500).json({
			error: "Failed to exchange authorization code",
		});
	}
});

router.post("/webhook", async (req, res) => {
	try {
		const { entry } = req.body;
		console.log(JSON.stringify(entry));
		// Iterate over all the entries (since multiple events can be sent at once)
		for (const entryItem of entry) {
			// Check if the entryItem has changes
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
								report.timestamp = timestamp;
								report.recipientPhone = recipientPhone;
								await report.save();
							} else {
								// If no report found, log or handle the scenario (optional)
								console.log(
									"Report not found for message ID:",
									messageId,
								);
							}
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

							// Capture reply content based on the type of message
							if (type === "text") {
								
								report.replyContent = text?.body;
							} else if (type === "image" && image) {
								const { id: imageId, mime_type: mimeType } =
									image;

								// const imageBuffer = await downloadImage(imageSrc);
								// fs.writeFileSync(
								// 	`uploads/${report.campaignId}/${messageId}/${imageId}.${
								// 		mimeType.split("/")[1]
								// 	}`,
								// 	imageBuffer,
								// );
							}

							await report.save();
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

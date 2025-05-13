import express from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import Chats from "../models/chats.model.js";
import Report from "../models/report.model.js";
import User from "../models/user.model.js";
import TempStatus from "../models/TempStatus.model.js";
import TempMessage from "../models/TempMessage.model.js";
import TempTemplateRejection from "../models/TempTemplateRejection.model.js";
import {
	refreshBusinessToken,
	scheduleRefresh,
} from "../services/facebook/refreshToken.facebook.js";
import ChatsUsers from "../models/chatsUsers.model.js";
import Permissions from "../models/permissions.model.js";
import AddedUser from "../models/addedUser.model.js";

dotenv.config();

const router = express.Router();

router.post("/auth_code", async (req, res) => {
	const { access_token: code, waba_id, phone_number_id } = req.body;

	try {
		const exists = await User.findOne({ WABA_ID: waba_id });
		if (exists) {
			return res.status(401).json({
				success: false,
				error: "This WhatsApp account is already connected to Whizard.",
			});
		}

		let tokenResponse;
		try {
			const tokenUrl = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token`;
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
				console.log("Token error:", tokenResponse.error.message);
				return res.status(400).json({
					success: false,
					message: tokenResponse.error.message,
				});
			}
		} catch (error) {
			console.error("Token exchange error:", error);
			return res.status(500).json({
				success: false,
				message: "Token exchange failed.",
			});
		}

		const { access_token: newAccessToken, expires_in } = tokenResponse;

		// Subscribe to webhook
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
					subscribeData.error?.message || "WABA subscription failed.",
				);
			}
		} catch (error) {
			console.error("WABA subscribe error:", error);
			return res.status(500).json({
				success: false,
				message: "WABA subscription failed.",
			});
		}

		// Save to DB
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

		// Update session
		if (req.session?.user) {
			req.session.user.whatsAppStatus = "Live";
		} else if (req.session?.addedUser) {
			req.session.addedUser.whatsAppStatus = "Live";
		}

		// Schedule a refresh ~50 days from now (to avoid expiry)
		if (expires_in) {
			const runAt = new Date(Date.now() + 50 * 24 * 60 * 60 * 1000);
			scheduleRefresh(runAt, () =>
				refreshBusinessToken(userId, waba_id, newAccessToken),
			);

			console.log(
				`Scheduled refresh job on ${refreshDate.toUTCString()}`,
			);
		}

		return res.status(201).json({ success: true });
	} catch (error) {
		console.error("General error:", error);
		return res.status(500).json({
			success: false,
			error: "Authentication process failed.",
		});
	}
});

// router.post("/webhook", async (req, res) => {
// 	try {
// 		const { entry } = req.body;

// 		for (const entryItem of entry) {
// 			const wabaId = entryItem.id;

// 			if (entryItem.changes) {
// 				const change = entryItem.changes[0];
// 				const messagingEvent = change.value;
// 				console.log(JSON.stringify(entryItem));
// 				// Handle status events
// 				if (messagingEvent.statuses) {
// 					const fbPhoneId =
// 						messagingEvent.metadata?.phone_number_id || "";
// 					const statusEvent = messagingEvent.statuses[0];
// 					console.log(statusEvent);
// 					const {
// 						id: messageId,
// 						status,
// 						timestamp,
// 						recipient_id: recipientPhone,
// 						errors,
// 					} = statusEvent;

// 					const tempStatus = new TempStatus({
// 						fbPhoneId,
// 						wabaId,
// 						messageId,
// 						status: status.toUpperCase(),
// 						timestamp: timestamp * 1000,
// 						recipientPhone,
// 						error: errors || [],
// 						// rawData: statusEvent,
// 					});
// 					await tempStatus.save();
// 				}

// 				// Handle template rejections
// 				if (
// 					messagingEvent.event === "REJECTED" ||
// 					messagingEvent.status === "REJECTED"
// 				) {
// 					console.log(messagingEvent);
// 					let templateId,
// 						templateName,
// 						templateLanguage,
// 						rejectedReason;

// 					if (messagingEvent.event === "REJECTED") {
// 						templateId = messagingEvent.message_template_id;
// 						templateName = messagingEvent.message_template_name;
// 						templateLanguage =
// 							messagingEvent.message_template_language;
// 						rejectedReason = messagingEvent.reason;
// 					} else if (messagingEvent.status === "REJECTED") {
// 						templateId = entryItem.id;
// 						rejectedReason = "Unknown reason";
// 					}

// 					const tempRejection = new TempTemplateRejection({
// 						wabaId,
// 						templateId: String(templateId),
// 						templateName,
// 						templateLanguage,
// 						rejectedReason,
// 						// rawData: messagingEvent,
// 					});
// 					await tempRejection.save();
// 				}

// 				if (messagingEvent?.messages) {
// 					const fbPhoneId =
// 						messagingEvent.metadata?.phone_number_id || "";
// 					const name = messagingEvent.contacts?.[0]?.profile?.name;
// 					const messageEvent = messagingEvent.messages[0];
// 					const {
// 						id: messageId,
// 						from: senderPhone,
// 						timestamp,
// 						type,
// 						text,
// 						image,
// 						video,
// 						document,
// 						audio,
// 					} = messageEvent;

// 					// Determine mediaUrl if the message contains a file
// 					let mediaId = "";
// 					if (type === "image" && image?.id) {
// 						mediaId = image.id;
// 					} else if (type === "video" && video?.id) {
// 						mediaId = video.id;
// 					} else if (type === "document" && document?.id) {
// 						mediaId = document.id;
// 					} else if (type === "audio" && audio?.id) {
// 						mediaId = audio.id;
// 					}

// 					// Build and save the TempMessage
// 					const tempMessage = new TempMessage({
// 						name,
// 						wabaId,
// 						messageId,
// 						from: senderPhone,
// 						timestamp: timestamp * 1000,
// 						type,
// 						text:
// 							text ||
// 							image?.caption ||
// 							video?.caption ||
// 							document?.caption ||
// 							audio?.caption,
// 						mediaId,
// 						fbPhoneId,
// 						// rawData: messageEvent,
// 					});
// 					await tempMessage.save();
// 				}
// 			}
// 		}

// 		res.status(200).send("EVENT_RECEIVED");
// 	} catch (err) {
// 		console.error("Error processing webhook:", err);
// 		res.status(200).send("EVENT_RECEIVED");
// 	}
// });

let agents = [];

router.post("/webhook", async (req, res) => {
	try {
		const { entry } = req.body;

		for (const entryItem of entry) {
			const wabaId = entryItem.id;

			if (entryItem.changes) {
				const change = entryItem.changes[0];
				const messagingEvent = change.value;
				console.log(JSON.stringify(entryItem));
				// Handle status events
				if (messagingEvent.statuses) {
					const fbPhoneId =
						messagingEvent.metadata?.phone_number_id || "";
					const statusEvent = messagingEvent.statuses[0];
					console.log(statusEvent);
					const {
						id: messageId,
						status,
						timestamp,
						recipient_id: recipientPhone,
						errors,
					} = statusEvent;

					const tempStatus = new TempStatus({
						fbPhoneId,
						wabaId,
						messageId,
						status: status.toUpperCase(),
						timestamp: timestamp * 1000,
						recipientPhone,
						error: errors || [],
						// rawData: statusEvent,
					});
					await tempStatus.save();
				}

				// Handle template rejections
				if (
					messagingEvent.event === "REJECTED" ||
					messagingEvent.status === "REJECTED"
				) {
					console.log(messagingEvent);
					let templateId,
						templateName,
						templateLanguage,
						rejectedReason;

					if (messagingEvent.event === "REJECTED") {
						templateId = messagingEvent.message_template_id;
						templateName = messagingEvent.message_template_name;
						templateLanguage =
							messagingEvent.message_template_language;
						rejectedReason = messagingEvent.reason;
					} else if (messagingEvent.status === "REJECTED") {
						templateId = entryItem.id;
						rejectedReason = "Unknown reason";
					}

					const tempRejection = new TempTemplateRejection({
						wabaId,
						templateId: String(templateId),
						templateName,
						templateLanguage,
						rejectedReason,
						// rawData: messagingEvent,
					});
					await tempRejection.save();
				}

				if (messagingEvent?.messages) {
					const fbPhoneId =
						messagingEvent.metadata?.phone_number_id || "";
					const name = messagingEvent.contacts?.[0]?.profile?.name;
					const messageEvent = messagingEvent.messages[0];
					const {
						id: messageId,
						from: senderPhone,
						timestamp,
						type,
						text,
						image,
						video,
						document,
						audio,
					} = messageEvent;

					// Determine mediaUrl if the message contains a file
					let mediaId = "";
					if (type === "image" && image?.id) {
						mediaId = image.id;
					} else if (type === "video" && video?.id) {
						mediaId = video.id;
					} else if (type === "document" && document?.id) {
						mediaId = document.id;
					} else if (type === "audio" && audio?.id) {
						mediaId = audio.id;
					}

					await TempMessage.create({
						name,
						wabaId,
						messageId,
						from: senderPhone,
						timestamp: timestamp * 1000,
						type,
						text:
							text ||
							image?.caption ||
							video?.caption ||
							document?.caption ||
							audio?.caption,
						mediaId,
						fbPhoneId,
						status: "receive",
					});

					const replyChat = {
						WABA_ID: wabaId,
						FB_PHONE_ID: fbPhoneId,
						useradmin: "dummy",
						unique_id: "dummy",
						campaignId: "dummy",
						templateId: "dummy",
						contactName: name,
						recipientPhone: senderPhone,
						status: "REPLIED",
						updatedAt: timestamp * 1000,
						messageId,
						text: type === "text" ? text?.body : text,
						media:
							type !== "text"
								? {
										url: mediaId,
										fileName: mediaId,
										caption: text || "",
								  }
								: {},

						type: "Chat",
						media_type: type !== "text" ? type : "",
					};

					await Chats.create(replyChat);

					try {
						const c = await ChatsUsers.findOne({
							FB_PHONE_ID: fbPhoneId,
							wa_id: senderPhone,
						});

						agents = c.agent;

						console.log("🔍 Agents:", agents);
					} catch (err) {
						console.error("Error adding agent in chats:", err);
					}
				}
			}
		}

		res.status(200).send("EVENT_RECEIVED");
	} catch (err) {
		console.error("Error processing webhook:", err);
		res.status(200).send("EVENT_RECEIVED");
	}
});

async function scheduleAllRefreshJobs() {
	const now = new Date();
	const users = await User.find({ nextRefreshAt: { $lte: now } });
	users.forEach((user) => {
		scheduleRefresh(
			user.unique_id,
			user.WABA_ID,
			user.FB_ACCESS_TOKEN,
			user.nextRefreshAt,
		);
	});
}

scheduleAllRefreshJobs();

export default router;

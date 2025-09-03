import express from "express";
import dotenv from "dotenv";
import { agenda } from "../config/db.js";
import Chats from "../models/chats.model.js";
import User from "../models/user.model.js";
import TempStatus from "../models/TempStatus.model.js";
import TempMessage from "../models/TempMessage.model.js";
import TempTemplateRejection from "../models/TempTemplateRejection.model.js";
import ChatsUsers from "../models/chatsUsers.model.js";
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
		const updateData = {
			WABA_ID: waba_id,
			FB_ACCESS_TOKEN: newAccessToken,
			WhatsAppConnectStatus: "Live",
			$push: {
				FB_PHONE_NUMBERS: {
					phone_number_id,
					selected: true,
				},
			},
		};

		if (expires_in) {
			updateData.FB_ACCESS_EXPIRES_IN = expires_in;
		}

		await User.findOneAndUpdate({ unique_id: userId }, updateData, {
			new: true,
		});
		
		// Update session
		if (req.session?.user) {
			req.session.user.whatsAppStatus = "Live";
		} else if (req.session?.addedUser) {
			req.session.addedUser.whatsAppStatus = "Live";
		}

		if (expires_in) {
			const runAt = new Date(Date.now() + (expires_in - 86400) * 1000); // 1 day early

			await agenda.schedule(runAt, "refresh fb token", {
				userId,
				wabaId: waba_id,
				token: newAccessToken,
			});

			console.log(
				`Agenda: Scheduled FB token refresh for ${userId} at ${runAt.toUTCString()}`,
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

router.post("/webhook", async (req, res) => {
	// if (process.env.CHAT_IFRAME_URL) return;
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
					});
					await tempStatus.save();
				}

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
						sticker,
					} = messageEvent;

					if (type === "unsupported") continue;

					let mediaId = "";
					if (type === "image" && image?.id) {
						mediaId = image.id;
					} else if (type === "video" && video?.id) {
						mediaId = video.id;
					} else if (type === "document" && document?.id) {
						mediaId = document.id;
					} else if (type === "audio" && audio?.id) {
						mediaId = audio.id;
					} else if (type === "sticker" && sticker?.id) {
						mediaId = sticker.id;
					}

					const getMessageText = () => {
						if (text) return text;
						if (image?.caption) return image.caption;
						if (video?.caption) return video.caption;
						if (document?.caption) return document.caption;
						if (audio?.caption) return audio.caption;

						switch (type) {
							case "image":
							case "video":
							case "document":
							case "audio":
							case "sticker":
								return type;
							default:
								return "";
						}
					};

					try {
						const c = await ChatsUsers.findOne({
							FB_PHONE_ID: fbPhoneId,
							wa_id: senderPhone,
						}).lean();

						let agents = c?.agent || [];

						let supportagents = c?.supportAgent || [];
						let finalagents = [];

						if (agents.length > 0 || supportagents.length > 0) {
							finalagents = [...agents, ...supportagents];
						} else {
							const agentUser = await AddedUser.find({
								roleId: "UnAssignedChats",
								FB_PHONE_ID: fbPhoneId,
							});

							finalagents = agentUser.map(
								(agent) => agent.unique_id,
							);
						}

						if (finalagents.length > 0) {
							sendsocket(
								finalagents,
								senderPhone,
								text,
								timestamp * 1000,
								c?.contactName?.toString() || name,
								mediaId,
								type,
								fbPhoneId,
								document,
							);
						}

						await TempMessage.create({
							name,
							wabaId,
							messageId,
							from: senderPhone,
							timestamp: timestamp * 1000,
							type,
							text: getMessageText(),
							mediaId,
							fbPhoneId,
							status: "receive",
						});

						const replyChat = {
							WABA_ID: wabaId,
							FB_PHONE_ID: fbPhoneId,
							useradmin: c?.useradmin || "-",
							unique_id: "-",
							campaignId: c?.campaignId || "-",
							templateId: "-",
							contactName: name,
							recipientPhone: senderPhone,
							status: "REPLIED",
							updatedAt: timestamp * 1000,
							messageId,
							text: type === "text" ? text?.body : text,
							media:
								type !== "text"
									? {
											url: `/api/chats/get-media?mediaId=${mediaId}&phoneId=${fbPhoneId}`,
											fileName:
												type === "document"
													? document?.filename
													: "",
											caption: text || "",
									  }
									: {},

							type: "Chat",
							media_type: type !== "text" ? type : "",
						};

						await Chats.create(replyChat);
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

function sendsocket(
	agentslist,
	userno,
	text,
	timestamp,
	name,
	mediaId,
	type,
	fbPhoneId,
	document,
) {
	console.log(agentslist);
	if (agentslist.length > 0) {
		for (var i = 0; i < agentslist.length; i++) {
			let bptId = "new-message_idal_com_" + userno + agentslist[i];
			console.log(bptId);

			let lastmessage = text?.body || text || "";
			if (type === "text") {
				type = "";
			}
			if (type) {
				lastmessage = type;
			}

			let data1 = {
				filter_data: {},
				msg: lastmessage,
				timestamp: timestamp,
				status: "replied",
				username: name,
				wa_id: userno,
				media_message: type
					? {
							link:
								`/api/chats/get-media?mediaId=${mediaId}&phoneId=${fbPhoneId}` ||
								"",
							filename:
								type === "document" ? document?.filename : "",
							caption: lastmessage || "",
					  }
					: { link: "", caption: "" },
				media_type: type,
			};

			let data2 = {
				filter_data: {},
				sent: 1,
				lastmessage: lastmessage,
				wa_id: userno,
				status: 0,
				username: name,
				name: name,
				keyId: fbPhoneId,
				usertimestmp: timestamp,
				is_read: false,
				media_message: type
					? {
							link:
								`/api/chats/get-media?mediaId=${mediaId}&phoneId=${fbPhoneId}` ||
								"",
							filename:
								type === "document" ? document?.filename : "",
							caption: lastmessage || "",
					  }
					: { link: "", caption: "" },
				media_type: type,
			};

			let bptId2 = "MainRefresh_initial-users_" + agentslist[i];
			//console.log(bptId)
			console.log(data1);

			//console.log(bptId2)
			console.log(data2);
			// io.emit(bptId, data1);
			// io.emit(bptId2, data2);
		}
	}
}

async function scheduleAllRefreshJobs() {
	const now = new Date();
	const users = await User.find({ nextRefreshAt: { $lte: now } });

	for (const user of users) {
		await agenda
			.create("refresh fb token", {
				userId: user.unique_id,
				wabaId: user.WABA_ID,
				token: user.FB_ACCESS_TOKEN,
			})
			.unique({ "data.userId": user.unique_id })
			.schedule(user.nextRefreshAt)
			.save();

		console.log(
			`📅 Agenda: Ensured refresh for ${
				user.unique_id
			} at ${user.nextRefreshAt.toUTCString()}`,
		);
	}
	
}

scheduleAllRefreshJobs();


export default router;

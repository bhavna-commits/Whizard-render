import app from "./app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import https from "https"; // Change from http to https
import fs from "fs";

import TempStatus from "./models/TempStatus.model.js";
import TempMessage from "./models/TempMessage.model.js";
import TempTemplateRejection from "./models/TempTemplateRejection.model.js";

import ChatsUsers from "./models/chatsUsers.model.js";
import Permissions from "./models/permissions.model.js";
import AddedUser from "./models/addedUser.model.js";

import {
	getUsers,
	getSingleChat,
	searchUsers,
	sendMessages,
} from "./chats.controller.js";

dotenv.config();

// Connect to MongoDB
connectDB();

// Load SSL Certificate
const options = {
	key: fs.readFileSync("/var/www/key/private.key"), // Private key
	cert: fs.readFileSync("/var/www/key/certificate.crt"), // Certificate
	ca: fs.readFileSync("/var/www/key/ca_bundle.crt"), // Certificate Authority chain
};
import { Server } from "socket.io";
// Create HTTPS server
const httpsServer = https.createServer(options, app);

const io = new Server(httpsServer, {
	cors: { origin: "*" }, // Allow all origins (adjust for security)
});

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	socket.on("initial-users_idal_com", async (data) => {
		console.log(
			"HHHwwwwwwwwwwwwwwwwwwwwHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH",
		);
		console.log(data);
		let res = {};
		try {
			if (data["type"] == "send-message") {
				console.log(data);
				try {
					res = await sendMessages(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "getUsers") {
				try {
					res = await getUsers(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "getSingleChat") {
				try {
					res = await getSingleChat(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "searchUsers") {
				try {
					res = await searchUsers(data);
				} catch (e) {
					console.log(e);
				}
			}
			socket.emit(data["emitnode"], res);
		} catch (e) {
			console.log(e);
		}

		socket.on("disconnect", () => {
			console.log("User disconnected:", socket.id);
		});
	});
});

let agents = [];
let support = "";

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
			io.emit(bptId, data1);
			io.emit(bptId2, data2);
		}
	}
}

app.post("/webhook", async (req, res) => {
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

					// Build and save the TempMessage
					const tempMessage = new TempMessage({
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

					});
					await tempMessage.save();

					try {
						const c = await ChatsUsers.findOne({
							FB_PHONE_ID: fbPhoneId,
							wa_id: senderPhone,
						});

						agents = c.agents;

						console.log("🔍 Agents:", agents, "support :", support);
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

// Define port
const PORT = process.env.PORTSOCKET || 5500;

// Start server
httpsServer.listen(PORT, () => {
	console.log(`Server running securely on https://24.199.91.131:${PORT}`);
});

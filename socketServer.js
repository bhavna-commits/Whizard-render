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

app.post("/webhook", async (req, res) => {
	try {
		const { entry } = req.body;
		console.log(req.body);

		for (const entryItem of entry) {
			const wabaId = entryItem.id;

			if (entryItem.changes) {
				const change = entryItem.changes[0];
				const messagingEvent = change.value;

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

				// Handle incoming messages/replies
				if (messagingEvent.messages) {
					console.log(messagingEvent);
					const fbPhoneId =
						messagingEvent.metadata?.phone_number_id || "";
					const name = messagingEvent.contacts[0]?.profile?.name;
					const messageEvent = messagingEvent.messages[0];
					const {
						id: messageId,
						from: recipientPhone,
						timestamp,
						text,
						type,
						image,
					} = messageEvent;
					const tempMessage = new TempMessage({
						name,
						wabaId,
						messageId,
						from: recipientPhone,
						timestamp: timestamp * 1000,
						type,
						text,
						image,
						fbPhoneId,
						// rawData: messageEvent,
					});
					await tempMessage.save();

					try {
						const c = await ChatsUsers.findOne({
							FB_PHONE_ID: fbPhoneId,
							wa_id: recipientPhone,
						});

						if (!chats.length) {
							console.log(
								"⚠️ No chats found for given FB_PHONE_ID",
							);
							return;
						}

						agents = c.agents;

						// support = await ChatsUsers.findOne({
						// 	FB_PHONE_ID: fbPhoneId,
						// 	wa_id: recipientPhone,
						// 	agent: { $size: 0 },
						// });

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
		res.status(500).send("Server Error");
	}
});

// Define port
const PORT = process.env.PORTSOCKET || 5500;

// Start server
httpsServer.listen(PORT, () => {
	console.log(`Server running securely on https://24.199.91.131:${PORT}`);
});

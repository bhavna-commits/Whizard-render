import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

dotenv.config();

const dev = Boolean(process.env.PROD);

function getURL() {
	return !dev
		? "https://whizard.onrender.com/api/chats/get-media"
		: "https://chat.lifestylehead.com/api/chats/get-media";
}

export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

let TempStatus,
	Reports,
	User,
	Campaign,
	TempMessage,
	Chat,
	ChatsTemp,
	Contacts,
	TempTemplateRejection,
	Template,
	ChatsUsers,
	addedUser;

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("MongoDB Connected...");
	} catch (err) {
		console.error("Error connecting to MongoDB:", err.message);
		process.exit(1);
	}
};

export const processTempStatuses = async () => {
	try {
		const tempStatuses = await TempStatus.find()
			.sort({ createdAt: -1 })
			.toArray();
		const bulkChatOps = [];
		const bulkReportOps = [];

		for (const temp of tempStatuses) {
			if (temp.status === "SENT") continue;
			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) continue;

			const campaign = await Campaign.find({
				useradmin: user.unique_id,
				deleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(1)
				.toArray();

			const updateFields = {
				status: temp.status,
				updatedAt: temp.timestamp,
				recipientPhone: temp.recipientPhone,
				...(campaign[0] && { campaignId: campaign[0].unique_id }),
			};

			if (temp.status === "FAILED" && temp.error?.length) {
				const { code, title } = temp.error[0];
				updateFields.failed = {
					code: code || "UNKNOWN_ERROR",
					text: title || "No error message provided",
				};
			}

			bulkChatOps.push({
				updateOne: {
					filter: { messageId: temp.messageId },
					update: { $set: updateFields },
				},
			});
			bulkReportOps.push({
				updateOne: {
					filter: { messageId: temp.messageId },
					update: { $set: updateFields },
				},
			});
		}

		if (bulkChatOps.length) await Chat.bulkWrite(bulkChatOps);
		if (bulkReportOps.length) await Reports.bulkWrite(bulkReportOps);

		if (bulkChatOps.length || bulkReportOps.length) {
			await TempStatus.deleteMany({});
			console.log("🧹 Deleted processed temp statuses");
		}

		console.log("Bulk processed temp statuses.");
	} catch (error) {
		console.error("Error processing temp statuses (bulk):", error);
	}
};

export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find().toArray();
		const chatOps = [];
		const tempChatOps = [];

		for (const temp of tempMessages) {
			if (temp.type === "unsupported") continue;

			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) continue;

			const campaign = await Campaign.find({
				useradmin: user.unique_id,
				deleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(1)
				.toArray();

			const contactName = await Contacts.findOne({
				contactId: campaign[0]?.contactListId,
				wa_id: temp.from,
			});

			const data = {
				WABA_ID: user.WABA_ID,
				useradmin: user.unique_id,
				unique_id: generateUniqueId(),
				messageId: temp.messageId,
				recipientPhone: temp.from,
				status: "REPLIED",
				updatedAt: temp.timestamp,
				contactName: contactName?.Name || temp?.name,
				FB_PHONE_ID: temp.fbPhoneId,
				replyContent: temp.type === "text" ? temp.text?.body : "",
				media:
					temp.type !== "text"
						? {
								url:
									getURL() +
									`?mediaId=${temp.mediaId}&phoneId=${temp.fbPhoneId}`,
								fileName:
									getURL() +
									`?mediaId=${temp.mediaId}&phoneId=${temp.fbPhoneId}`,
								caption: temp.text || "",
						  }
						: {},
				type: "Chat",
				media_type: temp.type !== "text" ? temp.type : "",
				...(campaign[0] && { campaignId: campaign[0].unique_id }),
				...(campaign[0] && { campaignName: campaign[0].name }),
			};

			chatOps.push({
				updateOne: {
					filter: { messageId: data.messageId },
					update: { $set: data },
					upsert: true,
				},
			});
			tempChatOps.push({
				updateOne: {
					filter: { messageId: data.messageId },
					update: { $set: data },
					upsert: true,
				},
			});
		}

		if (chatOps.length) await Chat.bulkWrite(chatOps);
		if (tempChatOps.length) await ChatsTemp.bulkWrite(tempChatOps);

		if (chatOps.length || tempChatOps.length) {
			await TempMessage.deleteMany({});
			console.log("🧹 Deleted processed temp messages");
		}

		console.log("Bulk processed temp messages.");
	} catch (error) {
		console.error("Error processing temp messages (bulk):", error);
	}
};

export const processTempTemplateRejections = async () => {
	try {
		const tempRejections = await TempTemplateRejection.find().toArray();
		const ops = tempRejections.map((temp) => ({
			updateOne: {
				filter: { template_id: String(temp.templateId) },
				update: {
					$set: {
						status: "Rejected",
						rejected_reason: temp.rejectedReason,
					},
					$push: { logs: temp.rawData },
				},
			},
		}));

		if (ops.length) await Template.bulkWrite(ops);

		if (ops.length) {
			await TempTemplateRejection.deleteMany({});
			console.log("🧹 Deleted processed template rejections");
		}

		console.log("Bulk processed template rejections.");
	} catch (error) {
		console.error("Error processing template rejections (bulk):", error);
	}
};

export const processChatsToChatsUsers = async () => {
	try {
		const chats = await ChatsTemp.find().sort({ updatedAt: 1 }).toArray();

		if (!chats.length) {
			console.log("No chats found to process.");
			return;
		}

		const bulkOps = [];

		for (const chat of chats) {
			const filter = {
				FB_PHONE_ID: chat.FB_PHONE_ID,
				wa_id: chat.recipientPhone,
			};

			const agentUser = await addedUser.findOne({ roleId: "UnAssignedChats", useradmin: chat.useradmin });

			

			const incomingAgents = Array.isArray(chat.agent)
				? chat.agent
				: chat.agent
				? [chat.agent]
				: [];

			const baseSet = {
				updatedAt: chat.updatedAt,
				lastMessage:
					chat.replyContent ||
					chat.textSent ||
					chat.messageTemplate ||
					chat.media_type,
			};

			if (chat.status === "REPLIED") {
				baseSet.lastReceive = chat.updatedAt;
				baseSet.messageStatus = "REPLIED";
			} else {
				baseSet.lastSend = chat.updatedAt;
			}

			const update = {
				$set: baseSet,
				$addToSet: { agent: { $each: incomingAgents } },
			};

			bulkOps.push({
				updateOne: {
					filter,
					update,
					upsert: true,
				},
			});
		}

		if (bulkOps.length) {
			await ChatsUsers.bulkWrite(bulkOps);
			console.log(`Bulk processed ${bulkOps.length} chats ✅`);
		}

		await ChatsTemp.deleteMany({});
		console.log("🧹 Deleted processed temp chats");

		console.log("All done at", new Date().toLocaleString());
	} catch (error) {
		console.error("Error in bulk chat processing:", error);
	}
};

export const processAllTempEvents = async () => {
	await connectDB();
	const db = mongoose.connection.db;
	TempStatus = db.collection("tempstatuses");
	Reports = db.collection("campaignreports");
	User = db.collection("users");
	Campaign = db.collection("campaigns");
	TempMessage = db.collection("tempmessages");
	Chat = db.collection("chats");
	ChatsTemp = db.collection("chatstemps");
	ChatsUsers = db.collection("chatsusers");
	Contacts = db.collection("contacts");
	TempTemplateRejection = db.collection("temptemplaterejections");
	Template = db.collection("templates");
	addedUser = db.collection("addedusers");
	await processTempStatuses();
	await processTempMessages();
	await processTempTemplateRejections();
	await processChatsToChatsUsers();
};

if (process.argv[1] === __filename) {
	processAllTempEvents();
}

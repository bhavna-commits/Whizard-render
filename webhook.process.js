import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";

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
	ChatsUsers;

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
			.sort({ updatedAt: -1 })
			.toArray();
		// console.log(tempStatuses);
		for (const temp of tempStatuses) {
			if (temp.status === "SENT") continue;
			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) {
				console.warn(
					`User with WABA_ID ${temp.wabaId} not found. Skipping messageId ${temp.messageId}.`,
				);
				continue;
			}

			const campaign = await Campaign.find({
				// phoneNumberId: temp.fbPhoneId,
				useradmin: user.unique_id,
				deleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(1)
				.toArray();

			console.log(campaign[0].name);

			const updateFields = {
				status: temp.status,
				updatedAt: temp.timestamp,
				recipientPhone: temp.recipientPhone,
				...(campaign[0] && { campaignId: campaign[0].unique_id }),
			};

			if (
				temp.status === "FAILED" &&
				temp.error &&
				temp.error.length > 0
			) {
				const { code, title } = temp.error[0];
				updateFields.failed = {
					code: code || "UNKNOWN_ERROR",
					text: title || "No error message provided",
				};
			}

			await Chat.updateOne(
				{ messageId: temp.messageId },
				{ $set: updateFields },
			);
			await Reports.updateOne(
				{ messageId: temp.messageId },
				{ $set: updateFields },
			);
		}
		await TempStatus.deleteMany({});
		// await Reports.deleteMany({
		// 	$or: [
		// 		{ WABA_ID: { $exists: false } }, // field doesn’t exist
		// 		{ WABA_ID: null }, // field is null or non-existent
		// 		{ WABA_ID: "" }, // field is empty string
		// 	],
		// });

		console.log("Temp statuses processed and cleared.");
	} catch (error) {
		console.error("Error processing temp statuses:", error);
	}
};

export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find().toArray();

		for (const temp of tempMessages) {
			if (temp.type === "unsupported") continue;
			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) {
				console.warn(
					`User with WABA_ID ${temp.wabaId} not found. Skipping messageId ${temp.messageId}.`,
				);
				continue;
			}

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
										`?mediaId=${temp.mediaId}&phoneId=${temp.fbPhoneId}` ||
									"",
								fileName:
									getURL() +
										`?mediaId=${temp.mediaId}&phoneId=${temp.fbPhoneId}` ||
									"",
								caption: temp.text || "",
						  }
						: {},
				type: "Chat",
				media_type: temp.type !== "text" ? temp.type : "",
				...(campaign[0] && { campaignId: campaign[0].unique_id }),
				...(campaign[0] && { campaignName: campaign[0].name }),
			};
			await Chat.updateOne(
				{ messageId: data.messageId },
				{ $set: data },
				{ upsert: true },
			);
			await ChatsTemp.updateOne(
				{ messageId: data.messageId },
				{ $set: data },
				{ upsert: true },
			);
		}

		await TempMessage.deleteMany({});
		console.log("Temp messages processed and cleared.");
	} catch (error) {
		console.error("Error processing temp messages:", error);
	}
};

export const processTempTemplateRejections = async () => {
	try {
		const tempRejections = await TempTemplateRejection.find().toArray();
		for (const temp of tempRejections) {
			await Template.updateOne(
				{ template_id: String(temp.templateId) },
				{
					$set: {
						status: "Rejected",
						rejected_reason: temp.rejectedReason,
					},
					$push: { logs: temp.rawData },
				},
			);
		}
		// await TempTemplateRejection.deleteMany({});
		console.log("Temp template rejections processed and cleared.");
	} catch (error) {
		console.error("Error processing temp template rejections:", error);
	}
};

export const processChatsToChatsUsers = async () => {
	try {
		const chats = await ChatsTemp.find().sort({ updatedAt: -1 }).toArray();

		for (const chat of chats) {
			const existingEntry = await ChatsUsers.findOne({
				FB_PHONE_ID: chat.FB_PHONE_ID,
				wa_id: chat.recipientPhone,
			});

			// Normalize incoming agent into an array
			const incomingAgents = Array.isArray(chat.agent)
				? chat.agent
				: [chat.agent];

			// Base update data for timestamps & last messages
			const baseSet = {
				updatedAt: chat.updatedAt,
				lastMessage:
					chat.replyContent || chat.textSent || chat.messageTemplate,
			};

			if (chat.status === "REPLIED") {
				baseSet.lastReceive = chat.updatedAt;
				baseSet.messageStatus = "REPLIED";
			} else {
				baseSet.lastSend = chat.updatedAt;
			}

			if (existingEntry) {
				// Push new agents onto the existing array (avoid dupes with $addToSet if desired)
				await ChatsUsers.updateOne(
					{ _id: existingEntry._id },
					{
						$set: baseSet,
						// Choose one:
						// $push: { agent: { $each: incomingAgents } }
						$addToSet: { agent: { $each: incomingAgents } },
					},
				);
				console.log("Appended agents to entry _id:", existingEntry._id);
			} else {
				// First time: create with agent array
				const newEntry = {
					FB_PHONE_ID: chat.FB_PHONE_ID,
					useradmin: chat.useradmin,
					unique_id: chat.unique_id,
					contactName: chat.contactName,
					campaignId: chat.campaignId || "",
					wa_id: chat.recipientPhone,
					createdAt: chat.createdAt,
					updatedAt: chat.updatedAt,
					lastMessage: baseSet.lastMessage,
					lastSend: chat.status === "REPLIED" ? 0 : chat.updatedAt,
					lastReceive: chat.status === "REPLIED" ? chat.updatedAt : 0,
					messageStatus: chat.status,
					agent: incomingAgents,
				};
				await ChatsUsers.create(newEntry);
				console.log("Created new entry with agents:", incomingAgents);
			}
		}

		console.log(
			"Processed and cleared temporary chats at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing chat cron job:", error);
	}
};

export const processAllTempEvents = async () => {
	await connectDB();
	const db = mongoose.connection.db;
	TempStatus = db.collection("tempstatuses");
	// console.log(TempStatus);
	Reports = db.collection("campaignreports");
	// console.log(Reports);
	User = db.collection("users");
	// console.log(User);
	Campaign = db.collection("campaigns");
	// console.log(Campaign);
	TempMessage = db.collection("tempmessages");
	// console.log(TempMessage);
	Chat = db.collection("chats");
	// console.log(Chat);
	ChatsTemp = db.collection("chatstemps");
	ChatsUsers = db.collection("chatsusers");
	Contacts = db.collection("contacts");
	// console.log(Contacts);
	TempTemplateRejection = db.collection("temptemplaterejections");
	// console.log(TempTemplateRejection);
	Template = db.collection("templates");
	// console.log(Template);
	await processTempStatuses();
	await processTempMessages();
	await processTempTemplateRejections();
	await processChatsToChatsUsers();
	mongoose.connection.close();
};

// processAllTempEvents();

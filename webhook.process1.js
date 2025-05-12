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
	addedUser,
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

// export const processTempMessages = async () => {
// 	try {
// 		const tempMessages = await TempMessage.find().toArray();

// 		const agentUser = await addedUser.find({ roleId: "UnAssignedChats" });

// 		let allAgent = {};

// 		for (const agent of agentUser) {
// 			const admin = agent.useradmin;
// 			const uniqueId = agent.unique_id;

// 			if (allAgent.hasOwnProperty(admin)) {
// 				allAgent[admin].push(uniqueId);
// 			} else {
// 				allAgent[admin] = [uniqueId];
// 			}
// 		}

// 		const WabaUser = await User.find();

// 		let wabaAgent = {};

// 		for (const wabarow of WabaUser) {
// 			const wabaID = wabarow.WABA_ID;
// 			wabaAgent[wabaID] = {
// 				unique_id: wabarow.unique_id,
// 				WABA_ID: wabarow.WABA_ID,
// 			};
// 		}
// 		let messagedata = {};
// 		let finaldata = {};

// 		for (const temp of tempMessages) {
// 			const from = temp["from"];
// 			const fbPhoneId = temp["fbPhoneId"];
// 			const wabaId = temp["wabaId"];
// 			const keydata = from + "_" + fbPhoneId + "_" + wabaId;
			
// 			const filter = {
// 				FB_PHONE_ID: fbPhoneId,
// 				wa_id: from,
// 				wabaId: wabaId,
// 			};

// 			// You can now use `filter` here (e.g., for a database query)
// 			console.log(filter);

// 			// Handle message details
// 			let keyst = 1;
// 			let lastmessage = "";
// 			let lastmessagetime = 0;
// 			let lastreplay = 0;

// 			if ("status" in temp) {
// 				keyst = 0;
// 				if (temp["status"] === "sent") {
// 					keyst = 2;
// 					lastmessagetime = temp["timestamp"];
// 					lastmessage = temp["text"]["body"];
// 				}
// 			}

// 			if (keyst === 1) {
// 				lastmessagetime = temp["timestamp"];
// 				lastmessage = temp["text"]["body"];
// 				lastreplay = temp["timestamp"];
// 			}

// 			messagedata[keydata] = {
// 				data: temp,
// 				lastmessagetime: lastmessagetime,
// 				lastmessage: lastmessage,
// 				lastreplay: lastreplay,
// 			};
// 		}

// 		const bulkOps = Object.entries(finaldata).map(
// 			([keydata, { wabaId, number }]) => {
// 				// Decompose your composite key back into its parts:
// 				// keydata = `${from}_${fbPhoneId}_${wabaId}`
// 				const [, fbPhoneId] = keydata.split("_");

// 				// Grab the latest message details you computed
// 				const { lastmessage, lastmessagetime, lastreplay } =
// 					messagedata[keydata];

// 				// Determine the useradmin from your wabaAgent map
// 				const useradmin = wabaAgent[wabaId]?.unique_id;

// 				return {
// 					updateOne: {
// 						filter: {
// 							FB_PHONE_ID: fbPhoneId,
// 							wa_id: { $in: number },
// 							useradmin,
// 						},
// 						update: {
// 							$set: {
// 								updatedAt: Date.now(),
// 								lastMessage: lastmessage,
// 								// if it was a reply, lastReceive should be set; else lastSend
// 								...(lastreplay > lastmessagetime
// 									? {
// 											lastReceive: lastreplay,
// 											messageStatus: "REPLIED",
// 									  }
// 									: {
// 											lastSend: lastmessagetime,
// 											messageStatus: "SENT",
// 									  }),
// 							},
// 							$addToSet: {
// 								// add *all* distinct numbers as wa_id
// 								wa_id: { $each: number },
// 							},
// 						},
// 						upsert: true,
// 					},
// 				};
// 			},
// 		);

// 		if (bulkOps.length) {
// 			const result = await ChatsUsers.bulkWrite(bulkOps);
// 			console.log(
// 				`✅ ChatsUsers bulkWrite: ${result.modifiedCount} modified, ${result.upsertedCount} upserted`,
// 			);
// 		} else {
// 			console.log("ℹ️ No ChatsUsers updates needed");
// 		}

// 	} catch (error) {
// 		console.error("Error processing temp messages (bulk):", error);
// 	}
// };

export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find().toArray();
		if (!tempMessages.length)
			return console.log("No temp messages to process");

		const agentUsers = await addedUser
			.find({ roleId: "UnAssignedChats" })
			.toArray();

		const allAgent = agentUsers.reduce((map, u) => {
			(map[u.useradmin] ||= []).push(u.unique_id);
			return map;
		}, {});

		const allUsers = await User.find(
			{},
			{ projection: { unique_id: 1, WABA_ID: 1, FB_PHONE_NUMBERS: 1 } },
		).toArray();

		const wabaAgent = {};
		for (const u of allUsers) {
			wabaAgent[u.WABA_ID] = u.unique_id;
		}

		const convoMap = tempMessages.reduce((acc, m) => {
			const key = `${m.from}_${m.fbPhoneId}_${m.wabaId}`;
			if (!acc[key]) {
				acc[key] = {
					lastTime: 0,
					lastReplay: 0,
					lastMsg: "",
					status: "",
					messages: [],
				};
			}
			const rec = acc[key];
			rec.messages.push(m);
			rec.status = m.status;
			rec.name = m.name;

			if (m.status === "sent") {
				rec.lastTime = m.timestamp;
				rec.lastMsg = m.text?.body || "";
			} else {
				rec.lastTime = m.timestamp;
				rec.lastReplay = m.timestamp;
				rec.lastMsg = m.text?.body || "";
			}
			return acc;
		}, {});

		const cuOps = Object.entries(convoMap).map(([keydata, info]) => {
			const [wa_id, fbPhoneId, wabaId] = keydata.split("_");
			const useradmin = wabaAgent[ wabaId ];
			
			console.log(wa_id, info.lastMsg)
			return {
				updateOne: {
					filter: { FB_PHONE_ID: fbPhoneId, useradmin, wa_id },
					update: {
						$set: {
							wa_id,
							lastMessage: info.lastMsg,
							...(info.lastReplay > info.lastTime
								? {
										lastReceive: info.lastReplay,
										messageStatus: "REPLIED",
								  }
								: {
										lastSend: info.lastTime,
										messageStatus: "SENT",
								  }),
						},
						$addToSet: {
							agent: {
								$each: Array.isArray(allAgent[useradmin])
									? allAgent[useradmin]
									: [],
							},
						},
						$setOnInsert: {
							unique_id: generateUniqueId(),
							contactName: [info.name],
						},
					},
					upsert: true,
				},
			};
		});

		if (cuOps.length) {
			const result = await ChatsUsers.bulkWrite(cuOps);
			console.log(
				`ChatsUsers: ${result.modifiedCount} modified, ${result.upsertedCount} upserted`,
			);
			if (result.upsertedCount > 0) {
				console.log("🆕 Upserted IDs:", result.upsertedIds);
			}
		} else {
			console.log("No ChatsUsers updates needed");
		}

		// 🔥 Delete only processed messages
		const processedIds = tempMessages.map((m) => m._id);
		if (processedIds.length) {
			await TempMessage.deleteMany({ _id: { $in: processedIds } });
			console.log(
				`🧹 Deleted ${processedIds.length} processed temp messages`,
			);
		}

		console.log("✔️ processTempMessages complete");
	} catch (err) {
		console.error("Error in processTempMessages:", err);
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

// export const processChatsToChatsUsers = async () => {
// 	try {
// 		const chats = await ChatsTemp.find().sort({ updatedAt: 1 }).toArray();

// 		if (!chats.length) {
// 			console.log("No chats found to process.");
// 			return;
// 		}

// 		const bulkOps = [];

// 		for (const chat of chats) {
// 			const filter = {
// 				FB_PHONE_ID: chat.FB_PHONE_ID,
// 				wa_id: chat.recipientPhone,
// 			};

// 			const incomingAgents = Array.isArray(chat.agent)
// 				? chat.agent
// 				: chat.agent
// 				? [chat.agent]
// 				: [];

// 			const baseSet = {
// 				updatedAt: chat.updatedAt,
// 				lastMessage:
// 					chat.replyContent ||
// 					chat.textSent ||
// 					chat.messageTemplate ||
// 					chat.media_type,
// 			};

// 			if (chat.status === "REPLIED") {
// 				baseSet.lastReceive = chat.updatedAt;
// 				baseSet.messageStatus = "REPLIED";
// 			} else {
// 				baseSet.lastSend = chat.updatedAt;
// 			}

// 			const update = {
// 				$set: baseSet,
// 				$addToSet: { agent: { $each: incomingAgents } },
// 			};

// 			bulkOps.push({
// 				updateOne: {
// 					filter,
// 					update,
// 					upsert: true,
// 				},
// 			});
// 		}

// 		if (bulkOps.length) {
// 			await ChatsUsers.bulkWrite(bulkOps);
// 			console.log(`Bulk processed ${bulkOps.length} chats ✅`);
// 		}

// 		await ChatsTemp.deleteMany({});
// 		console.log("🧹 Deleted processed temp chats");

// 		console.log("All done at", new Date().toLocaleString());
// 	} catch (error) {
// 		console.error("Error in bulk chat processing:", error);
// 	}
// };

export const processAllTempEvents = async () => {
	await connectDB();
	const db = mongoose.connection.db;
	TempStatus = db.collection("tempstatuses");
	Reports = db.collection("campaignreports");
	User = db.collection("users");
	Campaign = db.collection("campaigns");
	TempMessage = db.collection("tempmessages");
	Chat = db.collection("chats");
	addedUser = db.collection("addedusers");
	ChatsTemp = db.collection("chatstemps");
	ChatsUsers = db.collection("chatsusers");
	Contacts = db.collection("contacts");
	TempTemplateRejection = db.collection("temptemplaterejections");
	Template = db.collection("templates");
	
	await processTempMessages();
	await processTempTemplateRejections();
	await processTempStatuses();
	// await processChatsToChatsUsers();
};

if (process.argv[1] === __filename) {
	processAllTempEvents();
}

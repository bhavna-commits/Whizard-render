import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

dotenv.config();

export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

let TempStatus,
	Reports,
	User,
	Campaign,
	TempMessage,
	Chat,
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
		const processedIds = [];

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

			processedIds.push(temp._id);
		}

		if (bulkChatOps.length) await Chat.bulkWrite(bulkChatOps);
		if (bulkReportOps.length) await Reports.bulkWrite(bulkReportOps);

		if (processedIds.length) {
			await TempStatus.deleteMany({ _id: { $in: processedIds } });
			console.log(
				`🧹 Deleted ${processedIds.length} processed temp statuses`,
			);
		}

		console.log("Bulk processed temp statuses.");
	} catch (error) {
		console.error("Error processing temp statuses (bulk):", error);
	}
};

export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find().toArray();
		if (!tempMessages.length)
			return console.log("No temp messages to process");

		const agentUsers = await addedUser
			.find({ roleId: "UnAssignedChats", deleted: false })
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
				rec.lastSent = m.timestamp;
				rec.lastMsg = m.text?.body || "";
			} else {
				rec.lastReceive = m.timestamp;
				rec.lastMsg = m.text?.body || "";
			}
			return acc;
		}, {});

		const cuOps = Object.entries(convoMap).map(([keydata, info]) => {
			const [wa_id, fbPhoneId, wabaId] = keydata.split("_");
			const useradmin = wabaAgent[wabaId];
			const supportAgents = Array.isArray(allAgent[useradmin])
				? allAgent[useradmin]
				: [];

			const uniqueId = generateUniqueId();

			return {
				updateOne: {
					filter: { FB_PHONE_ID: fbPhoneId, useradmin, wa_id },
					update: [
						{
							$set: {
								wa_id: wa_id,
								lastMessage: info.lastMsg,
								lastReceive: info.lastReceive
									? info.lastReceive
									: "$lastReceive",
								lastSend: info.lastSent
									? info.lastSent
									: "$lastSend",
								messageStatus: info.lastReceive
									? "REPLIED"
									: "SENT",
							},
						},
						{
							$set: {
								supportAgent: {
									$cond: {
										if: {
											$eq: [
												{
													$size: {
														$ifNull: ["$agent", []],
													},
												},
												0,
											],
										},
										then: {
											$setUnion: [
												{
													$ifNull: [
														"$supportAgent",
														[],
													],
												},
												supportAgents,
											],
										},
										else: "$supportAgent",
									},
								},
							},
						},
						{
							$set: {
								unique_id: {
									$cond: {
										if: { $not: ["$_id"] },
										then: uniqueId,
										else: "$unique_id",
									},
								},
								contactName: {
									$cond: {
										if: { $not: ["$_id"] },
										then: [info.name],
										else: "$contactName",
									},
								},
							},
						},
					],
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

		// 🔥 Clean up processed messages
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

		if (tempRejections.length) {
			const idsToDelete = tempRejections.map((t) => t._id);
			await TempTemplateRejection.deleteMany({
				_id: { $in: idsToDelete },
			});
			console.log(
				`🧹 Deleted ${idsToDelete.length} processed template rejections`,
			);
		}

		console.log("Bulk processed template rejections.");
	} catch (error) {
		console.error("Error processing template rejections (bulk):", error);
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
	addedUser = db.collection("addedusers");
	ChatsUsers = db.collection("chatsusers");
	TempTemplateRejection = db.collection("temptemplaterejections");
	Template = db.collection("templates");

	await processTempMessages();
	await processTempTemplateRejections();
	await processTempStatuses();
};

if (process.argv[1] === __filename) {
	processAllTempEvents();
}

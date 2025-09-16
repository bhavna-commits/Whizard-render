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
	TempStatusBackUp,
	User,
	TempMessage,
	TempMessageBackUp,
	Chat,
	AddedUser,
	TempTemplateRejection,
	TempTemplateRejectionBackUp,
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

const makeLimiter = (max) => {
	let active = 0;
	const queue = [];
	return async (fn) => {
		if (active >= max) await new Promise((res) => queue.push(res));
		active++;
		try {
			return await fn();
		} finally {
			active--;
			if (queue.length) queue.shift()();
		}
	};
};

const flushBulk = async (collection, ops, ordered = false) => {
	if (!ops.length) return { acknowledged: true, n: 0 };
	try {
		const res = await collection.bulkWrite(ops, { ordered });
		ops.length = 0;
		return res;
	} catch (err) {
		console.error("bulkWrite error:", err);
		ops.length = 0;
		return { error: err };
	}
};

export const processTempStatuses = async () => {
	try {
		const BATCH_READ = 2000;
		const BULK_SIZE = 1000;
		const cursor = TempStatus.find(
			{},
			{
				projection: {
					_id: 1,
					messageId: 1,
					status: 1,
					timestamp: 1,
					recipientPhone: 1,
					error: 1,
				},
			},
		)
			.sort({ createdAt: -1 })
			.batchSize(BATCH_READ);
		const bulkChatOps = [];
		const backupBatch = [];
		const deleteIds = [];

		for await (const temp of cursor) {
			if (temp.status === "SENT") {
				deleteIds.push(temp._id);
				backupBatch.push(temp);
				if (deleteIds.length >= BULK_SIZE) {
					await TempStatusBackUp.insertMany(backupBatch, {
						ordered: false,
					});
					await TempStatus.deleteMany({ _id: { $in: deleteIds } });
					backupBatch.length = 0;
					deleteIds.length = 0;
				}
				continue;
			}

			const updateFields = {
				status: temp.status,
				updatedAt: temp.timestamp,
				recipientPhone: temp.recipientPhone,
			};

			if (
				temp.status === "FAILED" &&
				Array.isArray(temp.error) &&
				temp.error.length
			) {
				const { code, title } = temp.error[0] || {};
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

			backupBatch.push(temp);
			deleteIds.push(temp._id);

			if (bulkChatOps.length >= BULK_SIZE)
				await flushBulk(Chat, bulkChatOps, false);
			if (backupBatch.length >= BULK_SIZE) {
				await TempStatusBackUp.insertMany(backupBatch, {
					ordered: false,
				});
				await TempStatus.deleteMany({ _id: { $in: deleteIds } });
				backupBatch.length = 0;
				deleteIds.length = 0;
			}
		}

		await flushBulk(Chat, bulkChatOps);
		if (backupBatch.length) {
			await TempStatusBackUp.insertMany(backupBatch, { ordered: false });
			await TempStatus.deleteMany({ _id: { $in: deleteIds } });
		}

		console.log("✔️ Bulk processed temp statuses complete.");
	} catch (error) {
		console.error("Error processing temp statuses (bulk):", error);
	}
};

export const processTempTemplateRejections = async () => {
	try {
		const BATCH_READ = 2000;
		const BULK_SIZE = 1000;
		const cursor = TempTemplateRejection.find(
			{},
			{ projection: { _id: 1, templateId: 1, rejectedReason: 1 } },
		).batchSize(BATCH_READ);
		const templateOps = [];
		const backupBatch = [];
		const deleteIds = [];

		for await (const temp of cursor) {
			templateOps.push({
				updateOne: {
					filter: { template_id: String(temp.templateId) },
					update: {
						$set: {
							status: "Rejected",
							rejected_reason: temp.rejectedReason,
						},
					},
				},
			});
			backupBatch.push(temp);
			deleteIds.push(temp._id);

			if (templateOps.length >= BULK_SIZE)
				await flushBulk(Template, templateOps, false);
			if (backupBatch.length >= BULK_SIZE) {
				await TempTemplateRejectionBackUp.insertMany(backupBatch, {
					ordered: false,
				});
				await TempTemplateRejection.deleteMany({
					_id: { $in: deleteIds },
				});
				backupBatch.length = 0;
				deleteIds.length = 0;
			}
		}

		await flushBulk(Template, templateOps);
		if (backupBatch.length) {
			await TempTemplateRejectionBackUp.insertMany(backupBatch, {
				ordered: false,
			});
			await TempTemplateRejection.deleteMany({ _id: { $in: deleteIds } });
		}

		console.log("Bulk processed template rejections.");
	} catch (error) {
		console.error("Error processing template rejections (bulk):", error);
	}
};

export const processTempMessages = async () => {
	try {
		const BATCH_READ = 3000;
		const BULK_SIZE = 800;
		const cursor = TempMessage.find(
			{},
			{
				projection: {
					_id: 1,
					from: 1,
					fbPhoneId: 1,
					wabaId: 1,
					name: 1,
					status: 1,
					timestamp: 1,
					text: 1,
					messageId: 1,
				},
			},
		).batchSize(BATCH_READ);

		const addedUsersPromise = AddedUser.find(
			{ roleId: "UnAssignedChats" },
			{ projection: { useradmin: 1, unique_id: 1 } },
		).toArray();
		const wabaUsersPromise = User.find(
			{},
			{ projection: { WABA_ID: 1, unique_id: 1 } },
		).toArray();

		const [agentUser, WabaUser] = await Promise.all([
			addedUsersPromise,
			wabaUsersPromise,
		]);

		const allAgent = {};
		for (const a of agentUser) {
			const admin = a.useradmin;
			const uniqueId = a.unique_id;
			if (!allAgent[admin]) allAgent[admin] = [];
			allAgent[admin].push(uniqueId);
		}

		const wabaAgent = {};
		for (const w of WabaUser) {
			wabaAgent[w.WABA_ID] = {
				unique_id: w.unique_id,
				WABA_ID: w.WABA_ID,
			};
		}

		const limitFind = makeLimiter(10);
		const bulkChatsUsersOps = [];
		const bulkChatOps = [];
		const insertChatsUsers = [];
		const backupBatch = [];
		const deleteIds = [];

		const messagedata = new Map();
		const allreplay = {};
		const allmessageidsByFb = {};

		let processedCount = 0;

		for await (const temp of cursor) {
			backupBatch.push(temp);
			deleteIds.push(temp._id);

			const from = temp.from;
			const fbPhoneId = temp.fbPhoneId;
			const wabaId = temp.wabaId;
			const wabaUserAdmin = wabaAgent[wabaId]?.unique_id;

			const keydata = `${from}_${fbPhoneId}_${wabaUserAdmin}`;
			const wabaKey = `${fbPhoneId}_${wabaUserAdmin}`;

			const fdata = messagedata.get(keydata) || {
				data: temp,
				lastmessagetime: 0,
				lastmessage: "",
				lastreplay: 0,
				messageStatus: "",
			};

			let keyst = 1;
			let lastmessage = "";
			let lastmessagetime = 0;
			let lastreplay = 0;
			let messageStatus = "";

			if ("status" in temp && temp.status === "sent") {
				keyst = 2;
				lastmessagetime = temp.timestamp;
				lastmessage = temp.text?.body || temp.text;
				messageStatus = "SENT";
			}

			if (keyst === 1) {
				lastmessage = temp.text?.body || temp.text;
				lastreplay = temp.timestamp;
				messageStatus = "REPLIED";
				if (!(keydata in allreplay))
					allreplay[keydata] = temp.messageId;
				if (!allmessageidsByFb[fbPhoneId])
					allmessageidsByFb[fbPhoneId] = [];
				allmessageidsByFb[fbPhoneId].push(temp.messageId);
			}

			fdata.data = temp;
			fdata.lastmessagetime = Math.max(
				fdata.lastmessagetime || 0,
				lastmessagetime || 0,
			);
			fdata.lastmessage = lastmessage || fdata.lastmessage;
			fdata.lastreplay = Math.max(fdata.lastreplay || 0, lastreplay || 0);
			fdata.messageStatus = messageStatus || fdata.messageStatus;

			messagedata.set(keydata, fdata);

			if (backupBatch.length >= BULK_SIZE) {
				try {
					await TempMessageBackUp.insertMany(backupBatch, {
						ordered: false,
					});
				} catch (e) {
					console.warn(
						"Some duplicate messages were skipped during backup",
					);
				}
				await TempMessage.deleteMany({ _id: { $in: deleteIds } });
				backupBatch.length = 0;
				deleteIds.length = 0;
			}

			processedCount++;
			if (processedCount % 5000 === 0) {
				const keys = Array.from(messagedata.keys());
				await handleChunk(keys.splice(0, 5000));
			}
		}

		const remainingKeys = Array.from(messagedata.keys());
		if (remainingKeys.length) await handleChunk(remainingKeys);

		if (bulkChatsUsersOps.length)
			await flushBulk(ChatsUsers, bulkChatsUsersOps, false);
		if (bulkChatOps.length) await flushBulk(Chat, bulkChatOps, false);
		if (insertChatsUsers.length)
			await ChatsUsers.insertMany(insertChatsUsers, { ordered: false });

		if (backupBatch.length) {
			try {
				await TempMessageBackUp.insertMany(backupBatch, {
					ordered: false,
				});
			} catch (e) {
				console.warn(
					"Some duplicate messages were skipped during final backup",
				);
			}
			await TempMessage.deleteMany({ _id: { $in: deleteIds } });
		}

		async function handleChunk(chunkKeys) {
			const groupedByWabaFb = new Map();
			for (const key of chunkKeys) {
				const data = messagedata.get(key);
				const m = data.data;
				const fbPhoneId = m.fbPhoneId;
				const wabaUserAdmin = wabaAgent[m.wabaId]?.unique_id;
				const groupKey = `${fbPhoneId}_${wabaUserAdmin}`;
				if (!groupedByWabaFb.has(groupKey))
					groupedByWabaFb.set(groupKey, {
						fbPhoneId,
						wabaUserAdmin,
						numbers: new Set(),
					});
				groupedByWabaFb.get(groupKey).numbers.add(m.from);
			}

			const fetchPromises = [];
			for (const [gk, v] of groupedByWabaFb.entries()) {
				const filter = {
					FB_PHONE_ID: v.fbPhoneId,
					useradmin: v.wabaUserAdmin,
					wa_id: { $in: Array.from(v.numbers) },
				};
				const p = limitFind(() =>
					ChatsUsers.find(filter).toArray(),
				).then((rows) => ({ gk, rows, v }));
				fetchPromises.push(p);
			}

			const results = await Promise.allSettled(fetchPromises);
			for (const res of results) {
				if (res.status !== "fulfilled") continue;
				const { rows, v } = res.value;
				for (const urow of rows) {
					const finalkey = `${urow.wa_id}_${urow.FB_PHONE_ID}_${urow.useradmin}`;
					if (!messagedata.has(finalkey)) continue;
					const finalupdaterow = messagedata.get(finalkey);
					let leftexit = 0;
					if (urow?.agent?.length > 0 || !urow?.agent) {
						if (urow.replyStatus === 0) {
							leftexit = 1;
							if (finalkey in allreplay) {
								const message_Id = allreplay[finalkey];
								bulkChatOps.push({
									updateOne: {
										filter: {
											messageId: message_Id,
											FB_PHONE_ID: urow.FB_PHONE_ID,
										},
										update: {
											$set: {
												campaignId: urow.campaignId,
												campaignName: urow.campaignName,
												useradmin: urow.useradmin,
												type: "Campaign",
											},
										},
									},
								});
							}
						}
						const message_IdAll =
							allmessageidsByFb[urow.FB_PHONE_ID];
						if (message_IdAll) {
							bulkChatOps.push({
								updateMany: {
									filter: {
										messageId: { $in: message_IdAll },
										FB_PHONE_ID: urow.FB_PHONE_ID,
									},
									update: {
										$set: { useradmin: urow.useradmin },
									},
								},
							});
						}
					}

					const finalup = {
						lastMessage: finalupdaterow.lastmessage,
						lastSend: finalupdaterow.lastmessagetime,
						messageStatus: finalupdaterow.messageStatus,
						updatedAt: finalupdaterow.lastmessagetime,
					};

					const existingLastReceive = urow?.lastReceive || 0;
					const newLastReplay = finalupdaterow.lastreplay || 0;
					if (newLastReplay > 0 || existingLastReceive === 0) {
						finalup.lastReceive = newLastReplay;
						finalup.updatedAt = newLastReplay;
					}
					if (leftexit == 1) finalup.replyStatus = 1;

					bulkChatsUsersOps.push({
						updateOne: {
							filter: {
								wa_id: urow.wa_id,
								FB_PHONE_ID: urow.FB_PHONE_ID,
								useradmin: urow.useradmin,
							},
							update: { $set: finalup },
						},
					});
					messagedata.delete(finalkey);
					if (bulkChatsUsersOps.length >= BULK_SIZE)
						await flushBulk(ChatsUsers, bulkChatsUsersOps, false);
					if (bulkChatOps.length >= BULK_SIZE)
						await flushBulk(Chat, bulkChatOps, false);
				}
			}

			const inserts = [];
			for (const remainingKey of chunkKeys) {
				if (!messagedata.has(remainingKey)) continue;
				const inrow = messagedata.get(remainingKey);
				const mdata = inrow.data;
				const uadmin = wabaAgent[mdata.wabaId]?.unique_id;
				const name = [mdata.name];
				let mstatus = "REPLIED";
				if (mdata.status === "sent") mstatus = "SENT";
				const supportagent = allAgent[uadmin] || [];
				inserts.push({
					supportAgent: supportagent,
					messageStatus: mstatus,
					contactName: name,
					wa_id: mdata.from,
					FB_PHONE_ID: mdata.fbPhoneId,
					useradmin: uadmin,
					lastMessage: inrow.lastmessage,
					lastReceive: inrow.lastreplay,
					lastSend: inrow.lastmessagetime,
					createdAt:
						inrow.lastmessagetime > 0
							? inrow.lastmessagetime
							: inrow.lastreplay,
					updatedAt:
						inrow.lastmessagetime > 0
							? inrow.lastmessagetime
							: inrow.lastreplay,
				});
				messagedata.delete(remainingKey);
				if (inserts.length >= BULK_SIZE) {
					await ChatsUsers.insertMany(inserts, { ordered: false });
					inserts.length = 0;
				}
			}
			if (inserts.length)
				await ChatsUsers.insertMany(inserts, { ordered: false });
		}
	} catch (e) {
		console.error("Error in processTempMessages:", e);
	}
};

export const processAllTempEvents = async () => {
	try {
		await connectDB();
		const db = mongoose.connection.db;

		TempStatus = db.collection("tempstatuses");
		TempStatusBackUp = db.collection("tempstatusebackups");
		User = db.collection("users");
		TempMessage = db.collection("tempmessages");
		TempMessageBackUp = db.collection("tempmessagebackups");
		Chat = db.collection("chats");
		ChatsUsers = db.collection("chatsusers");
		AddedUser = db.collection("addedusers");
		TempTemplateRejection = db.collection("temptemplaterejections");
		TempTemplateRejectionBackUp = db.collection(
			"temptemplaterejectionbackups",
		);
		Template = db.collection("templates");

		await processTempMessages();
		await processTempTemplateRejections();
		await processTempStatuses();

		console.log("All processing complete");
	} catch (error) {
		console.error("Error in processAllTempEvents:", error);
	} finally {
		await mongoose.disconnect();
		process.exit(0);
	}
};

if (process.argv[1] === __filename) {
	processAllTempEvents()
		.then(() => console.log("Script execution finished"))
		.catch((err) => {
			console.error("Script execution failed:", err);
			process.exit(1);
		});
}

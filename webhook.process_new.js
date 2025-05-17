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

export const processTempStatuses = async () => {
	try {
		const tempStatuses = await TempStatus.find()
			.sort({ createdAt: -1 })
			.toArray();

		if (!tempStatuses.length) {
			console.log("No temp statuses to process");
			return;
		}

		const bulkChatOps = [];
		const processedIds = [];

		for (const temp of tempStatuses) {
			if (temp.status === "SENT") continue;

			const updateFields = {
				status: temp.status,
				updatedAt: temp.timestamp,
				recipientPhone: temp.recipientPhone,
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

			processedIds.push(temp._id);
		}

		if (bulkChatOps.length) {
			const chatResult = await Chat.bulkWrite(bulkChatOps);
			console.log(
				`Chats updated: ${chatResult.modifiedCount}, upserted: ${chatResult.upsertedCount}`,
			);
		}

		if (tempStatuses.length) {
			const messagesToBackup = tempStatuses.map((msg) => {
				const { _id, ...rest } = msg;
				return rest;
			});
			await TempStatusBackUp.insertMany(messagesToBackup);
		}

		if (processedIds.length) {
			await TempStatus.deleteMany({ _id: { $in: processedIds } });
			console.log(
				`🧹 Deleted ${processedIds.length} processed temp statuses`,
			);
		}

		console.log("✔️ Bulk processed temp statuses complete.");
	} catch (error) {
		console.error("Error processing temp statuses (bulk):", error);
	}
};

export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find().toArray();

		const agentUser = await AddedUser.find({
			roleId: "UnAssignedChats",
		}).toArray();

		let allAgent = {};

		for (const agent of agentUser) {
			const admin = agent.useradmin;
			const uniqueId = agent.unique_id;

			if (allAgent.hasOwnProperty(admin)) {
				allAgent[admin].push(uniqueId);
			} else {
				allAgent[admin] = [uniqueId];
			}
		}

		const WabaUser = await User.find().toArray();

		let wabaAgent = {};

		for (const wabarow of WabaUser) {
			const wabaID = wabarow.WABA_ID;
			wabaAgent[wabaID] = {
				unique_id: wabarow.unique_id,
				WABA_ID: wabarow.WABA_ID,
			};
		}

		let messagedata = {};
		let finaldata = {};
		let allreplay = {};
		let allmessgaeids = {};

		for (const temp of tempMessages) {
			try {
				const from = temp["from"];
				const fbPhoneId = temp["fbPhoneId"];
				const wabaId = temp["wabaId"];
				const wabaUserAdmin = wabaAgent[wabaId]["unique_id"];

				const keydata = from + "_" + fbPhoneId + "_" + wabaUserAdmin;
				const wabaKay = fbPhoneId + "_" + wabaUserAdmin;
				const keydatawithnumber = keydata;

				if (wabaKay in finaldata) {
					const numberdata = finaldata[wabaKay]["number"];
					if (!numberdata.includes(from)) {
						numberdata.push(from);
					}
					finaldata[wabaKay] = {
						wabaUserAdmin: wabaUserAdmin,
						number: numberdata,
						fbPhoneId: fbPhoneId,
					};
				} else {
					finaldata[wabaKay] = {
						wabaUserAdmin: wabaUserAdmin,
						number: [from],
						fbPhoneId: fbPhoneId,
					};
				}

				let keyst = 1;
				let lastmessage = "";
				let lastmessagetime = 0;
				let lastreplay = 0;

				if ("status" in temp) {
					if (temp["status"] === "sent") {
						keyst = 2;
						lastmessagetime = temp["timestamp"];
						lastmessage = temp?.text?.body || temp["text"];
					}
				}

				if (keyst === 1) {
					lastmessage = temp?.text?.body || temp["text"];
					lastreplay = temp["timestamp"];

					if (!(keydatawithnumber in allreplay)) {
						allreplay[keydatawithnumber] = temp["messageId"];
					}

					if (fbPhoneId in allmessgaeids) {
						allmessgaeids[fbPhoneId].push(temp["messageId"]);
					} else {
						allmessgaeids[fbPhoneId] = [temp["messageId"]];
					}
				}

				messagedata[keydata] = {
					data: temp,
					lastmessagetime: lastmessagetime,
					lastmessage: lastmessage,
					lastreplay: lastreplay,
				};
			} catch (e) {
				console.error(
					"Error processing tempMessages to ChatUsers :",
					e,
				);
			}
		}

		let bulkOps = [];
		let bulkOpsChat = [];

		for (const key in finaldata) {
			const tempnumber = finaldata[key];

			const filter = {
				FB_PHONE_ID: tempnumber.fbPhoneId,
				wa_id: { $in: tempnumber.number },
				useradmin: tempnumber.wabaUserAdmin,
			};

			const users = await ChatsUsers.find(filter).toArray();

			for (const urow of users) {
				let finalkey =
					urow.wa_id + "_" + urow.FB_PHONE_ID + "_" + urow.useradmin;

				if (finalkey in messagedata) {
					const finalupdaterow = messagedata[finalkey];
					const FB_PHONE_ID = urow.FB_PHONE_ID;
					const useradmin = urow.useradmin;
					let leftexit = 0;

					if (urow?.agent?.length > 0 || !urow?.agent) {
						if (urow.replyStatus === 0) {
							leftexit = 1;
							if (finalkey in allreplay) {
								const message_Id = allreplay[finalkey];

								bulkOpsChat.push({
									updateOne: {
										filter: {
											messageId: message_Id,
											FB_PHONE_ID: FB_PHONE_ID,
										},
										update: {
											$set: {
												campaignId: urow.campaignId,
												campaignName: urow.campaignName,
												useradmin: useradmin,
											},
										},
									},
								});
							}
						}
						const message_IdAll = allmessgaeids[FB_PHONE_ID];

						if (message_IdAll) {
							bulkOpsChat.push({
								updateMany: {
									filter: {
										messageId: { $in: message_IdAll },
										FB_PHONE_ID: FB_PHONE_ID,
									},
									update: {
										$set: {
											useradmin: useradmin,
										},
									},
								},
							});
						}
					}

					let updateleft = {
						lastMessage: finalupdaterow.lastmessage,
						lastSend: finalupdaterow.lastmessagetime,
					};

					const existingLastReceive = urow?.lastReceive || 0;
					const newLastReplay = finalupdaterow.lastreplay || 0;

					if (newLastReplay > 0 || existingLastReceive === 0) {
						updateleft.lastReceive = newLastReplay;
					}

					if (leftexit == 1) {
						updateleft["replyStatus"] = 1;
					}

					bulkOps.push({
						updateOne: {
							filter: {
								wa_id: urow.wa_id,
								FB_PHONE_ID: urow.FB_PHONE_ID,
								useradmin: urow.useradmin,
							},
							update: {
								$set: updateleft,
							},
						},
					});

					delete messagedata[finalkey];
				}
			}
		}

		let insertall = [];
		for (const remaininsert in messagedata) {
			const inrow = messagedata[remaininsert];
			const mdata = inrow["data"];
			const uadmin = wabaAgent[mdata["wabaId"]]["unique_id"];
			const name = [mdata["name"]];
			let mstatus = "SENT";
			if (mdata["status"] === "received") {
				mstatus = "REPLIED";
			}
			const supportagent = allAgent[uadmin] || [];

			insertall.push({
				supportAgent: supportagent,
				messageStatus: mstatus,
				contactName: name,
				wa_id: mdata.from,
				FB_PHONE_ID: mdata.fbPhoneId,
				useradmin: uadmin,
				lastMessage: inrow.lastmessage,
				lastReceive: inrow.lastreplay,
				lastSend: inrow.lastmessagetime,
			});
		}

		if (insertall.length > 0) {
			await ChatsUsers.insertMany(insertall);
		}

		if (bulkOps.length > 0) {
			await ChatsUsers.bulkWrite(bulkOps);
		}

		if (bulkOpsChat.length > 0) {
			await Chat.bulkWrite(bulkOpsChat);
		}

		if (tempMessages.length) {
			const messagesToBackup = tempMessages.map((msg) => {
				const { _id, ...rest } = msg;
				return rest;
			});

			await TempMessageBackUp.insertMany(messagesToBackup);
			console.log(
				`✅ Backed up ${messagesToBackup.length} temp messages`,
			);
		}
		const processedIds = tempMessages.map((m) => m._id);
		if (processedIds.length) {
			await TempMessage.deleteMany({ _id: { $in: processedIds } });
			console.log(
				`🧹 Deleted ${processedIds.length} processed temp messages`,
			);
		}
	} catch (e) {
		console.error("Error in processTempMessages:", e);
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

			const rejectionsToBackup = tempRejections.map((msg) => {
				const { _id, ...rest } = msg;
				return rest;
			});
			await TempTemplateRejectionBackUp.insertMany(rejectionsToBackup);
			console.log(
				`✅ Backed up ${rejectionsToBackup.length} rejection records`,
			);
		}

		console.log("Bulk processed template rejections.");
	} catch (error) {
		console.error("Error processing template rejections (bulk):", error);
	}
};

export const processAllTempEvents = async () => {
	try {
		await connectDB();
		const db = mongoose.connection.db;

		// Initialize collections
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

		// Process all events
		await processTempMessages();
		await processTempTemplateRejections();
		await processTempStatuses();

		console.log("All processing complete");
	} catch (error) {
		console.error("Error in processAllTempEvents:", error);
	} finally {
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

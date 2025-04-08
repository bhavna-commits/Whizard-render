import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";

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
	ChatsTemp,
	Contacts,
	TempTemplateRejection,
	Template;

// const connectDB = async () => {
// 	try {
// 		await mongoose.connect(process.env.MONGO_URI, {
// 			useNewUrlParser: true,
// 			useUnifiedTopology: true,
// 		});
// 		console.log("MongoDB Connected...");
// 	} catch (err) {
// 		console.error("Error connecting to MongoDB:", err.message);
// 		process.exit(1);
// 	}
// };

export const processTempStatuses = async () => {
	try {
		const tempStatuses = await TempStatus.find().toArray();
		// console.log(tempStatuses);
		for (const temp of tempStatuses) {
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
			// console.log(contactName);
			// console.log(temp.type, temp.text?.body);
			const data = {
				WABA_ID: user.WABA_ID,
				useradmin: user.unique_id,
				unique_id: generateUniqueId(),
				messageId: temp.messageId,
				recipientPhone: temp.from,
				status: "REPLIED",
				updatedAt: temp.timestamp,
				contactName: contactName.Name,
				FB_PHONE_ID: temp.fbPhoneId,
				replyContent: temp.type === "text" ? temp.text?.body : "",
				media:
					temp.type !== "text" && temp.image
						? {
								url: temp.image.url || "",
								fileName: temp.image.fileName || "",
								caption: temp.text?.body || "",
						  }
						: {},
				type: "Chat",
				...(campaign[0] && { campaignId: campaign[0].unique_id }),
				...(campaign[0] && { campaignName: campaign[0].name }),
			};
			await Chat.insertOne(data);
			await ChatsTemp.insertOne(data);
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
		await TempTemplateRejection.deleteMany({});
		console.log("Temp template rejections processed and cleared.");
	} catch (error) {
		console.error("Error processing temp template rejections:", error);
	}
};

export const processAllTempEvents = async () => {
	// await connectDB();
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
	Contacts = db.collection("contacts");
	// console.log(Contacts);
	TempTemplateRejection = db.collection("temptemplaterejections");
	// console.log(TempTemplateRejection);
	Template = db.collection("templates");
	// console.log(Template);
	await processTempStatuses();
	await processTempMessages();
	await processTempTemplateRejections();
	// mongoose.connection.close();
};

// processAllTempEvents();

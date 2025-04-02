import TempStatus from "./src/models/TempStatus.model.js";
import TempMessage from "./src/models/TempMessage.model.js";
import TempTemplateRejection from "./src/models/TempTemplateRejection.model.js";

// Import your main models
import User from "./src/models/user.model.js";
import Campaign from "./src/models/campaign.model.js";
import Reports from "./src/models/campaignreport.model.js";
import Chat from "./src/models/chat.model.js";
import Template from "./src/models/template.model.js";

// Process Temp Statuses and update Reports
export const processTempStatuses = async () => {
	try {
		const tempStatuses = await TempStatus.find();

		for (const temp of tempStatuses) {
			// Retrieve the corresponding user using WABA id saved in the temp record
			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) {
				console.warn(
					`User with WABA_ID ${temp.wabaId} not found. Skipping messageId ${temp.messageId}.`,
				);
				continue;
			}

			// Retrieve the latest campaign for this user
			const campaign = await Campaign.findOne({
				useradmin: user.unique_id,
				deleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(1);

			// Prepare the update object
			const updateFields = {
				status: temp.status,
				updatedAt: temp.timestamp,
				recipientPhone: temp.recipientPhone,
				...(campaign && { campaignId: campaign.unique_id }),
			};

			// If the status is FAILED and error details exist, attach error details
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
				{
					$set: updateFields,
					$push: { logs: temp.rawData },
				},
				{ upsert: true },
			);
		}

		// Delete processed temp statuses
		await TempStatus.deleteMany({});
		console.log("Temp statuses processed and cleared.");
	} catch (error) {
		console.error("Error processing temp statuses:", error);
	}
};

// Process Temp Messages and insert Chat records
export const processTempMessages = async () => {
	try {
		const tempMessages = await TempMessage.find();

		for (const temp of tempMessages) {
			// Look up the user using wabaId from the temp message
			const user = await User.findOne({ WABA_ID: temp.wabaId });
			if (!user) {
				console.warn(
					`User with WABA_ID ${temp.wabaId} not found. Skipping messageId ${temp.messageId}.`,
				);
				continue;
			}

			// Retrieve the latest campaign for this user
			const campaign = await Campaign.findOne({
				useradmin: user.unique_id,
				deleted: false,
			})
				.sort({ createdAt: -1 })
				.limit(1);

			// Create a new Chat record with the temp message data
			await Chat.create({
				messageId: temp.messageId,
				recipientPhone: temp.from,
				status: "REPLIED", // or adjust logic as needed
				updatedAt: temp.timestamp,
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
				...(campaign && { campaignId: campaign.unique_id }),
				// Optionally, add additional fields if needed
			});
		}

		// Delete processed temp messages
		await TempMessage.deleteMany({});
		console.log("Temp messages processed and cleared.");
	} catch (error) {
		console.error("Error processing temp messages:", error);
	}
};

// Process Temp Template Rejections and update Templates
export const processTempTemplateRejections = async () => {
	try {
		const tempRejections = await TempTemplateRejection.find();

		for (const temp of tempRejections) {
			// If you store wabaId with the template rejection, you could optionally verify the correct user here
			// For now, we simply update the template by its id.
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

		// Delete processed temp template rejections
		await TempTemplateRejection.deleteMany({});
		console.log("Temp template rejections processed and cleared.");
	} catch (error) {
		console.error("Error processing temp template rejections:", error);
	}
};

// Run all processing tasks together
export const processAllTempEvents = async () => {
	await processTempStatuses();
	await processTempMessages();
	await processTempTemplateRejections();
};

processAllTempEvents();
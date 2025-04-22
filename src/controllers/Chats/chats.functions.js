import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import cron from "node-cron";
import fs from "fs";
import { getMimeType } from "./chats.extra.functions.js";
import ChatsTemp from "../../models/chatsTemp.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";
import { processAllTempEvents } from "../../../webhook.process.js";
import { updateContacts } from "../../../contactsUpdate cron.js";

dotenv.config();

export const uploadMedia = async (
	accessToken,
	phoneNumberId,
	filePath,
	mediaType,
	fileName,
) => {
	const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phoneNumberId}/media`;
	const formData = new FormData();

	// Get MIME type from file extension
	const mimeType = getMimeType(fileName); // Implement proper MIME type detection

	// Append file stream from provided file path
	formData.append("file", fs.createReadStream(filePath), {
		filename: fileName,
		contentType: mimeType,
	});

	formData.append("type", mediaType);
	formData.append("messaging_product", "whatsapp");

	const response = await axios.post(url, formData, {
		headers: {
			...formData.getHeaders(),
			Authorization: `Bearer ${accessToken}`,
		},
	});

	return response.data.id;
};

export const getMediaUrl = async (accessToken, mediaId) => {
	try {
		const url = `https://graph.facebook.com/v22.0/${mediaId}`;

		const response = await axios.get(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		// Check if the media URL is returned
		if (response.data && response.data.url) {
			return {
				success: true,
				url: response.data.url,
				mimeType: response.data.mime_type,
				fileSize: response.data.file_size,
				sha256: response.data.sha256,
			};
		} else {
			return {
				success: false,
				message: "Media URL not found",
			};
		}
	} catch (error) {
		console.error("Error retrieving media URL:", error);
		throw error.message || "Failed to retrieve media URL";
	}
};

export const sendMessage = async (accessToken, phoneNumberId, payload) => {
	const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phoneNumberId}/messages`;

	try {
		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		// Fetch API doesn't reject on HTTP errors like 4xx or 5xx
		// if (!res.ok) {
		// 	throw new Error(`HTTP error! status: ${res.status}`);
		// }

		const data = await res.json();

		if (data.error) {
			throw (
				data?.error?.error_user_msg ||
				data?.error?.error_user_title ||
				data?.error?.message
			);
		}
		console.log(data);
		return data;
	} catch (error) {
		console.error("Error sending message:", error);
	}
};

// cron.schedule("* * * * *", async () => {
// 	await processAllTempEvents();
// 	await updateContacts();
// 	try {
// 		const chats = await ChatsTemp.find().sort({ updatedAt: -1 });

// 		for (const chat of chats) {
// 			const existingEntry = await ChatsUsers.findOne({
// 				FB_PHONE_ID: chat.FB_PHONE_ID,
// 				wa_id: chat.recipientPhone,
// 			});

// 			// Normalize incoming agent into an array
// 			const incomingAgents = Array.isArray(chat.agent)
// 				? chat.agent
// 				: [chat.agent];

// 			// Base update data for timestamps & last messages
// 			const baseSet = {
// 				updatedAt: chat.updatedAt,
// 				lastMessage:
// 					chat.replyContent || chat.textSent || chat.messageTemplate,
// 			};

// 			if (chat.status === "REPLIED") {
// 				baseSet.lastReceive = chat.updatedAt;
// 				baseSet.messageStatus = "REPLIED";
// 			} else {
// 				baseSet.lastSend = chat.updatedAt;
// 			}

// 			if (existingEntry) {
// 				// Push new agents onto the existing array (avoid dupes with $addToSet if desired)
// 				await ChatsUsers.updateOne(
// 					{ _id: existingEntry._id },
// 					{
// 						$set: baseSet,
// 						// Choose one:
// 						// $push: { agent: { $each: incomingAgents } }
// 						$addToSet: { agent: { $each: incomingAgents } },
// 					},
// 				);
// 				console.log("Appended agents to entry _id:", existingEntry._id);
// 			} else {
// 				// First time: create with agent array
// 				const newEntry = {
// 					FB_PHONE_ID: chat.FB_PHONE_ID,
// 					useradmin: chat.useradmin,
// 					unique_id: chat.unique_id,
// 					contactName: chat.contactName,
// 					campaignId: chat.campaignId || "",
// 					wa_id: chat.recipientPhone,
// 					createdAt: chat.createdAt,
// 					updatedAt: chat.updatedAt,
// 					lastMessage: baseSet.lastMessage,
// 					lastSend: chat.status === "REPLIED" ? 0 : chat.updatedAt,
// 					lastReceive: chat.status === "REPLIED" ? chat.updatedAt : 0,
// 					messageStatus: chat.status,
// 					agent: incomingAgents,
// 				};
// 				await ChatsUsers.create(newEntry);
// 				console.log("Created new entry with agents:", incomingAgents);
// 			}
// 		}

// 		console.log(
// 			"Processed and cleared temporary chats at",
// 			new Date().toLocaleString(),
// 		);
// 	} catch (error) {
// 		console.error("Error processing chat cron job:", error);
// 	}
// });

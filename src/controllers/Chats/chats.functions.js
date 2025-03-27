import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";
import cron from "node-cron";
import fs from "fs";
import { getMimeType } from "./chats.extra.functions.js";
import ChatsTemp from "../../models/chatsTemp.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";

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
		return {
			success: false,
			message: error.message || "Failed to retrieve media URL",
		};
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

cron.schedule("* * * * *", async () => {
	try {
		// Retrieve all non-deleted chats sorted by createdAt descending (newest first)
		const chats = await ChatsTemp.find().sort({
			createdAt: -1,
		});

		console.log(chats);
		// Create a map for unique groups keyed by "FB_PHONE_ID-recipientPhone"
		const uniqueChats = new Map();
		chats.forEach((chat) => {
			// Use recipientPhone as wa_id
			const key = `${chat.FB_PHONE_ID}-${chat.recipientPhone}`;
			// Since chats are sorted descending, the first encountered per key is the latest
			if (!uniqueChats.has(key)) {
				uniqueChats.set(key, chat);
			}
		});

		// Process each unique chat group
		for (const [key, chat] of uniqueChats.entries()) {
			// Try to find an existing chat user entry for this combination
			const existingEntry = await ChatsUsers.findOne({
				FB_PHONE_ID: chat.FB_PHONE_ID,
				wa_id: chat.recipientPhone,
			});

			// Determine which fields to update:
			// - If status is "REPLIED", update lastReceive and set lastMessage to replyContent.
			// - Otherwise, update lastSend and set lastMessage to textSent.
			const updateData = {
				updatedAt: chat.updatedAt,
				lastMessage: chat.replyContent
					? chat.replyContent
					: chat.messageTemplate,
			};

			if (chat.status === "REPLIED") {
				updateData.lastReceive = chat.updatedAt;
			} else {
				updateData.lastSend = chat.updatedAt;
			}

			if (existingEntry) {
				// Update the existing entry with the new info
				const up = await ChatsUsers.updateOne(
					{ _id: existingEntry._id },
					{ $set: updateData },
				);
				console.log(up);
			} else {
				// Create a new entry if none exists
				const newEntry = {
					FB_PHONE_ID: chat.FB_PHONE_ID,
					useradmin: chat.useradmin,
					unique_id: chat.unique_id,
					contactName: chat.contactName,
					campaignId: chat.campaignId || "",
					wa_id: chat.recipientPhone,
					createdAt: chat.createdAt,
					updatedAt: chat.updatedAt,
					lastMessage: chat.replyContent || 
						 chat.textSent ||
						 chat.messageTemplate,
					lastSend: chat.status === "REPLIED" ? 0 : chat.updatedAt,
					lastReceive: chat.status === "REPLIED" ? chat.updatedAt : 0,
					messageStatus: chat.status,
				};
				await ChatsUsers.create(newEntry);
				console.log(newEntry);
			}
		}

		// After processing all records, delete them from ChatsTemp
		await ChatsTemp.deleteMany({});
		console.log(
			"Processed and cleared temporary chats at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing chat cron job:", error);
	}
});

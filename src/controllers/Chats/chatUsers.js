import ChatsTemp from "../../models/chatsTemp.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";

export const chatsUsers = async () => {
	try {
		// Retrieve all non-deleted chats sorted by createdAt descending (newest first)
		const chats = await ChatsTemp.find().sort({
			createdAt: -1,
		});

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
				lastMessage:
					chat.status === "REPLIED"
						? chat.replyContent
						: chat.textSent,
			};

			if (chat.status === "REPLIED") {
				updateData.lastReceive = chat.updatedAt;
			} else {
				updateData.lastSend = chat.updatedAt;
			}

			if (existingEntry) {
				// Update the existing entry with the new info
				await ChatsUsers.updateOne(
					{ _id: existingEntry._id },
					{ $set: updateData },
				);
			} else {
				// Create a new entry if none exists
				const newEntry = {
					FB_PHONE_ID: chat.FB_PHONE_ID,
					useradmin: chat.useradmin,
					unique_id: chat.unique_id,
					contactName: chat.contactName,
					wa_id: chat.recipientPhone,
					createdAt: chat.createdAt,
					updatedAt: chat.updatedAt,
					lastMessage:
						chat.status === "REPLIED"
							? chat.replyContent
							: chat.textSent,
					lastSend:
						chat.status === "REPLIED" ? 0 : chat.updatedAt,
					lastReceive:
						chat.status === "REPLIED" ? chat.updatedAt : 0,
					status: chat.status,
				};
				await ChatsUsers.create(newEntry);
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
};

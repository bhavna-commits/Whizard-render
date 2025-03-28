import ChatsTemp from "../../models/chatsTemp.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";

export const chatsUsers = async () => {
	try {
		// Retrieve all chats from ChatsTemp, sorted by createdAt descending (newest first)
		const chats = await ChatsTemp.find().sort({ createdAt: -1 });
		console.log(chats);

		// Process each chat record individually
		for (const chat of chats) {
			// Find an existing ChatsUsers entry for this combination of FB_PHONE_ID and recipientPhone (wa_id)
			const existingEntry = await ChatsUsers.findOne({
				FB_PHONE_ID: chat.FB_PHONE_ID,
				wa_id: chat.recipientPhone,
			});

			// Prepare the data to update or insert
			const updateData = {
				updatedAt: chat.updatedAt,
				lastMessage:
					chat.replyContent || chat.textSent || chat.messageTemplate,
			};

			if (chat.status === "REPLIED") {
				updateData.lastReceive = chat.updatedAt;
			} else {
				updateData.lastSend = chat.updatedAt;
			}

			if (existingEntry) {
				// Update the existing entry with the new data
				await ChatsUsers.updateOne(
					{ _id: existingEntry._id },
					{ $set: updateData },
				);
				console.log("Updated entry with _id:", existingEntry._id);
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
					lastMessage:
						chat.replyContent ||
						chat.textSent ||
						chat.messageTemplate,
					lastSend: chat.status === "REPLIED" ? 0 : chat.updatedAt,
					lastReceive: chat.status === "REPLIED" ? chat.updatedAt : 0,
					messageStatus: chat.status,
				};
				await ChatsUsers.create(newEntry);
				console.log("Created new entry:", newEntry);
			}
		}

		// After processing, delete all records from ChatsTemp
		await ChatsTemp.deleteMany({});
		console.log(
			"Processed and cleared temporary chats at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing chat cron job:", error);
	}

};

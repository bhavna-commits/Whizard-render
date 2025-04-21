import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MONGO_URI; // Mongo URI already contains the db name
const client = new MongoClient(url, { useUnifiedTopology: true });

async function chatsUsers() {
	try {
		await client.connect();
		console.log("Connected to DB");

		const db = client.db(); // Uses the db name from your connection URI
		// Replace these with your actual collection names
		const chatsTempCollection = db.collection("chatsTemp");
		const chatsUsersCollection = db.collection("chatsUsers");

		// Retrieve all chats from chatsTemp, sorted by createdAt descending (newest first)
		const chats = await chatsTempCollection
			.find()
			.sort({ updatedAt: -1 })
			.toArray();
		console.log("Chats from temp:", chats);

		for (const chat of chats) {
			// Find an existing chatsUsers entry by matching FB_PHONE_ID and recipientPhone (as wa_id)
			const existingEntry = await chatsUsersCollection.findOne({
				FB_PHONE_ID: chat.FB_PHONE_ID,
				wa_id: chat.recipientPhone,
			});

			// Prepare the update data
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
				// Update the existing entry
				await chatsUsersCollection.updateOne(
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
				await chatsUsersCollection.insertOne(newEntry);
				console.log("Created new entry:", newEntry);
			}
		}

		// After processing, delete all records from chatsTemp
		await chatsTempCollection.deleteMany({});
		console.log(
			"Processed and cleared temporary chats at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing chat cron job:", error);
	} finally {
		await client.close();
	}
}

chatsUsers();

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function cleanAgents() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log("✅ Connected to MongoDB");

		const db = mongoose.connection.db;
		const Chats = db.collection("chats");

		const chats = await Chats.find().toArray();

		const bulkOps = chats
			.map((chat) => {
				const newText = chat.replyContent || chat.textSent;

				// Only update if the text actually changes
				if (newText !== chat.text) {
					return {
						updateOne: {
							filter: { _id: chat._id },
							update: { $set: { text: newText } },
						},
					};
				}
			})
			.filter(Boolean); // Remove undefined ops

		if (bulkOps.length > 0) {
			const result = await Chats.bulkWrite(bulkOps);
			console.log(`✅ Updated ${result.modifiedCount} chat(s).`);
		} else {
			console.log("ℹ️ Nothing to update.");
		}
	} catch (err) {
		console.error("🔥 Error cleaning agents:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

cleanAgents();

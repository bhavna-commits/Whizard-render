import mongoose from "mongoose";
import ChatsUsers from "./src/models/chatsUsers.model.js";
import dotenv from "dotenv";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function cleanAgents() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log("✅ Connected to MongoDB");

		const chats = await ChatsUsers.find({
			agent: { $exists: true, $not: { $size: 0 } },
		});

		let cleanedCount = 0;

		for (const chat of chats) {
			const original = chat.agent || [];

			// Remove nulls + deduplicate
			const cleaned = [...new Set(original.filter(Boolean))];

			// Only update if it's actually different
			if (cleaned.length !== original.length) {
				chat.agent = cleaned;
				await chat.save();
				cleanedCount++;
			}
		}

		console.log(`✅ Cleaned ${cleanedCount} chat user(s).`);
	} catch (err) {
		console.error("🔥 Error cleaning agents:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

cleanAgents();

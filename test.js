import mongoose from "mongoose";
import ChatsUsers from "./src/models/chatsUsers.model.js"; // adjust path if needed
import dotenv from "dotenv";

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

async function cleanAgents() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log("✅ Connected to MongoDB");

		const chats = await ChatsUsers.find({ agent: null });

		for (const chat of chats) {
			chat.agent = []; 
			await chat.save();
		}

		console.log(`✅ Cleaned ${chats.length} chat user(s).`);
	} catch (err) {
		console.error("🔥 Error cleaning agents:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

cleanAgents();

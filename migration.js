// migration.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import chatsUsersModel from "./src/models/chatsUsers.model.js";

dotenv.config();

async function flattenAgentField() {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("✅ Connected to MongoDB via Mongoose");

		const results = await chatsUsersModel
			.find()
			.sort({ updatedAt: -1 })
			.limit(5); // Optional: don't crash your console 😅

		console.log(`🛠️ Flattened 'agent' arrays in ${results} documents`);
	} catch (err) {
		console.error("🔥 Error during migration:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

flattenAgentField();

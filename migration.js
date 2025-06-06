// migration.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./src/models/user.model.js";

dotenv.config();

async function run() {
	try {
		await mongoose.connect(process.env.MONGO_URI);
		console.log("✅ Connected to MongoDB via Mongoose");

		const results = await userModel.findOneAndUpdate(
			{ email: "dharmesh@viralpitch.co" },
			{
				WABA_ID: "-",
				WhatsAppConnectStatus: "Pending",
				FB_PHONE_NUMBERS: [],
				FB_ACCESS_TOKEN: "-",
			},
			{ new: true },
		);

		console.log(results);
	} catch (err) {
		console.error("🔥 Error during migration:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
		process.exit(0);
	}
}

run();

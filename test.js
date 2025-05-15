import dotenv from "dotenv";
import crypto from "crypto";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

import AddedUser from "./src/models/addedUser.model.js";

const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("MongoDB Connected...");
	} catch (err) {
		console.error("Error connecting to MongoDB:", err.message);
		process.exit(1);
	}
};

const migrate = async () => {
	await connectDB();

	const all = await AddedUser.find();
	const operations = all.map((user) => ({
		updateOne: {
			filter: { _id: user._id },
			update: { $set: { FB_PHONE_ID: "173988142466890" } },
		},
	}));
	if (operations.length > 0) {
		await AddedUser.bulkWrite(operations);
		console.log(`Updated ${operations.length} users`);
	} else {
		console.log("No users found to update.");
	}
};

if (process.argv[1] === __filename) {
	migrate();
}

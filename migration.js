import mongoose from "mongoose";
import dotenv from "dotenv";
import Campaign from "./src/models/campaign.model.js";

dotenv.config(); // Load environment variables

// Connect to MongoDB
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

// Function to update campaigns
const updateCampaignStatus = async () => {
	try {
		const result = await Campaign.updateMany(
			{ status: "PENDING" }, // Filter condition
			{ status: "SENT" }, // Update condition
		);
		console.log(
			`${result.modifiedCount} campaign(s) updated from "PENDING" to "SENT"`,
		);
	} catch (error) {
		console.error("Error updating campaign statuses:", error.message);
	}
};

// Run the migration
const runMigration = async () => {
	await connectDB();
	await updateCampaignStatus();
	mongoose.connection.close(); // Close the database connection after migration
};

runMigration();

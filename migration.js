import mongoose from "mongoose";
import dotenv from "dotenv";
import { UpdateContacts } from "./src/controllers/ContactList/contactsUpdate.js";

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

// Run the migration
const runMigration = async () => {
	await connectDB();
	await UpdateContacts();
	mongoose.connection.close();
};

runMigration();

import mongoose from "mongoose";
import dotenv from "dotenv";
import Chats from "./src/models/chats.model.js"; // Your existing Chats model
import ChatsTemp from "./src/models/chatsTemp.model.js"; // Your ChatsTemp model

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

// Function to copy data from Chats to ChatsTemp
const copyChatsToTemp = async () => {
	try {
		// Fetch all documents from the Chats collection
		const chats = await Chats.find();

		if (!chats.length) {
			console.log("No documents found in Chats collection.");
			return;
		}

		// Insert all chats into the ChatsTemp collection
		await ChatsTemp.insertMany(chats);
		console.log(
			`Copied ${chats.length} documents from Chats to ChatsTemp.`,
		);
	} catch (error) {
		console.error("Error copying chats:", error.message);
	}
};

// Run the migration
const runMigration = async () => {
	await connectDB();
	await copyChatsToTemp();
	mongoose.connection.close();
};

runMigration();

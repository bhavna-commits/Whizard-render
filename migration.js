import mongoose from "mongoose";
import User from "./src/models/user.model.js"; // Assuming you have a user model
import Permission from "./src/models/permissions.model.js";
import dotenv from "dotenv";

dotenv.config(); // To load your environment variables

// Connect to MongoDB
const connectDB = async () => {
	try {
		await mongoose.connect(process.env.MONGO_URI, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
		});
		console.log("MongoDB Connected...");
	} catch (err) {
		console.error(err.message);
		process.exit(1);
	}
};

// Migration function to add new keys to the User model
const migrateUserModel = async () => {
	try {
		// Add default values for the new keys if they do not exist in the User model
		await User.updateMany(
			{ "access.templates.editTemplate": { $exists: false } }, // Find users where the key doesn't exist
			{
				$set: {
					"access.templates.editTemplate": true, // Set default value for editTemplate
				},
			},
		);
		console.log("User model migration completed successfully");
	} catch (error) {
		console.error("Error running User model migration:", error);
	}
};

// Migration function to add new keys to the Permissions model for addedUsers
const migratePermissionModel = async () => {
	try {
		// Add default values for the new keys if they do not exist in the Permissions model
		await Permission.updateMany(
			{ "templates.editTemplate": { $exists: false } }, // Find permissions where the key doesn't exist
			{
				$set: {
					"templates.editTemplate": false, // Set default value for addedUsers (false)
					// Add other default keys if needed here, e.g.,
					// "templates.createTemplate": false,
					// "templates.deleteTemplate": false,
				},
			},
		);
		console.log("Permissions model migration completed successfully");
	} catch (error) {
		console.error("Error running Permissions model migration:", error);
	}
};

// Execute the migration
const runMigration = async () => {
	await connectDB(); // Connect to MongoDB

	// Run migrations for both User and Permissions models
	await migrateUserModel();
	await migratePermissionModel();

	// Close the database connection after migration
	mongoose.connection.close();
};

runMigration();

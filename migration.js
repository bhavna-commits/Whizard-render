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

// Migration function for the User model – setting userManagement keys to true
const migrateUserModel = async () => {
	try {
		await User.updateMany(
			{ "access.settings.userManagement.type": { $type: "bool" } },
			{
				$set: {
					"access.settings.userManagement": {
						type: true,
						addUser: true,
						addPermission: true,
						editPermission: true,
						deletePermission: true,
					},
				},
			},
		);
		console.log(
			"User model migration (userManagement) completed successfully",
		);
	} catch (error) {
		console.error("Error running User model migration:", error);
	}
};

// Migration function for the Permissions model – setting userManagement keys to false
const migratePermissionModel = async () => {
	try {
		await Permission.updateMany(
			{ "settings.userManagement.type": { $type: "bool" } },
			{
				$set: {
					"settings.userManagement": {
						type: false,
						addUser: false,
						addPermission: false,
						editPermission: false,
						deletePermission: false,
					},
				},
			},
		);
		console.log(
			"Permissions model migration (userManagement) completed successfully",
		);
	} catch (error) {
		console.error("Error running Permissions model migration:", error);
	}
};

// Execute the migration
const runMigration = async () => {
	await connectDB(); // Connect to MongoDB

	// Run migrations for both User and Permissions models (only userManagement)
	await migrateUserModel();
	await migratePermissionModel();

	// Close the database connection after migration
	mongoose.connection.close();
};

runMigration();

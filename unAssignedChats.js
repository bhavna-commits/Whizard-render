import mongoose from "mongoose";
import dotenv from "dotenv";
import Permissions from "./src/models/permissions.model.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
	console.error("❌ MONGO_URI is not defined in your .env");
	process.exit(1);
}

const UnAssignedChats = {
	dashboard: {
		connectNow: false,
		viewUsers: false,
		quickActions: false,
		addPhoneNumber: true,
	},
	chats: {
		type: false,
		view: false,
		chat: true,
		allChats: false,
	},
	contactList: {
		type: false,
		customField: false,
		addContactIndividual: false,
		editContactIndividual: false,
		deleteContactIndividual: false,
		addContactListCSV: false,
		deleteList: false,
		sendBroadcast: false,
		allList: false,
	},
	templates: {
		type: false,
		duplicateTemplate: false,
		createTemplate: false,
		editTemplate: false,
		deleteTemplate: false,
	},
	reports: {
		type: false,
		conversationReports: {
			type: false,
			viewReports: false,
			retargetingUsers: false,
		},
		costReports: false,
	},
	settings: {
		type: false,
		userManagement: {
			type: false,
			addUser: false,
			addPermission: false,
			editPermission: false,
			deletePermission: false,
		},
		activityLogs: false,
		manageTags: {
			type: false,
			delete: false,
			add: false,
			view: false,
		},
	},
};

async function run() {
	try {
		await mongoose.connect(MONGO_URI);
		console.log("✅ Connected to MongoDB");

		// 🔍 Delete existing permission first
		const deleted = await Permissions.findOneAndDelete({
			unique_id: "UnAssignedChats",
		});
		if (deleted) {
			console.log(`🗑️ Deleted existing permission: ${deleted.name}`);
		} else {
			console.log("ℹ️ No existing UnAssignedChats permission found.");
		}

		// ➕ Add the new permission
		const newRole = new Permissions({
			useradmin: "staticPermission",
			name: "Unassigned Chats Support",
			unique_id: "UnAssignedChats",
			createdBy: "Default",
			...UnAssignedChats,
		});

		await newRole.save();
		console.log("✅ New permission saved successfully!");
	} catch (err) {
		console.error("🔥 Error:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

run();

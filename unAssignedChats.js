import mongoose from "mongoose";
import dotenv from "dotenv";
import ChatsUsers from "./src/models/chatsUsers.model.js";
import Permissions from "./src/models/permissions.model.js";
import AddedUser from "./src/models/addedUser.model.js";

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
		chat: false,
		allChats: true,
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

		const { dashboard, chats, contactList, templates, reports, settings } =
			UnAssignedChats;

		const newRole = new Permissions({
			useradmin: "staticPermission",
			name: "Unassigned Chats Support",
			unique_id: "UnAssignedChats",
			createdBy: "Default",
			dashboard,
			chats,
			contactList,
			templates,
			reports,
			settings,
		});

		console.log(newRole);
		await newRole.save();
	} catch (err) {
		console.error("🔥 Error:", err);
	} finally {
		await mongoose.disconnect();
		console.log("👋 Disconnected from MongoDB");
	}
}

run();

import mongoose from "mongoose";

const Schema = mongoose.Schema;

const permissionSchema = new Schema(
	{
		useradmin: { type: String, ref: "User", required: true, index: true },
		name: { type: String, required: true },
		unique_id: { type: String, required: true, index: true },
		deleted: { type: Boolean, default: false },
		dashboard: {
			connectNow: { type: Boolean, default: false },
			viewUsers: { type: Boolean, default: false },
			quickActions: { type: Boolean, default: false },
			addPhoneNumber: { type: Boolean, default: false },
		},
		chats: {
			type: { type: Boolean, default: false },
			view: { type: Boolean, default: false },
			chat: { type: Boolean, default: false },
			allChats: { type: Boolean, default: false },
		},
		contactList: {
			type: { type: Boolean, default: false },
			customField: { type: Boolean, default: false },
			addContactIndividual: { type: Boolean, default: false },
			editContactIndividual: { type: Boolean, default: false },
			deleteContactIndividual: { type: Boolean, default: false },
			addContactListCSV: { type: Boolean, default: false },
			deleteList: { type: Boolean, default: false },
			sendBroadcast: { type: Boolean, default: false },
			allList: { type: Boolean, default: false },
		},
		templates: {
			type: { type: Boolean, default: false },
			duplicateTemplate: { type: Boolean, default: false },
			editTemplate: { type: Boolean, default: false },
			createTemplate: { type: Boolean, default: false },
			deleteTemplate: { type: Boolean, default: false },
		},
		reports: {
			type: { type: Boolean, default: false },
			conversationReports: {
				type: { type: Boolean, default: false },
				viewReports: { type: Boolean, default: false },
				retargetingUsers: { type: Boolean, default: false },
			},
			costReports: { type: Boolean, default: false },
		},
		settings: {
			type: { type: Boolean, default: false },
			userManagement: {
				type: { type: Boolean, default: false },
				addUser: { type: Boolean, default: false },
				addPermission: { type: Boolean, default: false },
				editPermission: { type: Boolean, default: false },
				deletePermission: { type: Boolean, default: false },
			},
			activityLogs: { type: Boolean, default: false },
			manageTags: {
				type: { type: Boolean, default: false },
				delete: { type: Boolean, default: false },
				add: { type: Boolean, default: false },
				view: { type: Boolean, default: false },
			},
		},
		createdAt: { type: Number, default: () => Date.now() },
		updatedAt: { type: Number, default: () => Date.now() },
		createdBy: { type: String, required: true },
	},
	{
		timestamps: false,
		strict: false,
	},
);

permissionSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	if (!this.createdAt) {
		this.createdAt = Date.now();
	}
	next();
});

export default mongoose.model("Permissions", permissionSchema);

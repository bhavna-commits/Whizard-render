import mongoose from "mongoose";

const Schema = mongoose.Schema;

const permissionSchema = new Schema(
	{
		useradmin: { type: String, ref: "User", required: true },
		name: { type: String, required: true },
		unique_id: { type: String, required: true },
		dashboard: {
			connectNow: {
				type: Boolean,
				default: false,
			},
			viewUsers: {
				type: Boolean,
				default: false,
			},
			quickActions: {
				type: Boolean,
				default: false,
			},
		},
		chats: {
			type: Boolean,
			default: false,

			redirectToVpchat: {
				type: Boolean,
				default: false,
			},
		},
		contactList: {
			type: Boolean,
			default: false,

			addContactIndividual: {
				type: Boolean,
				default: false,
			},
			addContactListCSV: {
				type: Boolean,
				default: false,
			},
			deleteList: {
				type: Boolean,
				default: false,
			},
			sendBroadcast: {
				type: Boolean,
				default: false,
			},
		},
		templates: {
			type: Boolean,
			default: false,

			editTemplate: {
				type: Boolean,
				default: false,
			},
			createTemplate: {
				type: Boolean,
				default: false,
			},
			deleteTemplate: {
				type: Boolean,
				default: false,
			},
		},
		reports: {
			type: Boolean,
			default: false,

			conversationReports: {
				viewReports: {
					type: Boolean,
					default: false,
				},
				retargetingUsers: {
					type: Boolean,
					default: false,
				},
				redirectToVpchat: {
					type: Boolean,
					default: false,
				},
			},
			costReports: {
				type: Boolean,
				default: false,
			},
		},
		settings: {
			type: Boolean,
			default: false,

			userManagement: {
				type: Boolean,
				default: false,
			},
			activityLogs: {
				type: Boolean,
				default: false,
			},
			manageTags: {
				delete: {
					type: Boolean,
					default: false,
				},
				add: {
					type: Boolean,
					default: false,
				},
				view: {
					type: Boolean,
					default: false,
				},
			},
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
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

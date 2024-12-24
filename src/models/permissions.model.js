import { name } from "ejs";
import mongoose from "mongoose";

const Schema = mongoose.Schema;

const permissionSchema = new Schema(
	{
		owner: { type: String, ref: "User", required: true },
		name: { type: String, required: true },
		unique_id: { type: String, required: true },
		user: {
			dashboard: {
				connectNow: {
					type: Boolean,
					default: true,
				},
				viewUsers: {
					type: Boolean,
					default: true,
				},
				quickActions: {
					type: Boolean,
					default: true,
				},
			},
			chats: {
				type: Boolean,
				default: true,

				redirectToVpchat: {
					type: Boolean,
					default: true,
				},
			},
			contactList: {
				type: Boolean,
				default: true,

				addContactIndividual: {
					type: Boolean,
					default: true,
				},
				addContactListCSV: {
					type: Boolean,
					default: true,
				},
				deleteList: {
					type: Boolean,
					default: true,
				},
				sendBroadcast: {
					type: Boolean,
					default: true,
				},
			},
			reports: {
				type: Boolean,
				default: true,

				conversationReports: {
					viewReports: {
						type: Boolean,
						default: true,
					},
					retargetingUsers: {
						type: Boolean,
						default: true,
					},
					redirectToVpchat: {
						type: Boolean,
						default: true,
					},
				},
				costReports: {
					type: Boolean,
					default: true,
				},
			},
			settings: {
				type: Boolean,
				default: true,

				userManagement: {
					type: Boolean,
					default: true,
				},
				activityLogs: {
					type: Boolean,
					default: true,
				},
				manageTags: {
					delete: {
						type: Boolean,
						default: true,
					},
					add: {
						type: Boolean,
						default: true,
					},
					view: {
						type: Boolean,
						default: true,
					},
				},
			},
		    },
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

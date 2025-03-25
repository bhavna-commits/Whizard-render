import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: false, index: true }, // Index for WABA_ID for faster lookup
		FB_PHONE_NUMBERS: [
			{
				phone_number_id: String,
				verified: { type: Boolean, default: false },
				selected: { type: Boolean, default: false },
				friendly_name: String,
				number: String,
			},
		],
		FB_ACCESS_TOKEN: { type: String, required: false },
		FB_ACCESS_TOKEN_EXPIRY: { type: Number, required: false },
		profilePhoto: { type: String, required: false },
		name: { type: String, required: true, index: true }, // Index for quicker name lookup
		email: { type: String, required: true, unique: true }, // Unique index for email
		password: { type: String, required: true },
		phone: { type: String, required: true, index: true }, // Index for phone number
		addedUsers: [{ type: String, ref: "AddedUser" }],
		color: { type: String, required: true },
		companyName: { type: String, required: true, index: true }, // Index for companyName
		companyDescription: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		companySize: { type: String, required: true },
		industry: { type: String, required: true },
		jobRole: { type: String, required: true },
		website: { type: String, required: true },
		blocked: { type: Boolean, default: false, index: true }, // Index for blocked users
		WhatsAppConnectStatus: {
			type: String,
			enum: ["Pending", "Live"],
			default: "Pending",
			required: true,
			index: true, // Index for WhatsAppConnectStatus
		},
		unique_id: {
			type: String,
			required: true,
			index: true, // Index for unique identifier
		},
		access: {
			dashboard: {
				connectNow: { type: Boolean, default: true },
				viewUsers: { type: Boolean, default: true },
				quickActions: { type: Boolean, default: true },
				addPhoneNumber: { type: Boolean, default: true },
			},
			chats: {
				type: { type: Boolean, default: true },
				redirectToVpchat: { type: Boolean, default: true },
				view: { type: Boolean, default: true },
				chat: { type: Boolean, default: true },
			},
			contactList: {
				type: { type: Boolean, default: true },
				addContactIndividual: { type: Boolean, default: true },
				editContactIndividual: { type: Boolean, default: true },
				deleteContactIndividual: { type: Boolean, default: true },
				addContactListCSV: { type: Boolean, default: true },
				deleteList: { type: Boolean, default: true },
				sendBroadcast: { type: Boolean, default: true },
				customField: { type: Boolean, default: true },
			},
			templates: {
				type: { type: Boolean, default: true },
				duplicateTemplate: { type: Boolean, default: true },
				editTemplate: { type: Boolean, default: true },
				createTemplate: { type: Boolean, default: true },
				deleteTemplate: { type: Boolean, default: true },
			},
			reports: {
				type: { type: Boolean, default: true },
				conversationReports: {
					type: { type: Boolean, default: true },
					viewReports: { type: Boolean, default: true },
					retargetingUsers: { type: Boolean, default: true },
				},
				costReports: { type: Boolean, default: true },
			},
			settings: {
				type: { type: Boolean, default: true },
				userManagement: {
					type: { type: Boolean, default: true },
					addUser: { type: Boolean, default: true },
					addPermission: { type: Boolean, default: true },
				},
				activityLogs: { type: Boolean, default: true },
				manageTags: {
					type: { type: Boolean, default: true },
					delete: { type: Boolean, default: true },
					add: { type: Boolean, default: true },
					view: { type: Boolean, default: true },
				},
			},
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
			index: true, // Index for time-based queries
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		loginAttempts: {
			type: Number,
			default: 0,
		},
		lockUntil: {
			type: Number,
			default: 0,
		},
	},
	{ timestamps: false, strict: false },
);

userSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model("User", userSchema);

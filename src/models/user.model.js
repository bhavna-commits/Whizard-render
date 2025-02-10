import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: false },
		FB_PHONE_ID: { type: String, required: false },
		FB_ACCESS_TOKEN: { type: String, required: false },
		FB_ACCESS_TOKEN_EXPIRY: { type: Number, required: false },
		profilePhoto: { type: String, required: false },
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		phone: { type: String, required: true },
		addedUsers: [{ type: String, ref: "AddedUser" }],
		color: { type: String, required: true },
		companyName: { type: String, required: true },
		companyDescription: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		companySize: { type: String, required: true },
		industry: { type: String, required: true },
		jobRole: { type: String, required: true },
		website: { type: String, required: true },
		blocked: { type: Boolean, default: false },
		WhatsAppConnectStatus: {
			type: String,
			enum: ["Pending", "Live"],
			default: "Pending",
			required: true,
		},
		unique_id: {
			type: String,
			required: true,
		},
		access: {
			dashboard: {
				connectNow: { type: Boolean, default: true },
				viewUsers: { type: Boolean, default: true },
				quickActions: { type: Boolean, default: true },
			},
			chats: {
				type: { type: Boolean, default: true },
				redirectToVpchat: { type: Boolean, default: true },
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
				createTemplate: { type: Boolean, default: true },
				deleteTemplate: { type: Boolean, default: true },
			},
			reports: {
				type: { type: Boolean, default: true },
				conversationReports: {
					type: { type: Boolean, default: true },
					viewReports: { type: Boolean, default: true },
					retargetingUsers: { type: Boolean, default: true },
					redirectToVpchat: { type: Boolean, default: true },
				},
				costReports: { type: Boolean, default: true },
			},
			settings: {
				type: { type: Boolean, default: true },
				userManagement: { type: Boolean, default: true },
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

const User = mongoose.model("User", userSchema);

export default User;

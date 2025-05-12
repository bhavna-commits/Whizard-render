import mongoose, { Schema } from "mongoose";

const ChatsUsersSchema = new mongoose.Schema(
	{
		// WABA_ID: { type: String, required: true, index: true },
		FB_PHONE_ID: { type: String, required: true, index: true },
		useradmin: { type: String, required: true, index: true },
		unique_id: { type: String, required: true },
		contactName: [{ type: String, required: true }],
		nameContactRelation: [{ name: String, contactListId: String }],
		wa_id: { type: String, required: true, index: true },
		campaignId: { type: String, default: "" },
		agent: [],
		supportAgent: [],
		createdAt: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		lastMessage: { type: String, default: "" },
		lastSend: { type: Number, default: () => Date.now(), index: true },
		lastReceive: { type: Number, default: () => Date.now(), index: true },
		messageStatus: { type: String, default: "" },
		status: { type: Number, default: 1 },
	},
	{
		timestamps: false,
		strict: false,
	},
);

// Middleware to update timestamps
ChatsUsersSchema.pre("save", function (next) {
	if (this.isNew) {
		this.updatedAt = Date.now();
	}
	next();
});

export default mongoose.model("ChatsUsers", ChatsUsersSchema);

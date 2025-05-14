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
		campaignId: { type: String, default: "", index: true },
		campaignName: { type: String, default: "" },
		agent: { type: Array, default: [], index: true },
		supportAgent: { type: Array, default: [], index: true },
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		lastMessage: { type: String, default: "" },
		lastSend: { type: Number, default: 0, index: true },
		lastReceive: { type: Number, default: 0, index: true },
		messageStatus: { type: String, default: "" },
		replyStatus: { type: Number, default: 0, index: true },
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

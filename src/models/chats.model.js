import mongoose, { Schema } from "mongoose";

const ChatsSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: true, index: true },
		FB_PHONE_ID: { type: String, required: true, index: true },
		useradmin: { type: String, required: false, index: true },
		unique_id: { type: String, required: true },
		campaignId: {
			type: String,
			ref: "Campaign",
			required: true,
			index: true,
		},
		campaignName: String,
		templateId: {
			type: String,
			ref: "template",
			required: false,
		},
		components: [],
		contactName: { type: String, required: true },
		recipientPhone: { type: String, required: true, index: true },
		status: {
			type: String,
			enum: ["SENT", "DELIVERED", "READ", "FAILED", "REPLIED"],
			required: true,
		},
		failed: {
			code: String,
			text: String,
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		deleted: { type: Boolean, default: false, index: true },
		messageId: { type: String, required: true, unique: true, index: true },
		messageTemplate: { type: Schema.Types.Mixed },
		replyContent: { type: String, default: "" },
		textSent: { type: String, default: "" },
		text: { type: String, default: "" },
		media: {
			url: { type: String, default: "" },
			fileName: { type: String, default: "" },
			caption: { type: String, default: "" },
		},
		type: {
			type: String,
			enum: ["Campaign", "Template", "Chat"],
			required: true,
		},
		templatename: { type: String, default: "" },
		media_type: { type: String, default: "" },
		agent: { type: Array, default: [] },
	},
	{
		timestamps: false,
		strict: false,
	},
);

ChatsSchema.pre("save", function (next) {
	if (this.isNew) {
		this.updatedAt = Date.now();
	}
	next();
});

export default mongoose.model("Chats", ChatsSchema);

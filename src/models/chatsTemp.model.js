import mongoose, { Schema } from "mongoose";

const ChatsTempSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: true },
		FB_PHONE_ID: { type: String, required: true },
		useradmin: { type: String, required: true, index: true },
		unique_id: { type: String, required: true },
		campaignId: {
			type: String,
			ref: "Campaign",
			required: true,
			index: true,
		},
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
			index: true,
		},
		failed: {
			code: String,
			text: String,
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		deleted: { type: Boolean, default: false, index: true },
		messageId: { type: String, required: true, unique: true },
		messageTemplate: { type: Schema.Types.Mixed },
		replyContent: { type: String, default: "" },
		textSent: { type: String, default: "" },
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
		agent: [],
		media_type: { type: String, default: "" },
	},
	{
		timestamps: false,
		strict: false,
	},
);

// Compound indexes
ChatsTempSchema.index({ useradmin: 1, campaignId: 1 });
ChatsTempSchema.index({ status: 1, createdAt: 1 });

// Middleware to update timestamps
ChatsTempSchema.pre("save", function (next) {
	if (this.isNew) {
		this.updatedAt = Date.now();
	}
	next();
});

export default mongoose.model("ChatsTemp", ChatsTempSchema);

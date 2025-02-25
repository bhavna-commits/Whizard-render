import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		useradmin: { type: String, required: true },
		unique_id: { type: String, required: true },
		templateId: {
			type: String,
			ref: "Template",
			required: true,
		},
		contactListId: {
			type: String,
			ref: "ContactList",
			required: true,
		},
		variables: { type: Map },
		scheduledAt: { type: Number },
		status: {
			type: String,
			enum: ["SENT", "PENDING", "SCHEDULED", "IN_QUEUE"],
			default: "PENDING",
		},
		createdAt: { type: Date, default: () => Date.now() },
		deleted: { type: Boolean, default: false },
		contactList: { type: mongoose.Schema.Types.Mixed, default: null },
		phoneNumberId: { type: String, required: true },
	},
	{ strict: false, timestamps: false },
);

export default mongoose.model("Campaign", CampaignSchema);

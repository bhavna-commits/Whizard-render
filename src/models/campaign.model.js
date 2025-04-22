import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
	{
		name: { type: String, required: true },
		useradmin: { type: String, required: true, index: true },
		unique_id: { type: String, required: true, index: true },
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
		scheduledAt: { type: Number, index: true },
		status: {
			type: String,
			enum: ["SENT", "PENDING", "SCHEDULED", "IN_QUEUE"],
			default: "PENDING",
			index: true,
		},
		createdAt: { type: Number, default: () => Date.now(), index: true },
		deleted: { type: Boolean, default: false },
		contactList: { type: mongoose.Schema.Types.Mixed, default: null },
		phoneNumberId: { type: String, required: true, index: true },
	},
	{ strict: false, timestamps: false },
);

export default mongoose.model("Campaign", CampaignSchema);

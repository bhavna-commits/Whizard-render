import mongoose from "mongoose";

const CampaignSchema = new mongoose.Schema(
	{
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
		scheduledAt: { type: Date },
		status: {
			type: String,
			enum: ["SENT", "PENDING", "SCHEDULED"],
			default: "PENDING",
		},
		createdAt: { type: Date, default: Date.now },
	},
	{ strict: false, timestamps: false },
);

export default mongoose.model("Campaign", CampaignSchema);

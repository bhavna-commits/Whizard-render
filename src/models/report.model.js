import mongoose, { Schema } from "mongoose";

const CampaignReportSchema = new mongoose.Schema(
	{
		WABA_ID: { type: String, required: true },
		FB_PHONE_ID: { type: String, required: true },
		useradmin: { type: String, required: true },
		unique_id: { type: String, required: true },
		campaignId: {
			type: String,
			ref: "Campaign",
			required: true,
		},
		recipientPhone: { type: String, required: true },
		status: {
			type: String,
			enum: ["SENT", "DELIVERED", "READ", "FAILED", "REPLIED"],
			required: true,
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		deleted: { type: Boolean, default: false },
		messageId: { type: String, required: true },
		messageTemplate: { type: Schema.Types.Mixed },
		replyContent: { type: String, default: null },
	},
	{
		timestamps: false,
		strict: false,
	},
);

CampaignReportSchema.pre("save", function (next) {
	if (this.isNew) {
		this.updatedAt = () => Date.now();
	}
	next();
});

export default mongoose.model("CampaignReport", CampaignReportSchema);

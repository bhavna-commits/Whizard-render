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
		timestamp: {
			type: Number,
			default: () => Math.floor(Date.now() / 1000),
		}, // Unix timestamp in seconds
		deleted: { type: Boolean, default: false },
		messageId: { type: String, required: true },
		messageTemplate: { type: Schema.Types.Mixed },
		replyContent: { type: String },
	},
	{
		timestamps: false,
	},
);

CampaignReportSchema.pre("save", function (next) {
	if (this.isNew) {
		this.timestamp = Math.floor(Date.now() / 1000); // Set current Unix timestamp
	}
	next();
});

export default mongoose.model("CampaignReport", CampaignReportSchema);

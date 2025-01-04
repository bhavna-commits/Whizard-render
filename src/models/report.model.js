import mongoose from "mongoose";

const CampaignReportSchema = new mongoose.Schema({
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
		enum: ["SENT", "DELIVERED", "READ", "FAILED"],
		required: true,
	},
	timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("CampaignReport", CampaignReportSchema);
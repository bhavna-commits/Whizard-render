import mongoose from "mongoose";

const tempStatusSchema = new mongoose.Schema({
    fbPhoneId: { type: String, required: true },
	wabaId: { type: String, required: true },
	messageId: { type: String, required: true },
	status: { type: String, required: true },
	timestamp: { type: Number, required: true },
	recipientPhone: { type: String },
	error: { type: Array, default: [] },
	// Optionally store extra raw data for later processing
	rawData: { type: Object, required: true },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TempStatus", tempStatusSchema);

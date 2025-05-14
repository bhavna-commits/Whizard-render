import mongoose from "mongoose";

const tempStatusSchema = new mongoose.Schema({
    fbPhoneId: { type: String, required: true },
	wabaId: { type: String, required: true },
	messageId: { type: String, required: true },
	status: { type: String, required: true },
	timestamp: { type: Number, required: true },
	recipientPhone: { type: String, default: "-" },
	error: { type: Array, default: [] },
	createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.model("TempStatusBackUp", tempStatusSchema);

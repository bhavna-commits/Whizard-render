import mongoose from "mongoose";

const tempMessageSchema = new mongoose.Schema({
	name: { type: String, required: false },
	wabaId: { type: String, required: true },
	messageId: { type: String, required: true },
	from: { type: String, required: true }, // recipientPhone
	timestamp: { type: Number, required: true },
	type: { type: String, required: true },
	text: { type: Object }, // Store the text object as received
	media: { type: Object }, // Store image info if available
	fbPhoneId: { type: String },
	// Optionally store extra raw data for later processing
	rawData: { type: Object, required: false },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TempMessage", tempMessageSchema);

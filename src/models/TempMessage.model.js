import mongoose from "mongoose";

const tempMessageSchema = new mongoose.Schema({
	name: { type: String, required: false },
	wabaId: { type: String, required: true },
	messageId: { type: String, required: true },
	from: { type: String, required: true }, // recipientPhone
	timestamp: { type: Number, required: true },
	type: { type: String, required: true },
	text: { type: mongoose.Schema.Types.Mixed }, // Store the text object as received
	mediaId: { type: String, default: "" }, // Store image info if available
	fbPhoneId: { type: String, default: "" },
	status: { type: String, default: "" },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("TempMessage", tempMessageSchema);

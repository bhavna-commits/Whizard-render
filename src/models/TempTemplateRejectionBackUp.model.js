import mongoose from "mongoose";

const tempTemplateRejectionSchema = new mongoose.Schema({
	wabaId: { type: String, required: true },
	templateId: { type: String, required: true },
	templateName: { type: String },
	templateLanguage: { type: String },
	rejectedReason: { type: String, required: true },
	createdAt: { type: Date, default: Date.now },
});

export default mongoose.model(
	"TempTemplateRejectionBackUp",
	tempTemplateRejectionSchema,
);

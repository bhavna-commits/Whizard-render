import mongoose from "mongoose";

const Schema = mongoose.Schema;

const templateSchema = new Schema(
	{
		owner: {
			type: Schema.ObjectId,
			required: true,
		},
		templateName: {
			type: String,
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		body: {
			type: String,
			required: true,
		},
		footer: {
			type: String,
			required: true,
		},
		buttons: [
			{
				text: String,
				urlPhone: String,
			},
		],
		header: {
			type: {
				type: String,
				enum: ["none", "text", "media"],
				default: "none",
			},
			content: {
				type: mongoose.Schema.Types.Mixed,
				default: null,
			},
		},
		dynamicVariables: [Number],
		status: {
			type: String,
			enum: ["approved", "rejected", "pending"],
			default: "pending",
		},
	},
	{ timestamps: true },
	{ strict: false },
);

export default mongoose.model("Template", templateSchema);

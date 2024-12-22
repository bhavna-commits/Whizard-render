import mongoose from "mongoose";

const Schema = mongoose.Schema;

const componentSchema = new Schema({
	text: {
		type: String,
		required: function () {
			return this.type !== "HEADER";
		},
	},
	type: {
		type: String,
		enum: ["HEADER", "BODY", "FOOTER", "BUTTON"],
		required: true,
	},
	format: {
		type: String,
		enum: ["IMAGE", "VIDEO", "DOCUMENT"], 
		required: function () {
			return this.type === "HEADER";
		},
	},
	example: {
		header_handle: {
			type: [String], 
			required: function () {
				return this.type === "HEADER" && this.format;
			},
		},
	},
});

const templateSchema = new Schema(
	{
		owner: {
			type: Schema.ObjectId,
			required: true,
		},
		name: {
			type: String,
			required: true,
		},
		category: {
			type: String,
			required: true,
		},
		components: [componentSchema], 
		language: {
			type: String,
			default: "en",
		},
		namespace: {
			type: String,
			required: true,
		},
		rejected_reason: {
			type: String,
			default: "NONE",
		},
		status: {
			type: String,
			enum: ["approved", "rejected", "pending"],
			default: "pending",
		},
		subscribe_update: {
			type: Number,
			required: true,
		},
		whizard_status: {
			type: Number,
			default: 1,
		},
		unique_id: {
			type: String,
			required: true,
		},
		useradmin: {
			type: Number,
			required: true,
		},
	},
	{ timestamps: true },
	{ strict: false },
);

export default mongoose.model("Template", templateSchema);

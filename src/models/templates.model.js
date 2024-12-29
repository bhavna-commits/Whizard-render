import mongoose from "mongoose";

const Schema = mongoose.Schema;

const componentSchema = new mongoose.Schema({
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
			default: [], 
		},
	},
});


const templateSchema = new Schema({
	name: {
		type: String,
		required: true,
	},
	language: {
		type: String,
		default: "en_US",
	},
	category: {
		type: String,
		required: true,
	},
	components: [componentSchema],
	status: {
		type: String,
		enum: ["Approved", "Rejected", "Pending"],
		default: "Pending",
	},
	unique_id: {
		type: String,
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
	useradmin: {
		type: String,
		required: true,
	},
});

templateSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model("Template", templateSchema);
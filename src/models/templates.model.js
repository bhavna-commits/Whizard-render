import mongoose from "mongoose";

const Schema = mongoose.Schema;

const templateSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
		},
		language: {
			code: {
				type: String,
				default: "en_US",
			},
			language: { type: String, default: "English (US)" },
		},
		category: {
			type: String,
			required: true,
		},
		components: [],
		status: {
			type: String,
			enum: ["Approved", "Rejected", "Pending"],
			default: "Pending",
		},
		unique_id: {
			type: String,
			required: true,
		},
		fb_id: String,
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
		dynamicVariables: {
			type: Object,
			required: true,
		},
		rejected_reason: String,
		deleted: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: false, strict: false },
);

templateSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model("Template", templateSchema);

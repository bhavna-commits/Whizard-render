import mongoose from "mongoose";

const Schema = mongoose.Schema;

const templateSchema = new Schema(
	{
		name: { type: String, required: true, index: true },
		language: {
			code: { type: String, default: "en_US" },
			language: { type: String, default: "English (US)" },
		},
		category: { type: String, required: true, index: true },
		components: [],

		// ← NEW: per‑button click counts
		buttonClicks: {
			type: Map,
			of: Number,
			default: {},
		},

		status: {
			type: String,
			enum: ["Approved", "Rejected", "Pending"],
			default: "Pending",
			index: true,
		},
		unique_id: { type: String, required: true, index: true },
		template_id: String,
		createdAt: { type: Number, default: () => Date.now(), index: true },
		updatedAt: { type: Number, default: () => Date.now() },
		useradmin: { type: String, required: true, index: true },
		dynamicVariables: { type: Object, required: true },
		rejected_reason: String,
		deleted: { type: Boolean, default: false, index: true },
		logs: Schema.Types.Mixed,
	},
	{ timestamps: false, strict: false },
);

// Middleware to bump updatedAt
templateSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model("Template", templateSchema);

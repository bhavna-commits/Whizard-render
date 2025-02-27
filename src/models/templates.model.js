import mongoose from "mongoose";

const Schema = mongoose.Schema;

const templateSchema = new Schema(
	{
		name: {
			type: String,
			required: true,
			index: true, // Index for quicker name lookups
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
			index: true, // Index for category-based searches
		},
		components: [], // Leaving this as an open array
		status: {
			type: String,
			enum: ["Approved", "Rejected", "Pending"],
			default: "Pending",
			index: true, // Index for filtering by status
		},
		unique_id: {
			type: String,
			required: true,
			index: true, // Index for unique identifier
		},
		template_id: String,
		createdAt: {
			type: Number,
			default: () => Date.now(),
			index: true, // Index for time-based queries
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
		useradmin: {
			type: String,
			required: true,
			index: true, // Index for user-based queries
		},
		dynamicVariables: {
			type: Object,
			required: true,
		},
		rejected_reason: String,
		deleted: {
			type: Boolean,
			default: false,
			index: true, // Index for deleted flag to support soft delete functionality
		},
	},
	{ timestamps: false, strict: false },
);

// Middleware to update the updatedAt field before saving
templateSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

export default mongoose.model("Template", templateSchema);

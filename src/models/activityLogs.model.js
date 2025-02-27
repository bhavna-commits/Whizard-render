import mongoose from "mongoose";

const activityLogsSchema = new mongoose.Schema(
	{
		useradmin: { type: String, required: true },
		unique_id: { type: String, required: true },
		name: { type: String, required: true },
		actions: {
			type: String,
			enum: ["All action", "Update", "Create", "Delete", "Send"],
			default: "All action",
		},
		details: { type: String, required: true },
		createdAt: { type: Number, default: () => Date.now() },
	},
	{
		timestamps: false,
		strict: false,
	},
);

// Single field index for common search fields
activityLogsSchema.index({ useradmin: 1 });
activityLogsSchema.index({ unique_id: 1 });
activityLogsSchema.index({ createdAt: -1 }); // Indexing createdAt in descending order for sorting

// Compound index for combination queries (e.g., useradmin + actions)
activityLogsSchema.index({ useradmin: 1, actions: 1 });

const ActivityLogs = mongoose.model("ActivityLogs", activityLogsSchema);

export default ActivityLogs;

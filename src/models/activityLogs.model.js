import mongoose from "mongoose";

const activityLogsSchema = new mongoose.Schema(
	{
		useradmin: { type: String, required: true },
		unique_id: { type: String, required: true },
		name: { type: String, required: true },
		// photo: { type: String, required: true },
		// color: { type: String, required: true },
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

const ActivityLogs = mongoose.model("ActivityLogs", activityLogsSchema);

export default ActivityLogs;

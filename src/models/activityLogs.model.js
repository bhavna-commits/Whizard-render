import mongoose from "mongoose";

const activityLogsSchema = new mongoose.Schema(
	{
		name: { type: String, required: true }, 
		action: {
			type: String,
			enum: ["All action", "Update", "Create", "Delete", "Send"],
			default: "All action",
		},
		details: { type: String, required: true }, 
	},
	{
		timestamps: true, 
		strict: false, 
	},
);

const ActivityLogs = mongoose.model("ActivityLogs", activityLogsSchema);

export default ActivityLogs;

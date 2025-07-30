import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
	{
		unique_id: { type: String, required: true, unique: true, index: true },
		email: { type: String, required: true, index: true },
		name: { type: String, required: true, index: true },
		password: { type: String },
		useradmin: { type: String, ref: "User", index: true },
		selectedFBNumber: { type: mongoose.Schema.Types.Mixed },
		photo: { type: String },
		color: { type: String },
		roleId: {
			type: String,
			required: true,
			index: true,
		},
		roleName: {
			type: String,
			required: true,
			index: true,
		},
		deleted: { type: Boolean, default: false },
		status: {
			type: String,
			enum: ["In-active", "Active"],
			default: "In-active",
			index: true,
		},
		blocked: { type: Boolean, default: false },
		createdAt: { type: Number, default: () => Date.now(), index: true },
		updatedAt: { type: Number, default: () => Date.now(), index: true },
	},
	{ timestamps: false },
	{ strict: false },
);

const AddedUser = mongoose.model("AddedUser", addedUserSchema);

export default AddedUser;

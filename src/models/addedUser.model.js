import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
	{
		unique_id: { type: String, required: true, unique: true },
		email: { type: String, required: true },
		name: { type: String, required: true },
		password: { type: String },
		useradmin: { type: String, ref: "User" },
		photo: { type: String },
		color: { type: String },
		roleId: {
			type: String,
			required: true,
		},
		roleName: {
			type: String,
			required: true,
		},
		deleted: { type: Boolean, default: false },
		status: {
			type: String,
			enum: ["In-active", "Active"],
			default: "In-active",
		},
		blocked: { type: Boolean, default: false },
		createdAt: { type: Number, default: () => Date.now() },
		updatedAt: { type: Number, default: () => Date.now() },
	},
	{ timestamps: false },
	{ strict: false },
);

const AddedUser = mongoose.model("AddedUser", addedUserSchema);

export default AddedUser;

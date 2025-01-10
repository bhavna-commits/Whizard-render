import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
	{
		unique_id: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		name: { type: String, required: true },
		password: { type: String },
		useradmin: { type: String, ref: "User" },
		role: {
			type: String,
			required: true,
		},
		deleted: { type: Boolean, default: false },
		invitationStatus: {
			type: String,
			enum: ["Invited", "Registered"],
			default: "Invited",
		},
		createdAt: { type: Number, default: () => Date.now() },
		updatedAt: { type: Number, default: () => Date.now() },
	},
	{ timestamps: false },
	{ strict: false },
);

const AddedUser = mongoose.model("AddedUser", addedUserSchema);

export default AddedUser;

import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
	{
		email: { type: String, required: true, unique: true },
		name: { type: String , required: true, },
		password: { type: String },
		owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
		usertype: {
			type: String,
			enum: ["owner, member"],
			default: "member",
			required: true,
		},
		invitedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		status: {
			type: String,
			enum: ["invited", "registered", "verified"],
			default: "invited",
		},
		invitationToken: { type: String },
		invitationTokenExpiry: { type: Date },
	},
	{ timestamps: true },
	{ strict: false },
);

const AddedUser = mongoose.model("AddedUser", addedUserSchema);

export default AddedUser;

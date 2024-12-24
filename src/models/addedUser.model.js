import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
	{
		unique_id: { type: String, required: true, unique: true },
		email: { type: String, required: true, unique: true },
		username: { type: String, required: true },
		password: { type: String },
		useradmin: { type: String, ref: "User" },
		usertype: {
			type: String,
			enum: ["owner, member"],
			default: "member",
			required: true,
		},
		status: { type: Number, enum: [0, 1], default: 1 },
		invitedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		invitationStatus: {
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

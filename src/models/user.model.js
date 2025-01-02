import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		profilePhoto: { type: String, required: false },
		name: { type: String, required: true },
		email: { type: String, required: true, unique: true },
		password: { type: String, required: true },
		phone: { type: String, required: true },
		addedUsers: [
			{ type: mongoose.Schema.Types.ObjectId, ref: "AddedUser" },
		],
		companyName: { type: String, required: true },
		companyDescription: { type: String, required: true },
		country: { type: String, required: true },
		state: { type: String, required: true },
		companySize: { type: String, required: true },
		industry: { type: String, required: true },
		jobRole: { type: String, required: true },
		website: { type: String, required: true },
		WhatsAppConnectStatus: {
			type: String,
			enum: ["Pending", "Live"],
			default: "Pending",
			required: true,
		},
		accessToken: String,
		unique_id: {
			type: String,
			required: true,
		},
		createdAt: {
			type: Number,
			default: () => Date.now(),
		},
		updatedAt: {
			type: Number,
			default: () => Date.now(),
		},
	},
	{ timestamps: false, strict: false },
);

const User = mongoose.model("User", userSchema);

export default User;

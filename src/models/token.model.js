import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
	{
		accessToken: { type: String, required: true },
		userId: { type: String, required: true },
		expiresAt: { type: Number, required: true },
		permission: { type: String, required: true },
		createdAt: { type: Number, default: () => Date.now() },
		unique_id: { type: String, required: true },
		lastToken: { type: String, required: true, default: "" },
		addedUser: { type: String, required: false },
	},
	{
		timestamps: false,
		strict: false,
	},
);

const Token = mongoose.model("Token", tokenSchema);

export default Token;

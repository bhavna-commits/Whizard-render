import mongoose from "mongoose";

// Updated Token schema with userId & agentId (one record per login)
const tokenSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true }, // owner id
		agentId: { type: String, required: true }, // same as userId if owner login, else added user id
		baseHash: { type: String, required: true },
		tokenType: { type: String, default: "" },
		expiresAt: { type: Number, required: true },
		permission: { type: mongoose.Schema.Types.Mixed, required: true },
		unique_id: { type: String, required: true },
		name: { type: String, required: true },
	},
	{ timestamps: true, strict: false },
);

// ensure one token per (userId, agentId) pair
tokenSchema.index({ userId: 1, agentId: 1 });

const Token = mongoose.model("Token", tokenSchema);

export default Token;

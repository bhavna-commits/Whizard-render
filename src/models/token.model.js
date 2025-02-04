import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
	{
		accessToken: String,
	},
	{
		timestamps: false,
		strict: false,
	},
);

const Token = mongoose.model("Token", tokenSchema);

export default Token;

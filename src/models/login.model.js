import mongoose from "mongoose";

const Login = new mongoose.Schema(
	{
		id: { type: String, required: true, index: true },
		type: { type: String, required: true, index: true },
		time: { type: Number, default: Date.now, index: true },
	},
	{ strict: false, timestamps: false },
);

export default mongoose.model("Login", Login);

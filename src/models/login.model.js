import mongoose from "mongoose";

const Login = new mongoose.Schema(
	{
		id: { type: String, required: true, index: true },
		time: { type: Number, default: Date.now, index: true },
		FB_PHONE_ID: { type: String, required: true, index: true },
        WABA_ID: { type: String, required: true, index: true },
	},
	{ strict: false, timestamps: false },
);

export default mongoose.model("Login", Login);

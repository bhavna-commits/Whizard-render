import { Schema, model } from "mongoose";

const paymentSchema = new Schema(
	{
		useradmin: { type: String, ref: "User", required: true, index: true },
		orderId: { type: String, required: true, unique: true },
		amount: { type: Number, required: true },
		paymentId: { type: String, required: true, index: true },
		currency: { type: String, required: true },
		paymentMode: {
			type: String,
			enum: ["razorpay", "stripe"],
			default: "stripe",
		},
		messagesCount: { type: Number },
		usersCount: { type: Number },
		status: {
			type: String,
			enum: ["created", "succeeded", "failed"],
			default: "created",
		},
		method: { type: String },
		failedReason: { type: String },
		receipt: { type: String },
		createdAt: { type: Number, default: Date.now },
		updatedAt: { type: Number, default: Date.now },
		agentName: { type: String },
		plan: { type: String },
		paymentType: {
			type: String,
			enum: ["credits", "plan"],
		},
	},
	{ timestamps: false, strict: false },
);

paymentSchema.pre("save", function (next) {
	this.updatedAt = Date.now();
	next();
});

const Payment = model("Payment", paymentSchema);
export default Payment;

import Stripe from "stripe";
import Razorpay from "razorpay";
import Payment from "../../models/payments.model.js";

export const handleStripePayment = async (
	{
		intentId,
		amount,
		user,
		ownerId,
		messages,
		paymentMode,
		name,
		plan,
		paymentType,
		credits,
	},
	stripe,
) => {
	let paymentIntent;

	if (intentId) {
		paymentIntent = await stripe.paymentIntents.update(intentId, {
			amount,
		});
	} else {
		paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency: user?.currency?.toLowerCase() || "inr",
		});
	}

	await Payment.create({
		useradmin: ownerId,
		orderId: paymentIntent.id,
		paymentId: paymentIntent.id,
		amount,
		currency: user?.currency || "INR",
		paymentMode,
		status: "created",
		messagesCount: credits ? credits : messages,
		usersCount: credits ? messages : 0,
		agentName: name,
		plan,
		paymentType,
	});

	return {
		success: true,
		clientSecret: paymentIntent.client_secret,
		intentId: paymentIntent.id,
	};
};

export const handleRazorpayPayment = async (
	{
		amount,
		user,
		ownerId,
		messages,
		paymentMode,
		name,
		plan,
		paymentType,
		credits,
	},
	razorpay,
) => {
	const paymentIntent = await razorpay.orders.create({
		amount,
		currency: user?.currency || "INR",
		payment_capture: 1,
	});

	await Payment.create({
		useradmin: ownerId,
		orderId: paymentIntent.id,
		paymentId: paymentIntent.id,
		amount,
		currency: user?.currency || "INR",
		paymentMode,
		status: "created",
		messagesCount: credits ? credits : messages,
		usersCount: credits ? messages : 0,
		agentName: name,
		plan,
		paymentType,
	});

	return {
		success: true,
		intentId: paymentIntent.id,
	};
};

export function getCards() {
	const paymentMode = process.env.PAYMENT_MODE;

	const stripe = new Stripe(process.env.STRIPE);
	const razorpay = new Razorpay({
		key_id: process.env.RAZORPAY_ID,
		key_secret: process.env.RAZORPAY_SECRET,
	});

	return { paymentMode, stripe, razorpay };
}

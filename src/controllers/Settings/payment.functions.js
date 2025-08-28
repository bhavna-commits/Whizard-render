import Stripe from "stripe";
import Razorpay from "razorpay";
import User from "../../models/user.model.js";
import Payment from "../../models/payments.model.js";
import cron from "node-cron";
import { agenda } from "../../config/db.js";
import { sendExpiryMail } from "../../services/OTP/expiryEmail.js";

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
	let payment;

	if (intentId) {
		paymentIntent = await stripe.paymentIntents.update(intentId, {
			amount,
		});

		payment = await Payment.findOneAndUpdate(
			{ orderId: intentId },
			{
				$set: {
					amount,
					messagesCount: credits ? credits : messages,
					usersCount: credits ? messages : 0,
					plan,
					paymentType,
					status: "created",
				},
			},
			{ new: true },
		);
	} else {
		paymentIntent = await stripe.paymentIntents.create({
			amount,
			currency: user?.currency?.toLowerCase() || "inr",
		});

		await Payment.findOneAndUpdate(
			{ orderId: paymentIntent.id },
			{
				$set: {
					useradmin: ownerId,
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
				},
			},
			{ upsert: true, new: true },
		);
	}

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
	let paymentIntent;

	paymentIntent = await razorpay.orders.create({
		amount,
		currency: user?.currency || "INR",
		payment_capture: 1,
	});

	await Payment.findOneAndUpdate(
		{ orderId: paymentIntent.id },
		{
			$set: {
				useradmin: ownerId,
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
			},
		},
		{ upsert: true, new: true },
	);

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

export async function scheduleExpiryJobs(user, expiryDate) {
	const email = user.email;
	const userId = user._id.toString();

	const date = new Date(expiryDate);

	// reminder (3 days before)
	const reminderDate = new Date(date.getTime() - 3 * 24 * 60 * 60 * 1000);
	if (reminderDate > new Date()) {
		await agenda.schedule(reminderDate, "send-expiry-email", {
			userId,
			email,
			expiryDate: date,
			type: "reminder",
		});
	}

	// expires today
	await agenda.schedule(date, "send-expiry-email", {
		userId,
		email,
		expiryDate: date,
		type: "today",
	});

	// expired (next day midnight)
	const expiredDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
	await agenda.schedule(expiredDate, "send-expiry-email", {
		userId,
		email,
		expiryDate: date,
		type: "expired",
	});

	console.log(`📅 Jobs scheduled for ${email}`);
}

export async function cancelExpiryJobs(userId) {
	await agenda.cancel({ "data.userId": userId });
	console.log(`🗑️ Cancelled old jobs for user ${userId}`);
}

agenda.define("send-expiry-email", async (job) => {
	const { userId, email, expiryDate, type } = job.attrs.data;
	console.log("📧 Sending", type, "email to", email);
	await sendExpiryMail(email, expiryDate, type);
});

// async function testExpiryEmails() {
// 	const email = "amit@viralpitch.co";
// 	const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

// 	// reminder email
// 	await sendExpiryMail(email, expiryDate, "reminder");
// 	console.log("✅ Reminder email sent");

// 	// expiry email
// 	await sendExpiryMail(email, expiryDate, "expiry");
// 	console.log("✅ Expiry email sent");

// 	// renewal success email
// 	await sendExpiryMail(email, expiryDate, "renewal_success");
// 	console.log("✅ Renewal success email sent");
// }

// testExpiryEmails();

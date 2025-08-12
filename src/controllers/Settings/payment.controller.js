import crypto from "crypto";
import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import Permissions from "../../models/permissions.model.js";
import Payment from "../../models/payments.model.js";
import { convertPlansToCurrency } from "../../utils/utilFunctions.js";
import { help } from "../../utils/dropDown.js";
import { isNumber, isString } from "../../middleWares/sanitiseInput.js";
import {
	handleRazorpayPayment,
	handleStripePayment,
	getCards,
} from "./payment.functions.js";

const basePlans = {
	3000: { currency: "INR", amount: 299 },
	5000: { currency: "INR", amount: 499 },
	10000: { currency: "INR", amount: 799 },
};

export const getPayment = async (req, res) => {
	try {
		let owner = req?.session?.user?.id || req.session?.addedUser?.owner;
		let user = await User.findOne({ unique_id: owner, deleted: false });
		let access;
		let paymentTableData;
		let page = parseInt(req.query.page) || 1;
		const limit = 4;
		let total = 0;

		if (owner) {
			if (!user) return res.status(404).render("errors/notFound");
			if (user.payment.plan === "unlimited")
				return res.status(404).render("errors/notAllowed");
		} else {
			id = req.session?.addedUser?.id;
			const addedUser = await AddedUser.findOne({ unique_id: id });
			if (!addedUser) return res.status(404).render("errors/serverError");
			access = await Permissions.findOne({ unique_id: addedUser.roleId });
		}

		const convertedPlans = await convertPlansToCurrency(
			basePlans,
			user.currency || "INR",
		);

		const { paymentMode } = getCards();

		paymentTableData = await Payment.findOne({
			useradmin: owner,
			status: "succeeded",
		});

		if (paymentTableData) {
			const result = await Payment.aggregate([
				{ $match: { useradmin: owner } },
				{ $sort: { createdAt: -1 } },
				{
					$facet: {
						data: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
						],
						totalCount: [{ $count: "count" }],
					},
				},
			]);

			paymentTableData = result[0]?.data || [];
			total = result[0]?.totalCount?.[0]?.count || 0;
		}

		res.render("Settings/payments", {
			access: access || user.access,
			user,
			plans: convertedPlans,
			photo: req.session?.user?.photo || req.session?.addedUser?.photo,
			name: req.session?.user?.name || req.session?.addedUser?.name,
			color: req.session?.user?.color || req.session?.addedUser?.color,
			help,
			paymentMode,
			paymentTableData,
			whatsAppStatus:
				req.session?.user?.whatsAppStatus ||
				req.session?.addedUser?.whatsAppStatus,
			page,
			totalPages: Math.ceil(total / limit),
			clientKeyRazorpay: process.env.RAZORPAY_CLIENT_KEY,
			clientKeyStripe: process.env.STRIPE_CLIENT_KEY,
		});
	} catch (error) {
		console.error("Payment Page Error:", error);
		res.render("errors/serverError");
	}
};

export const getIntent = async (req, res, next) => {
	try {
		const { messages, intentId } = req.body;

		if (!messages || !isNumber(messages)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid message count" });
		}

		if (
			!isString(intentId) &&
			intentId !== null &&
			intentId !== undefined
		) {
			return next();
		}

		const ownerId = req.session?.addedUser?.owner || req.session?.user?.id;
		const name = req.session?.addedUser?.name || req.session?.user?.name;

		const user = await User.findOne({ unique_id: ownerId });
		if (!user) throw new Error("User not found");

		const amount = basePlans[messages]?.amount;

		if (!amount) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid plan amount" });
		}

		const { paymentMode, stripe, razorpay } = getCards();

		const args = {
			intentId,
			amount: amount * 100,
			user,
			ownerId,
			messages,
			paymentMode,
			name,
			plan: messages,
		};

		const result =
			paymentMode === "stripe"
				? await handleStripePayment(args, stripe)
				: await handleRazorpayPayment(args, razorpay);

		user.payment.plan = messages;
		await user.save();

		res.status(201).json(result);
	} catch (err) {
		console.error("Payment Intent Error:", err);
		res.status(500).json({
			success: false,
			message: err?.message || err || "Server error",
		});
	}
};

// Success pages

export const getStripeConfirm = async (req, res) => {
	try {
		const owner = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;

		const {
			payment_intent,
			payment_intent_client_secret,
			redirect_status,
			error,
		} = req.query;

		let access;
		let photo =
			req.session?.user?.photo || req.session?.addedUser?.photo || "";
		let name =
			req.session?.user?.name || req.session?.addedUser?.name || "";
		let color =
			req.session?.user?.color || req.session?.addedUser?.color || "";

		if (addedUserId) {
			const addedUser = await AddedUser.findOne({
				unique_id: addedUserId,
			});
			access = await Permissions.findOne({ unique_id: addedUser.roleId });
		} else {
			const user = await User.findOne({ unique_id: owner });
			access = user?.access || {};
		}

		const order = await Payment.findOne({
			paymentId: payment_intent,
		});

		if (error || redirect_status !== "succeeded") {
			order.status = "failed";
			order.failedReason =
				error || "Unknown error or payment not completed";

			return res.render("Settings/payment/confirm", {
				intent: {
					id: payment_intent,
					status: "failed",
					description: error || "Payment failed or cancelled",
				},
				isRazorpay: false,
				error: true,
				access,
				photo,
				name,
				color,
				help,
			});
		}

		// success

		if (!order) {
			return res.render("Settings/payment/confirm", {
				intent: {
					id: payment_intent,
					status: "error",
					description: "Order not found",
				},
				isRazorpay: false,
				error: true,
				access,
				photo,
				name,
				color,
				help,
			});
		}

		order.status = "succeeded";
		await order.save();

		// await User.findOneAndUpdate(
		// 	{ unique_id: owner },
		// 	{ $inc: { totalMessages: order.messagesCount } },
		// );

		return res.render("Settings/payment/confirm", {
			intent: {
				id: payment_intent,
				status: "succeeded",
			},
			isRazorpay: false,
			error: false,
			access,
			photo,
			name,
			color,
			help,
		});
	} catch (err) {
		console.error("Stripe Payment Confirm Error:", err);

		await Payment.create({
			status: "failed",
			failedReason: err?.message || err,
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
		});

		const access = {};
		const photo =
			req.session?.user?.photo || req.session?.addedUser?.photo || "";
		const name =
			req.session?.user?.name || req.session?.addedUser?.name || "";
		const color =
			req.session?.user?.color || req.session?.addedUser?.color || "";

		res.render("Settings/payment/confirm", {
			intent: {
				id: null,
				status: "error",
				description: err?.message || "Server error",
			},
			isRazorpay: false,
			error: true,
			access,
			photo,
			name,
			color,
			help,
		});
	}
};

export const getRazorConfirm = async (req, res) => {
	try {
		const { id, status, method, desc } = req.query;
		const owner = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;

		let access = null;

		if (addedUserId) {
			const addedUser = await AddedUser.findOne({
				unique_id: addedUserId,
			});
			access = await Permissions.findOne({ unique_id: addedUser.roleId });
		} else {
			const user = await User.findOne({ unique_id: owner });
			access = user.access;
		}

		res.render("Settings/payment/confirm", {
			intent: {
				id,
				status,
				description: desc || null,
			},
			isRazorpay: method === "razorpay",
			error: status !== "succeeded",
			access,
			photo: req.session?.user?.photo || req.session?.addedUser?.photo,
			name: req.session?.user?.name || req.session?.addedUser?.name,
			color: req.session?.user?.color || req.session?.addedUser?.color,
			help,
		});
	} catch (err) {
		console.log(err);
		res.render("errors/serverError");
	}
};

export const razorConfirm = async (req, res) => {
	try {
		const owner = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;

		const {
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			error,
		} = req.body;

		const order = await Payment.findOne({ orderId: razorpay_order_id });
		if (!order) {
			return res.json({
				redirectUrl: `/settings/confirm-razorpay-payment?status=failed&id=${razorpay_payment_id}&method=razorpay&desc=${encodeURIComponent(
					description,
				)}`,
			});
		}

		if (error) {
			const { code, description, field } = error;

			order.failedReason = description;
			order.status = "failed";
			await order.save();

			return res.json({
				redirectUrl: `/settings/confirm-razorpay-payment?status=failed&id=${razorpay_payment_id}&method=razorpay&desc=${encodeURIComponent(
					description,
				)}`,
			});
		}

		const generated_signature = crypto
			.createHmac("sha256", process.env.RAZORPAY_SECRET)
			.update(razorpay_order_id + "|" + razorpay_payment_id)
			.digest("hex");

		if (generated_signature !== razorpay_signature) {
			order.status = "failed";
			order.description = "Invalid signature";
			await order.save();

			return res.json({
				redirectUrl: `/settings/confirm-razorpay-payment?status=failed&id=${razorpay_payment_id}&method=razorpay&desc=${encodeURIComponent(
					description,
				)}`,
			});
		}

		order.status = "succeeded";
		order.paymentId = razorpay_payment_id;
		await order.save();

		// await User.findOneAndUpdate(
		// 	{ unique_id: owner },
		// 	{ $inc: { totalMessages: order.messagesCount } },
		// );

		let access = null;

		if (addedUserId) {
			const addedUser = await AddedUser.findOne({
				unique_id: addedUserId,
			});
			access = await Permissions.findOne({ unique_id: addedUser.roleId });
		} else {
			const user = await User.findOne({ unique_id: owner });
			access = user.access;
		}

		return res.json({
			redirectUrl: `/settings/confirm-razorpay-payment?status=succeeded&id=${razorpay_payment_id}&method=razorpay`,
		});
	} catch (err) {
		console.log("Error confirming payemnt :", err);
		res.render("errors/serverError");
	}
};

// Web Hooks

export const razorpayWebhook = async (req, res) => {
	try {
		console.log("🪝 Razorpay webhook received");
		const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
		const signature = req.headers["x-razorpay-signature"];

		const body = JSON.stringify(req.body);
		const expectedSignature = crypto
			.createHmac("sha256", secret)
			.update(body)
			.digest("hex");

		if (signature !== expectedSignature) {
			console.error("❌ Invalid Razorpay signature");
			return res.status(400).send("Invalid signature");
		}

		const { event, payload } = req.body;
		console.log("📢 Razorpay event:", event);

		if (event === "payment.captured" || event === "payment.failed") {
			const p = payload.payment.entity;
			console.log("🔍 Payment entity:", p.id, "Order:", p.order_id);

			const payment = await Payment.findOne({ orderId: p.order_id });
			if (!payment) {
				console.error("⚠️ Payment not found for orderId:", p.order_id);
				return res.status(404).send("Payment not found");
			}

			const update = {
				status: event === "payment.captured" ? "succeeded" : "failed",
				paymentId: p.id,
				method: p.method,
				updatedAt: Date.now(),
			};

			if (event === "payment.failed") {
				update.failedReason = p.error_description || "Unknown failure";
			}

			console.log("💾 Updating payment:", payment._id);
			console.table(update);
			await Payment.updateOne({ _id: payment._id }, update);

			if (update.status === "succeeded") {
				console.log(
					"✅ Payment succeeded for user:",
					payment.useradmin,
				);
				const user = await User.findOne({
					unique_id: payment.useradmin,
				});
				if (user) {
					const previousCount = user.payment?.messagesCount || 0;
					const newTotal = payment.messagesCount || 0;

					console.log("💬 Updating message counts");
					console.table({
						previousCount,
						addedCount: newTotal,
						newTotal: newTotal + previousCount,
					});

					await User.updateOne(
						{ unique_id: payment.useradmin },
						{
							$set: {
								"payment.previousMessagesCount": previousCount,
								"payment.totalMessages":
									newTotal + previousCount,
							},
						},
					);
				}
			}
		}

		if (event === "order.paid" || event === "order.failed") {
			const o = payload.order.entity;
			console.log("🔍 Order entity:", o.id);

			const payment = await Payment.findOne({ orderId: o.id });
			if (!payment) {
				console.error("⚠️ Payment not found for orderId:", o.id);
				return res.status(404).send("Payment not found");
			}

			const update = {
				status: event === "order.paid" ? "succeeded" : "failed",
				updatedAt: Date.now(),
			};

			if (event === "order.failed") {
				update.failedReason = "Order payment failed";
			}

			console.log("💾 Updating payment:", payment._id);
			console.table(update);
			await Payment.updateOne({ _id: payment._id }, update);

			if (update.status === "succeeded") {
				console.log("✅ Order succeeded for user:", payment.useradmin);
				await User.findOneAndUpdate(
					{ unique_id: payment.useradmin },
					{ messagesCount: payment.messagesCount },
				);
			}
		}

		res.status(200).json({ status: "ok" });
	} catch (err) {
		console.error("❌ Webhook error:", err);
		res.status(500).json({ error: "Webhook failed" });
	}
};

export const stripeWebhook = async (req, res) => {
	console.log("🪝 Stripe webhook received");
	const sig = req.headers["stripe-signature"];
	const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

	const { stripe } = getCards();

	let event;
	try {
		event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
	} catch (err) {
		console.error("❌ Invalid Stripe signature:", err.message);
		return res.status(400).json("Invalid Stripe signature");
	}

	try {
		console.log("📢 Stripe event:", event.type);
		const pi = event.data.object;
		console.log("🔍 Payment Intent:", pi.id);

		const payment = await Payment.findOne({ paymentId: pi.id });
		if (!payment) {
			console.error("⚠️ Payment not found for paymentId:", pi.id);
			return res.status(404).json("Payment not found");
		}

		const update = {
			paymentId: pi.id,
			method: pi.payment_method_types[0],
			updatedAt: Date.now(),
		};

		if (event.type === "payment_intent.succeeded") {
			update.status = "succeeded";
		} else if (event.type === "payment_intent.payment_failed") {
			update.status = "failed";
			update.failedReason =
				pi.last_payment_error?.message || "Unknown failure";
		}

		console.log("💾 Updating payment:", payment._id);
		console.table(update);
		await Payment.updateOne({ _id: payment._id }, update);

		const user = await User.findOne({ unique_id: payment.useradmin });
		if (user && update.status === "succeeded") {
			const previousCount = user.payment?.messagesCount || 0;
			const newTotal = payment.messagesCount || 0;

			console.log("💬 Updating message counts");
			console.table({
				previousCount,
				addedCount: newTotal,
				newTotal: newTotal + previousCount,
			});

			await User.updateOne(
				{ unique_id: payment.useradmin },
				{
					$set: {
						"payment.previousMessagesCount": previousCount,
						"payment.totalMessages": newTotal + previousCount,
					},
				},
			);
		}

		res.status(200).json({ received: true });
	} catch (err) {
		console.error("❌ Stripe webhook error:", err);
		res.status(500).json({ error: "Stripe webhook failed" });
	}
};

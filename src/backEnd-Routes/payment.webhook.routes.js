// backEnd-Routes/payment.webhook.routes.js
import express from "express";
import {
	razorpayWebhook,
	stripeWebhook,
} from "../controllers/Settings/payment.controller.js";

const router = express.Router();

router.post(
	"/razorpay_webhook",
	express.json(),
	razorpayWebhook,
);

router.post(
	"/stripe_webhook",
	express.raw({ type: "application/json" }),
	stripeWebhook,
);

export default router;

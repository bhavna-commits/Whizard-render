import express from "express";
import {
	home,
	profile,
	accountDetails,
	getActivityLogs,
	activityLogsFiltered,
	getUserManagement,
	getCreatePassword,
	getPermissions,
	whatsAppAccountDetails,
} from "../controllers/Settings/settings.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
import {
	getPayment,
	getStripeConfirm,
	getRazorConfirm,
	razorConfirm,
} from "../controllers/Settings/payment.controller.js";

const router = express.Router();

router.get("/", home, trackSanitationFailures);
router.get("/profile", profile, trackSanitationFailures);
router.get("/account-details", accountDetails, trackSanitationFailures);
router.get(
	"/whatsapp-account-details",
	whatsAppAccountDetails,
	trackSanitationFailures,
);
router.get("/activity-logs", getActivityLogs, trackSanitationFailures);
router.get("/payments", getPayment, trackSanitationFailures);
router.get(
	"/activity-logs/filtered",
	activityLogsFiltered,
	trackSanitationFailures,
);
router.get("/user-management", getUserManagement, trackSanitationFailures);
router.get(
	"/user-management/permissions",
	getPermissions,
	trackSanitationFailures,
);
router.get("/confirm-stripe-payment", getStripeConfirm);

router.get("/confirm-razorpay-payment", getRazorConfirm);

router.post("/confirm-payment", razorConfirm);

export default router;

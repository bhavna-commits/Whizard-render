import express from "express";
import {
	addNumber,
	verifyNumber,
	selectPhoneNumber,
	deletePhoneNumber,
	sendOtpController,
	set2FAPin,
	refreshPhoneNumbers,
} from "../controllers/Dashboard/dashboard.controller.js";

import {
	toggleStatus,
	resetUserAccount,
	deleteAccountEmail,
	verifyDeleteOTP,
	changeSuperAdminEmail,
	verifySuperAdminEmailOTP,
	togglePaymentPlace,
	renewAdminToken,
	migrate,
	togglePaymentPlan,
} from "../controllers/Dashboard/adminPanel.controller.js";

import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
import { checkAdminSession } from "../middleWares/checkSession.js";

const router = express.Router();

router.post("/add-number", addNumber, trackSanitationFailures);

router.post("/verify-number", verifyNumber, trackSanitationFailures);

router.post("/select-number", selectPhoneNumber, trackSanitationFailures);

router.delete("/delete-phone-number", deletePhoneNumber);

router.post("/send-otp", sendOtpController);

router.post("/set-2FA-pin", set2FAPin);

router.get("/refresh-phone-numbers", refreshPhoneNumbers);

router.post("/:id/toggleStatus", checkAdminSession, toggleStatus);

router.post("/:id/reset", checkAdminSession, resetUserAccount);

router.post("/:id/delete-email", checkAdminSession, deleteAccountEmail);

router.post(
	"/change-superadmin-email-otp",
	checkAdminSession,
	changeSuperAdminEmail,
);

router.post(
	"/verify-superadmin-email",
	checkAdminSession,
	verifySuperAdminEmailOTP,
);

router.post("/:id/verify-delete", checkAdminSession, verifyDeleteOTP);

router.post("/:id/toggle-payment-place", checkAdminSession, togglePaymentPlace);

router.post(
	"/:id/toggle-payment-plan",
	checkAdminSession,
	togglePaymentPlan,
);

router.get("/run-migration", checkAdminSession, migrate);

router.post("/renew-admin-token", checkAdminSession, renewAdminToken);

export default router;

import express from "express";
import {
	addNumber,
	verifyNumber,
	selectPhoneNumber,
	deletePhoneNumber,
	sendOtpController,
	set2FAPin,
	refreshPhoneNumbers,
	migrate,
} from "../controllers/Dashboard/dashboard.controller.js";

import {
	toggleStatus,
	resetUserAccount,
	deleteAccountEmail,
	verifyDeleteOTP,
	changeSuperAdminEmail,
	verifySuperAdminEmailOTP,
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

router.post("/:id/toggleStatus", toggleStatus);

router.post("/:id/reset", resetUserAccount);

router.post("/:id/delete-email", checkAdminSession, deleteAccountEmail);

router.post("/change-superadmin-email-otp", checkAdminSession, changeSuperAdminEmail);

router.post(
	"/verify-superadmin-email",
	checkAdminSession,
	verifySuperAdminEmailOTP,
);

router.post("/:id/verify-delete", verifyDeleteOTP);

export default router;

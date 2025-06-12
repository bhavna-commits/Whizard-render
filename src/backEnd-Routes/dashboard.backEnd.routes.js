import express from "express";
import {
	addNumber,
	verifyNumber,
	selectPhoneNumber,
	deletePhoneNumber,
	sendOtpController,
	set2FAPin,
	refreshPhoneNumbers,
	toggleStatus,
	resetUserAccount,
} from "../controllers/Dashboard/dashboard.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

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

export default router;

import express from "express";
import {
	generateOTP,
	verifyEmail,
	resendEmailOTP,
	about,
	resetPassword,
	login,
	changePassword,
	logout,
	resendWhatsAppOTP,
} from "../controllers/User/userController.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post("/generateOTP", generateOTP, trackSanitationFailures);
router.post("/verify-email", verifyEmail, trackSanitationFailures);
router.post("/resend-email-otp", resendEmailOTP, trackSanitationFailures);
router.post("/resend-whatsapp-otp", resendWhatsAppOTP, trackSanitationFailures);
router.post("/resetPassword", resetPassword, trackSanitationFailures);
router.post("/about", about, trackSanitationFailures);
router.post("/login", login, trackSanitationFailures);
router.post("/logout", logout, trackSanitationFailures);
router.post("/changePassword", changePassword, trackSanitationFailures);

export default router;

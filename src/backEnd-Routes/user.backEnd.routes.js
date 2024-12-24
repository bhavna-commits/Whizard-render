import express from "express";
import {
	generateOTP,
	verifyEmail,
	resendEmailOTP,
	about,
	resetPassword,
	login,
	changePassword,
} from "../controllers/User/userController.js";

const router = express.Router();

router.post("/generateOTP", generateOTP);
router.post("/verify-email", verifyEmail);
router.post("/resend-email-otp", resendEmailOTP);
router.post("/resetPassword", resetPassword);
router.post("/about", about);	
router.post("/login", login);
router.post("/changePassword", changePassword);

export default router;

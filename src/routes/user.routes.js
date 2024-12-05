import express from "express";
import {
  generateOTP,
  verifyEmail,
  verifyWhatsAppNumber,
  resendEmailOTP,
  about,
  resetPassword,
  login,
  changePassword,
} from "../controllers/User/userController.js";

const router = express.Router();

// Register user and send email & phone number verification
router.post("/generateOTP", generateOTP);

// Verify email using token
router.post("/verify-email", verifyEmail);

// Verify WhatsApp phone number using OTP
router.post("/verify-phone", verifyWhatsAppNumber);

router.post("/resend-email-otp", resendEmailOTP);
router.post("/resetPassword", resetPassword);
router.post("/about", about);
router.post("/login", login);
router.post("/changePassword", changePassword);

export default router;

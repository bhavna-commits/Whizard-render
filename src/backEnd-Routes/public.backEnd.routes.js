import express from "express";
import {
	apiKeyMiddleware,
	rateLimitMiddleware,
	sendAuthTemplateOTP,
} from "../controllers/Templates/authentication.functions.js";

const router = express.Router();

router.post(
	"/send-auth-template-otp",
	apiKeyMiddleware,
	rateLimitMiddleware,
	sendAuthTemplateOTP,
);  

export default router;
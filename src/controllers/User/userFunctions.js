import crypto from "crypto";
import { sendVerificationEmail } from "../../services/OTP/emailOTPService.js";
// import { sendWhatsAppOTP, verifyOTP } from "../../services/OTP/whatsAppOTPService.js";

// Generate email verification token
export const generateEmailToken = () => {
	const token = crypto.randomBytes(20).toString("hex");
	const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
	return { token, hashedToken };
};

// Send verification email
export const sendEmailVerification = async (email, token) => {
	try {
		await sendVerificationEmail(email, token);
	} catch (error) {
		throw error;
	}
};

export const sendOTPOnWhatsApp = async (email, token) => {
	try {
		await sendVerificationEmail(email, token);
	} catch (error) {
		throw error;
	}
};

// Verify the email token
export const verifyEmailToken = (incomingToken, storedToken, tokenExpiry) => {
	const hashedIncomingToken = crypto
		.createHash("sha256")
		.update(incomingToken)
		.digest("hex");
	if (hashedIncomingToken !== storedToken || Date.now() > tokenExpiry) {
		return false;
	}
	return true;
};

const friendlyColors = [
	"#FFB6C1",
	"#FF69B4",
	"#FFA07A",
	"#8FBC8F",
	"#20B2AA",
	"#87CEFA",
	"#4682B4",
	"#9370DB",
	"#FFD700",
];

export const getRandomColor = () => {
	return friendlyColors[Math.floor(Math.random() * friendlyColors.length)];
};


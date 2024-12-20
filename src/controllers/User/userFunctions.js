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
    throw new Error("Failed to send verification email");
  }
};

// Send WhatsApp OTP
// export const sendWhatsAppVerification = async (phoneNumber, countryCode) => {
//   try {
//     await sendWhatsAppOTP(phoneNumber, countryCode);
//   } catch (error) {
//     throw new Error("Failed to send WhatsApp OTP");
//   }
// };

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

// Verify the WhatsApp OTP
// export const verifyWhatsAppOTP = (phoneNumber, countryCode, otp) => {
//   const isValid = verifyOTP(phoneNumber, countryCode, otp);
//   return isValid;
// };

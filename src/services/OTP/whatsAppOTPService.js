import twilio from "twilio";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// In-memory store for OTPs (in production, consider using Redis or a DB)
const otpStore = {};

// Function to generate random OTP
const generateRandomOTP = () => Math.floor(100000 + Math.random() * 900000); // 6-digit OTP

// Send WhatsApp OTP
export const sendWhatsAppOTP = async (phoneNumber, countryCode) => {
  try {
    const fullPhoneNumber = `${countryCode}${phoneNumber}`;
    const otp = generateRandomOTP();

    const message = await client.messages.create({
      from: "whatsapp:+14155238886",
      to: `whatsapp:${fullPhoneNumber}`,
      body: `Your verification code is: ${otp}`,
    });

    // Store OTP with an expiry (5 minutes)
    otpStore[fullPhoneNumber] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 minutes expiry

    console.log("WhatsApp OTP sent:", message.sid);
    return message;
  } catch (error) {
    console.error("Error sending WhatsApp OTP:", error);
    throw error;
  }
};

// Verify the WhatsApp OTP
export const verifyOTP = (phoneNumber, countryCode, inputOtp) => {
  const fullPhoneNumber = `${countryCode}${phoneNumber}`;
  const storedOtpDetails = otpStore[fullPhoneNumber];

  // Check if OTP exists and is still valid
  if (!storedOtpDetails || Date.now() > storedOtpDetails.expiresAt) {
    return false; // OTP expired or doesn't exist
  }

  // Verify the OTP
  const isOtpValid = storedOtpDetails.otp === parseInt(inputOtp, 10);

  if (isOtpValid) {
    // OTP is valid, delete it from the store to prevent reuse
    delete otpStore[fullPhoneNumber];
  }

  return isOtpValid;
};

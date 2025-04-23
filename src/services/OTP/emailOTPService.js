import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

const transporter = nodemailer.createTransport({
	host: "smtp.gmail.com",
	port: 465,
	secure: true,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.EMAIL_PASSWORD,
	},
});

// Function to send verification email
export const sendVerificationEmail = async (userEmail, otp) => {
	const mailOptions = {
		from: process.env.EMAIL_USER,
		to: userEmail,
		subject: "Email Verification for Whizard",
		html: `
      <html>
        <body style="background-color: #f4f7fc; font-family: 'Arial', sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <!-- Header with logo -->
            <div style="text-align: center; padding: 10px 0;">
              <img src="cid:whizz_logo" alt="Whizz Logo" style="max-width: 150px;" />
            </div>
            <!-- Main content -->
            <div style="padding: 0px 10px; text-align: center;">
              <h4 style="font-size: 24px; margin-bottom: 15px; color: black;">Verify Your Email</h4>
              <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
                We noticed a recent activity on your Whizz account. To ensure the security of your information, we’ve sent you an OTP.
              </p>
              <p style="font-size: 18px; font-weight: bold; margin-bottom: 15px;">
                Your OTP is: <strong style="font-size: 24px; color: #4a90e2;">${otp}</strong>
              </p>
              <p style="font-size: 14px; color: #777;">This OTP is valid for the next 3 minutes.</p>
            </div>
            <!-- Footer -->
            <div style="background-color: #f4f7fc; text-align: center; padding: 15px;">
              <p style="font-size: 12px; color: #999;">If you didn’t initiate this request, please disregard this email. For any suspicious activity, contact us at <a href="mailto:contact@whizardapi.com" style="color: #4a90e2;">contact@whizardapi.com</a></p>
            </div>
          </div>
        </body>
      </html>
    `,
		attachments: [
			{
				filename: "whizz_logo.png",
				path: "./public/assets/img/Wizard_logo.png",
				cid: "whizz_logo",
			},
		],
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("Verification email sent: ", info.response);
	} catch (error) {
		console.error("Error sending verification email:", error);
		throw error;
	}
};

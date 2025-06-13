import { sendMail } from "./emailService.js";

export default async function sendDeleteAccountEmail(toEmail, otp) {
	const mailOptions = {
		to: toEmail,
		subject: "Confirm Your Account Deletion - Whizard",
		html: `
            <html>
                <body style="background-color: #f4f7fc; font-family: 'Figtree', sans-serif; padding: 20px;">
                    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                        <div style="text-align: center; padding: 10px 0;">
                            <img src="cid:whizz_logo" alt="Whizz Logo" style="max-width: 150px;" />
                        </div>
                        <div style="padding: 20px; text-align: center;">
                            <h2>Confirm Deletion</h2>
                            <p>To confirm deletion of your Whizard account, please enter the OTP below:</p>
                            <h1 style="letter-spacing: 5px; font-size: 36px; margin: 20px 0; color: #000;">${otp}</h1>
                            <p>This OTP will expire in 3 minutes. If you didn't request this, you can safely ignore this email.</p>
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

	await sendMail(mailOptions);
}

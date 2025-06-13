import { sendMail } from "./emailService.js";

export default async function sendAddUserMail(name, invitationLink, email) {
	const mailOptions = {
		to: email,
		subject: "Invitation to Join Whizard",
		html: `
                <html>
                    <body style="background-color: #f4f7fc; font-family: 'Figtree', sans-serif; padding: 20px;">
                        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                            <div style="text-align: center; padding: 10px 0;">
                                <img src="cid:whizz_logo" alt="Whizz Logo" style="max-width: 150px;" />
                            </div>
                            <div style="padding: 20px; text-align: center;">
                                <h2>You've Been Invited!</h2>
                                <p>You've been invited to join Whizard by ${name}.</p>
                                <p>Click the button below to set up your account:</p>
                                <a href="${invitationLink}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 20px;">Set Up Password</a>
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


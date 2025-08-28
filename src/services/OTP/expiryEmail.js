import { sendMail } from "./emailService.js";
import ejs from "ejs";
import path from "path";

const __dirname = path.resolve();

export async function sendExpiryMail(to, expiryDate, type) {
	try {
		const templatePath = path.join(
			__dirname,
			"views/emails/planExpiry.ejs",
		);

		const html = await ejs.renderFile(templatePath, {
			type,
			expiryDate: expiryDate.toDateString(),
		});

		const mailOptions = {
			to,
			subject:
				type === "reminder"
					? "Your plan expires in 3 days – Don’t lose access"
					: type === "today"
					? "Last chance – Your plan expires today"
					: "Your plan has expired – Reactivate to continue",
			html,
			attachments: [
				{
					filename: "whizz_logo.png",
					path: "./public/assets/img/Wizard_logo.png",
					cid: "whizz_logo",
				},
			],
		};
		await sendMail(mailOptions);
	} catch (error) {
		console.error("Error sending expiry email:", error);
	}
}

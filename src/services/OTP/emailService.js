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

export async function sendMail({
	to,
	subject,
	html,
	attachments = [],
	cc,
	bcc,
	from = process.env.EMAIL_USER,
}) {
	const mailOptions = {
		from,
		to,
		subject,
		html,
		attachments,
		cc,
		bcc,
	};

	try {
		const info = await transporter.sendMail(mailOptions);
		console.log(`Email sent to ${to}: ${info.response}`);
	} catch (err) {
		console.error("Error sending email:", err);
		throw err;
	}
}

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
		console.log("📨 Sending email to:", to);
		const info = await transporter.sendMail(mailOptions);
		console.log(`✅ Email sent to ${to}: ${info.response}`);
	} catch (err) {
		console.error("❌ Error sending email:", err.message);
		throw err;
	}

}

// .........................................................................................................

// import dotenv from "dotenv";
// import sgMail from "@sendgrid/mail";
// import fs from "fs";
// import path from "path";

// dotenv.config();
// sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// export async function sendMail({
// 	to,
// 	subject,
// 	html,
// 	attachments = [],
// 	cc,
// 	bcc,
// 	from = process.env.EMAIL_USER,
// }) {
// 	const formattedAttachments = attachments.map((file) => {
// 		const filePath = path.resolve(file.path);
// 		const fileContent = fs.readFileSync(filePath).toString("base64");

// 		const attachmentObj = {
// 			content: fileContent,
// 			filename: file.filename,
// 			type: file.type || "application/octet-stream",
// 			disposition: file.cid ? "inline" : "attachment",
// 		};

// 		if (file.cid) {
// 			attachmentObj.content_id = file.cid;
// 		}

// 		return attachmentObj;
// 	});

// 	const msg = {
// 		to,
// 		from,
// 		subject,
// 		html,
// 		cc,
// 		bcc,
// 		attachments: formattedAttachments,
// 	};

// 	try {
// 		await sgMail.send(msg);
// 		console.log(`✅ Email sent to ${msg.to}`);
// 	} catch (error) {
// 		console.error("❌ Error sending email:", error);
// 		if (error.response) {
// 			console.error(error.response.body);
// 		}
// 		throw error;
// 	}
// }

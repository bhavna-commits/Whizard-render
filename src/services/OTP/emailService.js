import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import fs from "fs";
import path from "path";

dotenv.config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendMail({
	to,
	subject,
	html,
	attachments = [],
	cc,
	bcc,
	from = process.env.EMAIL_USER,
}) {
	const formattedAttachments = attachments.map((file) => {
		const filePath = path.resolve(file.path);
		const fileContent = fs.readFileSync(filePath).toString("base64");

		const attachmentObj = {
			content: fileContent,
			filename: file.filename,
			type: file.type || "application/octet-stream",
			disposition: file.cid ? "inline" : "attachment",
		};

		if (file.cid) {
			attachmentObj.content_id = file.cid;
		}

		return attachmentObj;
	});

	const msg = {
		to,
		from,
		subject,
		html,
		cc,
		bcc,
		attachments: formattedAttachments,
	};

	try {
		await sgMail.send(msg);
		console.log(`✅ Email sent to ${msg.to}`);
	} catch (error) {
		console.error("❌ Error sending email:", error);
		if (error.response) {
			console.error(error.response.body);
		}
		throw error;
	}
}

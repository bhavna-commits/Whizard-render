import ejs from "ejs";
import path from "path";
import { overview } from "../../controllers/Report/reports.functions.js";
import User from "../../models/user.model.js";
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

const __dirname = path.resolve();

export const sendCampaignReportEmail = async (campaignId, userId) => {
	try {
		console.log(campaignId, userId);
		const user = await User.findOne({ unique_id: userId });
		if (!user?.email) throw new Error("User email not found");

		// Fetch campaign report data
		const limit = 6;
		const skip = 0;
		const campaignsData = await overview(
			campaignId,
			userId,
			1,
			limit,
			skip,
		);
		const paginatedResults = campaignsData[0]?.paginatedResults || [];

		paginatedResults.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					report.contactName = contact.Name;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					report.contactName = contact.Name;
				}

				const status = report.status.toLowerCase();
				switch (status) {
					case "failed":
						report.statusBgColor = "rgba(224, 36, 36, 0.2)";
						report.statusTextColor = "rgba(224, 36, 36, 1)";
						break;
					case "sent":
						report.statusBgColor = "rgba(255, 0, 255, 0.2)";
						report.statusTextColor = "rgba(255, 0, 255, 1)";
						break;
					case "delivered":
						report.statusBgColor = "rgba(255, 124, 156, 0.2)";
						report.statusTextColor = "rgba(255, 124, 156, 1)";
						break;
					case "read":
						report.statusBgColor = "rgba(255, 136, 1, 0.2)";
						report.statusTextColor = "rgba(255, 136, 1, 1)";
						break;
					case "replied":
						report.statusBgColor = "rgba(3, 126, 142, 0.2)";
						report.statusTextColor = "rgba(3, 126, 142, 1)";
						break;
					default:
						report.statusBgColor = "rgba(128, 128, 128, 0.2)";
						report.statusTextColor = "rgba(128, 128, 128, 1)";
				}
			});
		});

		// Prepare EJS data
		const ejsData = {
			campaigns: paginatedResults[0]?.reports || [],
			totalMessages: paginatedResults[0]?.totalMessages || 0,
			messagesSent: paginatedResults[0]?.messagesSent || 0,
			messagesDelivered: paginatedResults[0]?.messagesDelivered || 0,
			messagesRead: paginatedResults[0]?.messagesRead || 0,
			messagesReplied: paginatedResults[0]?.messagesReplied || 0,
			messagesFailed: paginatedResults[0]?.messagesFailed || 0,
			percentSent:
				(paginatedResults[0]?.percentSent?.toFixed(2) || 0) + "%",
			percentDelivered:
				(paginatedResults[0]?.percentDelivered?.toFixed(2) || 0) + "%",
			percentRead:
				(paginatedResults[0]?.percentRead?.toFixed(2) || 0) + "%",
		};

		// Render EJS template
		const templatePath = path.join(
			__dirname,
			"views/emails/campaignReport.ejs",
		);
		const html = await ejs.renderFile(templatePath, ejsData);

		// Configure email options
		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: user.email,
			subject: `Campaign Report - ${campaignId}`,
			html,
			attachments: [
				{
					filename: "whizz_logo.png",
					path: "./public/assets/img/Wizard_logo.png",
					cid: "whizz_logo",
				},
			],
		};

		// Send email
		await transporter.sendMail(mailOptions);
		console.log(`Report email sent for campaign ${campaignId}`);
	} catch (error) {
		console.error("Error sending report email:", error);
		throw error;
	}
};

export const sendCampaignScheduledEmail = async (
	userEmail,
	campaignName,
	scheduledTime,
) => {
	try {
		const templatePath = path.join(
			__dirname,
			"views/emails/campaignScheduled.ejs",
		);

		// Render EJS template
		const html = await ejs.renderFile(templatePath, {
			campaignName,
			scheduledTime: new Date(scheduledTime).toLocaleString(),
		});

		const mailOptions = {
			from: process.env.EMAIL_USER,
			to: userEmail,
			subject: `Campaign Scheduled: ${campaignName}`,
			html,
			attachments: [
				{
					filename: "whizz_logo.png",
					path: "./public/assets/img/Wizard_logo.png",
					cid: "whizz_logo",
				},
			],
		};

		await transporter.sendMail(mailOptions);
		console.log("Scheduled confirmation email sent to:", userEmail);
	} catch (error) {
		console.error("Error sending scheduled confirmation email:", error);
		throw error;
	}
};

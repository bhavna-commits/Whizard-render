import dotenv from "dotenv";
import cron from "node-cron";
import axios from "axios";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";

dotenv.config();

export async function sendMessages(campaign, id, unique_id) {
	try {
		// Find the template by unique_id
		const template = await Template.findOne({
			unique_id: campaign.templateId,
		});

		if (!template) {
			throw new Error(
				`Template with ID ${campaign.templateId} not found`,
			);
		}

		// Find contacts by contactListId
		const contactList = await Contacts.find({
			contactId: campaign.contactListId,
		});

		if (contactList.length === 0) {
			throw new Error(
				`No contacts found for contact list ID ${campaign.contactListId}`,
			);
		}

		// Loop through each contact in the contact list
		for (let contact of contactList) {
			// Replace dynamic variables in the template with contact-specific data
			const personalizedMessage = replaceDynamicVariables(
				template,
				campaign.variables,
				contact,
			);

			// Send message using WhatsApp (assuming wa_id is the phone number)
			const response = await sendMessageThroughWhatsApp(
				template.name,
				contact.wa_id, // Use wa_id as the recipient's phone number
				personalizedMessage,
			);

			if (response.status === "FAILED") {
				console.error(
					`Failed to send message to ${contact.wa_id}: ${response.response}`,
				);
				throw new Error(
					`Failed to send message to ${contact.wa_id}: ${response.response}`,
				);
			}

			// Create a report for each sent message
			const report = new Report({
				useradmin: id,
				unique_id,
				campaignId: campaign.unique_id,
				recipientPhone: contact.wa_id,
				status: response.status,
			});
			await report.save();
		}

		// Update the campaign status to 'SENT' after messages are sent
		await Campaign.findByIdAndUpdate(campaign._id, { status: "SENT" });
	} catch (error) {
		console.error("Error sending messages:", error.message);
		throw new Error(`Error sending messages: ${error.message}`);
	}
}

function replaceDynamicVariables(template, variables, contact) {
	const messageComponents = [];

	try {
		// Process dynamic variables in Headers
		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (headerComponent) {
			let headerParameters = [];
			if (headerComponent.format === "TEXT") {
				let headerText = headerComponent.text || "";
				for (let [key, value] of Object.entries(variables)) {
					headerText = headerText.replace(
						`{${key}}`,
						contact.masterExtra[value] || "",
					);
				}
				headerParameters.push({ type: "text", text: headerText });
			} else if (
				["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)
			) {
				const mediaUrl = headerComponent.example?.header_handle[0];
				if (mediaUrl) {
					headerParameters.push({
						type: headerComponent.format.toLowerCase(),
						link: mediaUrl,
					});
				}
			}

			if (headerParameters.length > 0) {
				messageComponents.push({
					type: "header",
					parameters: headerParameters,
				});
			}
		}

		// Process dynamic variables in Body
		const bodyComponent = template.components.find(
			(c) => c.type === "BODY",
		);
		if (bodyComponent) {
			let bodyText = bodyComponent.text;
			for (let [key, value] of Object.entries(variables)) {
				bodyText = bodyText.replace(
					`{${key}}`,
					contact.masterExtra[value] || "",
				);
			}
			messageComponents.push({
				type: "body",
				parameters: [{ type: "text", text: bodyText }],
			});
		}

		// Process dynamic variables in Footers
		const footerComponent = template.components.find(
			(c) => c.type === "FOOTER",
		);
		if (footerComponent) {
			let footerText = footerComponent.text;
			for (let [key, value] of Object.entries(variables)) {
				footerText = footerText.replace(
					`{${key}}`,
					contact.masterExtra[value] || "",
				);
			}
			messageComponents.push({
				type: "footer",
				parameters: [{ type: "text", text: footerText }],
			});
		}

		return messageComponents;
	} catch (error) {
		console.error("Error replacing dynamic variables:", error.message);
		throw new Error(`Error replacing dynamic variables: ${error.message}`);
	}
}

async function sendMessageThroughWhatsApp(name, phone, messageComponents) {
	try {
		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${process.env.FB_PHONE_ID}/messages`,
			{
				messaging_product: "whatsapp",
				to: phone,
				type: "template",
				template: {
					name: name,
					language: { code: "en_US" },
					components: messageComponents,
				},
			},
			{
				headers: {
					Authorization: `Bearer ${process.env.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		return { status: "SENT", response: response.data };
	} catch (error) {
		console.error(
			"Error sending WhatsApp message:",
			error.response?.data || error.message,
		);
		return {
			status: "FAILED",
			response: error.response?.data || error.message,
		};
	}
}

cron.schedule("* * * * *", async () => {
	try {
		const now = new Date();

		const scheduledCampaigns = await Campaign.find({
			scheduledAt: { $lte: now },
			status: "SCHEDULED",
		});

		for (let campaign of scheduledCampaigns) {
			await sendMessages(campaign);
			await Campaign.findByIdAndUpdate(campaign._id, { status: "SENT" });
		}
	} catch (error) {
		console.error("Error checking scheduled campaigns:", error);
	}
});

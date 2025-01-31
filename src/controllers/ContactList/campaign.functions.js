import dotenv from "dotenv";
import cron from "node-cron";
import ActivityLogs from "../../models/activityLogs.model.js";
import axios from "axios";

import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import User from "../../models/user.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";

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
			// console.log(JSON.stringify(personalizedMessage));
			// Send message using WhatsApp (assuming wa_id is the phone number)
			const response = await sendMessageThroughWhatsApp(
				template,
				contact.wa_id,
				personalizedMessage,
			);

			const messageTemplate = generatePreviewMessage(
				template,
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
			// console.log(JSON.stringify(response));
			const user = await User.findOne({ unique_id: id });
			// Create a report for each sent message
			const report = new Report({
				WABA_ID: user.WABA_ID,
				FB_PHONE_ID: user.FB_PHONE_ID,
				useradmin: id,
				unique_id,
				campaignName: campaign.name,
				campaignId: campaign.unique_id,
				recipientPhone: contact.wa_id,
				status: response.status,
				messageId: response.response.messages[0].id,
				messageTemplate,
			});
			await report.save();
		}

		// Update the campaign status to 'SENT' after messages are sent
		await Campaign.findByIdAndUpdate(campaign._id, { status: "SENT" });
	} catch (error) {
		console.error("Error sending messages:", error.message);
		throw new Error(`${error.message}`);
	}
}

export function replaceDynamicVariables(template, variables, contact) {
	const messageComponents = [];
	try {
		// Process dynamic variables in Header
		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (headerComponent) {
			let headerParameters = [];

			// // Handle text components
			// if (headerComponent.format === "TEXT") {
			// 	template.dynamicVariables.header.forEach((headVar) => {
			// 		let key = Object.keys(headVar)[0];
			// 		if (variables.get(key) === "Name") {
			// 			headerParameters.push({
			// 				type: "text",
			// 				text: contact.Name || "",
			// 			});
			// 		} else if (variables.get(key)) {
			// 			headerParameters.push({
			// 				type: "text",
			// 				text: contact.masterExtra[variables.get(key)] || "",
			// 			});
			// 		}
			// 	});
			// }

			// Handle media components based on their format (Image, Video, Document)
			if (headerComponent.format === "IMAGE") {
				headerParameters.push({
					type: "image",
					image: {
						link: headerComponent.example.header_handle[0] || "",
					},
				});
			} else if (headerComponent.format === "VIDEO") {
				headerParameters.push({
					type: "video",
					video: {
						link: headerComponent.example.header_handle[0] || "",
					},
				});
			} else if (headerComponent.format === "DOCUMENT") {
				headerParameters.push({
					type: "document",
					document: {
						link: headerComponent.example.header_handle[0] || "",
					},
				});
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
		if (bodyComponent && template.dynamicVariables.body.length > 0) {
			let bodyParameters = [];

			template.dynamicVariables.body.forEach((bodyVar) => {
				let key = Object.keys(bodyVar)[0];
				// console.log(variables.get(key));

				if (variables.get(key) == "Name") {
					bodyParameters.push({
						type: "text",
						text: contact.Name || "",
					});
				} else if (variables.get(key)) {
					bodyParameters.push({
						type: "text",
						text: contact.masterExtra[variables.get(key)] || "",
					});
				}
			});

			messageComponents.push({
				type: "body",
				parameters: bodyParameters,
			});
		}

		return messageComponents;
	} catch (error) {
		console.error("Error replacing dynamic variables:", error.message);
		throw new Error(`Error replacing dynamic variables: ${error.message}`);
	}
}

export async function sendMessageThroughWhatsApp(
	template,
	phone,
	messageComponents,
) {
	try {
		// Construct the message payload
		const requestData = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: phone,
			type: "template",
			template: {
				name: template.name,
				language: { code: template.language.code },
				components: messageComponents,
			},
		};

		// Send the request
		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${process.env.FB_PHONE_ID}/messages`,
			requestData,
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
			error.response?.data?.error?.message || error.message,
		);
		return {
			status: "FAILED",
			response: error.response?.data?.error?.message || error.message,
		};
	}
}

export function generatePreviewMessage(template, message) {
	try {
		let previewMessage = "";
		console.log(JSON.stringify(message));

		let headerText = template.components.find(
			(c) => c.type === "HEADER",
		).text;

		previewMessage += `${headerText}\n`;

		// Process Body component

		let bodyText = template.components.find((c) => c.type === "BODY").text;
		let bodyVariable = message[0]?.parameters;

		bodyVariable?.forEach((value, index) => {
			bodyText = bodyText.replace("{{" + (index + 1) + "}}", value.text);
		});

		previewMessage += `${bodyText}\n`;

		// Process Footer component (optional)
		const footerComponent = template.components.find(
			(c) => c.type === "FOOTER",
		);
		if (footerComponent) {
			previewMessage += `${footerComponent.text}\n`;
		}
		console.log(JSON.stringify(previewMessage));
		return previewMessage.trim();
	} catch (error) {
		console.error("Error generating preview message:", error.message);
		throw new Error(`Error generating preview message: ${error.message}`);
	}
}

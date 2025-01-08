import dotenv from "dotenv";
import cron from "node-cron";

import axios from "axios";
import { agenda } from "../../config/db.js";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
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
			console.log(JSON.stringify(response));
			// Create a report for each sent message
			const report = new Report({
				useradmin: id,
				unique_id,
				campaignName: campaign.name,
				campaignId: campaign.unique_id,
				recipientPhone: contact.wa_id,
				status: response.status,
				messageId: response.response.messages[0].id,
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

function replaceDynamicVariables(template, variables, contact) {
	const messageComponents = [];

	try {
		// Process dynamic variables in Header
		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (headerComponent && template.dynamicVariables.header.length > 0) {
			let headerParameters = [];
			if (headerComponent.format === "TEXT") {
				template.dynamicVariables.header.forEach((headVar) => {
					let key = Object.keys(headVar)[0];
					console.log(variables.get(key));
					if (variables.get(key) === "Name") {
						headerParameters.push({
							type: "text",
							text: contact.Name || "",
						});
					} else if (variables.get(key)) {
						console.log("here");
						headerParameters.push({
							type: "text",
							text: contact.masterExtra[variables.get(key)] || "",
						});
					}
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
				console.log(variables.get(key));

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

async function sendMessageThroughWhatsApp(name, phone, messageComponents) {
	try {
		// Construct the message payload
		const requestData = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: phone,
			type: "template",
			template: {
				name: name,
				language: { code: "en_US" },
				components: messageComponents,
			},
		};

		// Log the request data
		console.log(
			"Submitting the following JSON to WhatsApp API:",
			JSON.stringify(requestData, null, 2),
		);

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

agenda.define("process campaign", async (job) => {
	const { campaignId } = job.attrs.data;

	try {
		// Fetch the campaign details
		const campaign = await Campaign.findById(campaignId);

		if (campaign && campaign.status === "IN_QUEUE") {
			await sendMessages(
				campaign,
				campaign.useradmin,
				generateUniqueId(),
			);
			await Campaign.findByIdAndUpdate(campaignId, { status: "SENT" });
			console.log(`Campaign ${campaignId} has been successfully sent.`);
		}
	} catch (error) {
		console.error(`Error processing campaign ${campaignId}:`, error);
	}
});

const scheduleCampaign = async (campaign) => {
	const { scheduledAt, _id } = campaign;
	// console.log(new Date(scheduledAt));
	// Schedule the job to run at the specified time (use Date object or timestamp)
	agenda.schedule(new Date(scheduledAt), "process campaign", {
		campaignId: _id,
	});

	// Mark the campaign as IN_QUEUE so it won’t be processed multiple times
	await Campaign.findByIdAndUpdate(_id, { status: "IN_QUEUE" });
	console.log(`Campaign ${_id} scheduled successfully.`);
};

cron.schedule("* * * * *", async () => {
	try {
		const now = Date.now();
		// console.log(now);
		// Find all campaigns that are scheduled to be sent
		const scheduledCampaigns = await Campaign.find({
			scheduledAt: { $lte: now },
			status: "SCHEDULED",
		});

		for (let campaign of scheduledCampaigns) {
			await scheduleCampaign(campaign);
		}
	} catch (error) {
		console.error("Error checking scheduled campaigns:", error);
	}
});

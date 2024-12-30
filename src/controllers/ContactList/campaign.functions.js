import dotenv from "dotenv";
import cron from "node-cron";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";

dotenv.config();

export async function sendMessages(campaign) {
	try {
		const template = await Template.findOne({
			unique_id: campaign.templateId,
		});
		const contactList = await Contacts.find({
			contactId: campaign.contactListId,
		});

		for (let contact of contactList.wa_id) {
			const personalizedMessage = replaceDynamicVariables(
				template,
				campaign.variables,
				contact,
			);

			const response = await sendMessageThroughWhatsApp(
				template.name,
				contact,
				personalizedMessage,
			);
			const report = new Report({
				campaignId: campaign._id,
				recipientPhone: contact.phone,
				status: response.status,
			});
			await report.save();
		}

		// Update campaign status
		await Campaign.findByIdAndUpdate(campaign._id, { status: "SENT" });
	} catch (error) {
		console.error("Error sending messages:", error);
	}
}

function replaceDynamicVariables(template, variables, contact) {
	const messageComponents = [];

	// Process dynamic variables in Headers
	const headerComponent = template.components.find(
		(c) => c.type === "HEADER",
	);
	if (headerComponent) {
		let headerParameters = [];
		if (headerComponent.format === "TEXT") {
			let headerText = headerComponent.text || ""; // Handle the case when header text is empty
			for (let [key, value] of Object.entries(variables)) {
				headerText = headerText.replace(
					`{${key}}`,
					contact.masterExtra.get(value) || contact[value] || "",
				);
			}
			headerParameters.push({ type: "text", text: headerText });
		} else if (
			["IMAGE", "VIDEO", "DOCUMENT"].includes(headerComponent.format)
		) {
			// Handle media header (image, video, document)
			const mediaUrl = headerComponent.example.header_handle[0]; // Assume the media URL is stored in `header_handle`
			if (mediaUrl) {
				headerParameters.push({
					type: headerComponent.format.toLowerCase(), // Lowercase format for WhatsApp API
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
	const bodyComponent = template.components.find((c) => c.type === "BODY");
	if (bodyComponent) {
		let bodyText = bodyComponent.text;
		for (let [key, value] of Object.entries(variables)) {
			bodyText = bodyText.replace(
				`{${key}}`,
				contact.masterExtra.get(value) || contact[value] || "",
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
				contact.masterExtra.get(value) || contact[value] || "",
			);
		}
		messageComponents.push({
			type: "footer",
			parameters: [{ type: "text", text: footerText }],
		});
	}

	return messageComponents;
}

async function sendMessageThroughWhatsApp(name, phone, messageComponents) {
	try {
		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${process.env.WABA_ID}/messages`,
			{
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
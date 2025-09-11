import dotenv from "dotenv";
import axios from "axios";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import Chat from "../../models/chats.model.js";
import TempMessage from "../../models/TempMessage.model.js";
import User from "../../models/user.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";

dotenv.config();

export async function sendMessages(
	campaign,
	userData,
	unique_id,
	phone_number,
	addedUserId,
	url,
	fileName,
	contactList,
	template,
) {
	try {
		if (!template)
			throw new Error(
				`Template with ID ${campaign.templateId} not found`,
			);
		if (!contactList.length)
			throw new Error(
				`No contacts found for list ${campaign.contactListId}`,
			);

		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (fileName && headerComponent) {
			headerComponent.example.header_url = `${url}/uploads/${userData.unique_id}/${fileName}`;
		}

		const user = await User.findOne({ unique_id: userData.unique_id });
		let messagesCount = user?.payment?.messagesCount || 0;
		const totalCount = user?.payment?.totalMessages || 0;
		let remainingCount = totalCount - messagesCount;

		if (!user?.payment?.unlimited) {
			if (contactList.length > remainingCount) {
				throw new Error(
					`Not enough credits. You have ${remainingCount} left, need ${contactList.length}`,
				);
			}
		}

		const chatDocs = [];
		const tempMsgOps = [];

		for (const contact of contactList) {
			try {
				const personalizedMessage = replaceDynamicVariables(
					template,
					campaign.variables,
					contact,
				);

				const response = await sendMessageThroughWhatsApp(
					user,
					template,
					contact.wa_id,
					personalizedMessage,
					phone_number,
				);

				if (response.status === "FAILED") {
					console.error(
						`Failed to send message to ${contact.wa_id}: ${response.response}`,
					);
					continue;
				}

				const messageTemplate = generatePreviewMessage(
					template,
					personalizedMessage,
				);
				const components = generatePreviewComponents(
					template,
					personalizedMessage,
				);
				const mediaPreview = getMediaPreviewFromTemplate(template);

				tempMsgOps.push({
					insertOne: {
						document: {
							name: contact.Name,
							wabaId: user.WABA_ID,
							messageId: response.response.messages[0].id,
							from: contact.wa_id,
							timestamp: Date.now(),
							type: "text",
							text: { body: messageTemplate },
							fbPhoneId: phone_number,
							status: "sent",
						},
					},
				});

				const chatDoc = {
					WABA_ID: user.WABA_ID,
					FB_PHONE_ID: phone_number,
					useradmin: user.unique_id,
					unique_id,
					campaignName: campaign.name,
					campaignId: campaign.unique_id,
					contactName: contact.Name,
					recipientPhone: contact.wa_id,
					status: response.status,
					messageId: response.response.messages[0].id,
					messageTemplate,
					components,
					templateId: campaign.templateId,
					templatename: template.name,
					agent: addedUserId || user.unique_id,
					type: "Campaign",
				};

				if (mediaPreview) {
					chatDoc.media = {
						url: mediaPreview.url,
						fileName: mediaPreview.fileName,
					};
				}

				chatDocs.push(chatDoc);

				if (!user?.payment?.unlimited) {
					messagesCount++;
					remainingCount--;
					console.log(
						`Message sent ✅ to ${contact.wa_id}, updated messagesCount: ${messagesCount}, remaining: ${remainingCount}`,
					);
				}
			} catch (err) {
				console.error(
					`Error sending message to ${contact.wa_id}:`,
					err.message || err,
				);
			}
		}

		if (chatDocs.length) await Chat.insertMany(chatDocs);
		if (tempMsgOps.length) await TempMessage.bulkWrite(tempMsgOps);

		if (!user?.payment?.unlimited) {
			console.log(
				`Final update => messagesCount: ${messagesCount}, total: ${totalCount}, remaining: ${
					totalCount - messagesCount
				}`,
			);
			user.payment.messagesCount = messagesCount;
			await user.save();
		}
	} catch (error) {
		console.error("Error sending messages:", error.message || error);
		throw error;
	}
}

export function replaceDynamicVariables(template, variables, contact) {
	try {
		const messageComponents = [];

		if (variables && typeof variables.get !== "function") {
			variables = new Map(Object.entries(variables));
		}

		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);

		if (headerComponent) {
			const headerParameters = [];
			const link = headerComponent?.example?.header_url || "";

			if (headerComponent.format === "IMAGE") {
				headerParameters.push({ type: "image", image: { link } });
			} else if (headerComponent.format === "VIDEO") {
				headerParameters.push({ type: "video", video: { link } });
			} else if (headerComponent.format === "DOCUMENT") {
				headerParameters.push({ type: "document", document: { link } });
			}

			if (headerParameters.length > 0) {
				messageComponents.push({
					type: "header",
					parameters: headerParameters,
				});
			}
		}

		const bodyComponent = template.components.find(
			(c) => c.type === "BODY",
		);

		if (bodyComponent && template.dynamicVariables?.body?.length > 0) {
			const bodyParameters = [];

			template.dynamicVariables.body.forEach((bodyVar) => {
				const key = Object.keys(bodyVar)[0];
				const mappedKey = variables?.get?.(key);

				if (mappedKey === "Name") {
					bodyParameters.push({
						type: "text",
						text: contact?.Name || "",
					});
				} else if (mappedKey) {
					bodyParameters.push({
						type: "text",
						text: contact?.masterExtra?.[mappedKey] || "",
					});
				}
			});

			if (bodyParameters.length > 0) {
				messageComponents.push({
					type: "body",
					parameters: bodyParameters,
				});
			}
		}

		// 🟢 Debug log: show plain values before returning
		console.log(
			"[replaceDynamicVariables] Final body text values:",
			messageComponents
				.filter((c) => c.type === "body")
				.flatMap((c) => c.parameters.map((p) => p.text)),
		);

		return messageComponents;
	} catch (error) {
		console.error("Error replacing dynamic variables:", error.message);
		throw new Error(`Error replacing dynamic variables: ${error.message}`);
	}
}

export async function sendMessageThroughWhatsApp(
	user,
	template,
	phone,
	messageComponents,
	phone_number,
) {
	try {
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

		// 🟢 Debug log: payload preview
		console.log(
			"[sendMessageThroughWhatsApp] Payload:",
			JSON.stringify(requestData, null, 2),
		);

		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phone_number}/messages`;
		console.log("[sendMessageThroughWhatsApp] Request URL:", url);

		let response;

		try {
			response = await axios.post(url, requestData, {
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			});

			console.log(
				"[sendMessageThroughWhatsApp] WhatsApp API response:",
				response.data,
			);
		} catch (error) {
			console.error(
				"[sendMessageThroughWhatsApp] Error:",
				error.response ? error.response.data : error.message,
			);
			throw error;
		}

		return { status: "SENT", response: response.data };
	} catch (error) {
		console.error(
			"[sendMessageThroughWhatsApp] Failed:",
			error.response?.data?.error?.message || error.message,
		);
		return {
			status: "FAILED",
			response:
				error.response?.data?.error?.error_user_msg ||
				error.response?.data?.error?.error_user_title ||
				error.response?.data?.error?.message,
		};
	}
}

export function getMediaPreviewFromTemplate(template) {
	const headerComponent = template.components.find(
		(c) => c.type === "HEADER",
	);
	if (
		headerComponent &&
		headerComponent.example &&
		headerComponent.example.header_url
	) {
		// If header_url is an array, use the first element; otherwise, assume it's a string.
		const headerUrl = Array.isArray(headerComponent.example.header_url)
			? headerComponent.example.header_url[0]
			: headerComponent.example.header_url;
		// Extract the file name from the URL (everything after the last '/')
		const fileName = headerUrl.split("/").pop();
		return { url: headerUrl, fileName };
	}
	return null;
}

export function generatePreviewMessage(template, message) {
	try {
		let previewMessage = "";

		console.log(JSON.stringify(template), JSON.stringify(message));
		// Process HEADER component
		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (headerComponent) {
			let headerText = headerComponent.text;
			// Find header parameters from the incoming message payload (matching type "header")
			const headerParams = message?.find(
				(c) => c.type === "header",
			)?.parameters;

			if (headerText) {
				// Replace placeholders in header text using the header parameters if available.
				if (headerParams && headerParams.length > 0) {
					headerParams.forEach((value, index) => {
						const replacement = value.text;
						headerText = headerText.replace(
							`{{${index + 1}}}`,
							replacement,
						);
					});
				}
				previewMessage += `${headerText}\n`;
			} else if (headerComponent.parameters) {
				// If no header text, iterate over headerComponent.parameters to build the header preview.
				headerComponent.parameters.forEach((param) => {
					if (param.type === "text" && param.text) {
						previewMessage += `${param.text}\n`;
					} else {
						const type = param.type;
						previewMessage += `[Image: ${param[type].link}]\n`;
					}
				});
			}
		}

		// Process BODY component
		const bodyComponent = template.components.find(
			(c) => c.type === "BODY",
		);
		if (bodyComponent) {
			let bodyText = bodyComponent.text;
			const bodyParams = message?.find(
				(c) => c.type === "body",
			)?.parameters;
			bodyParams?.forEach((value, index) => {
				bodyText = bodyText.replace(`{{${index + 1}}}`, value.text);
			});
			previewMessage += `${bodyText}\n`;
		}

		// Process FOOTER component (optional)
		const footerComponent = template.components.find(
			(c) => c.type === "FOOTER",
		);
		if (footerComponent) {
			previewMessage += `${footerComponent.text}\n`;
		}

		console.log("preiview message :", previewMessage);

		return previewMessage.trim();
	} catch (error) {
		console.error("Error generating preview message:", error.message);
		throw new Error(`Error generating preview message: ${error.message}`);
	}
}

export function generatePreviewComponents(template, message) {
	try {
		// Deep clone the template to avoid modifying the original
		const clonedTemplate = JSON.parse(JSON.stringify(template));

		// Process HEADER component
		const headerComponent = clonedTemplate.components.find(
			(c) => c.type === "HEADER",
		);
		if (headerComponent) {
			let headerText = headerComponent.text;
			// Find header parameters from the incoming message payload (matching type "header")
			const headerParams = message?.find(
				(c) => c.type === "header",
			)?.parameters;

			if (headerText) {
				// Replace placeholders in header text using the header parameters if available.
				if (headerParams && headerParams.length > 0) {
					headerParams.forEach((value, index) => {
						const replacement = value.text;
						headerText = headerText.replace(
							`{{${index + 1}}}`,
							replacement,
						);
						headerText = headerText.replace(`\n`, "");
					});
				}
				headerComponent.text = `${headerText}\n`;
			} else if (headerComponent.parameters) {
				// If no header text, iterate over headerComponent.parameters to build the header preview.
				headerComponent.parameters.forEach((param) => {
					if (param.type === "text" && param.text) {
						headerComponent.text += `${param.text}\n`;
					} else {
						const type = param.type;
						headerComponent.text += `[Image: ${param[type].link}]\n`;
					}
				});
			}
		}

		// Process BODY component
		const bodyComponent = clonedTemplate.components.find(
			(c) => c.type === "BODY",
		);
		if (bodyComponent) {
			let bodyText = bodyComponent.text;
			const bodyParams = message?.find(
				(c) => c.type === "body",
			)?.parameters;
			bodyParams?.forEach((value, index) => {
				bodyText = bodyText.replace(`{{${index + 1}}}`, value.text);
			});
			bodyText = bodyText.replace(`\n`, "");
			bodyComponent.text = `${bodyText}\n`;
		}

		// Process FOOTER component (optional)
		const footerComponent = clonedTemplate.components.find(
			(c) => c.type === "FOOTER",
		);
		if (footerComponent) {
			footerComponent.text = footerComponent.text.replace(`\n`, "");
			footerComponent.text = `${footerComponent.text}\n`;
		}

		// Return the cloned template components
		return clonedTemplate.components;
	} catch (error) {
		console.error("Error generating preview message:", error.message);
		throw new Error(`Error generating preview message: ${error.message}`);
	}
}

export async function sendTestMessage(
	user,
	template,
	variables,
	contact,
	phoneNumber,
	fb_phone_number,
	addedUserId,
	sendCampaignMessage,
	url,
	fileName,
) {
	try {
		if (!template) throw new Error("Template not found");
		if (!contact) throw new Error("Contact not found");

		// Header media
		const headerComponent = template.components.find(
			(c) => c.type === "HEADER",
		);
		if (fileName && headerComponent) {
			headerComponent.example.header_url = `${url}/uploads/${user.unique_id}/${fileName}`;
		}

		if (variables && typeof variables.get !== "function") {
			variables = new Map(Object.entries(variables));
		}

		// Prepare message
		const personalizedMessage = replaceDynamicVariables(
			template,
			variables,
			contact,
		);
		const response = await sendMessageThroughWhatsApp(
			user,
			template,
			phoneNumber,
			personalizedMessage,
			fb_phone_number,
		);

		if (response.status === "FAILED") {
			throw new Error(
				`Failed to send message to ${phoneNumber}: ${response.response}`,
			);
		}

		const messageTemplate = generatePreviewMessage(
			template,
			personalizedMessage,
		);
		const components = generatePreviewComponents(
			template,
			personalizedMessage,
		);

		if (sendCampaignMessage) {
			const mediaPreview = getMediaPreviewFromTemplate(template);

			await TempMessage.create({
				name: contact.Name,
				wabaId: user.WABA_ID,
				messageId: response.response.messages[0].id,
				from: contact.Number,
				timestamp: Date.now(),
				type: "text",
				text: messageTemplate,
				fbPhoneId: fb_phone_number,
				status: "sent",
			});

			const chatData = {
				WABA_ID: user.WABA_ID,
				FB_PHONE_ID: fb_phone_number,
				from: contact.Number,
				useradmin: user.unique_id,
				unique_id: generateUniqueId(),
				campaignName: "-",
				campaignId: "-",
				contactName: contact.Name,
				recipientPhone: contact.Number,
				status: response.status,
				messageId: response.response.messages[0].id,
				messageTemplate,
				components,
				templateId: template.unique_id,
				templatename: template.name,
				agent: addedUserId || user.unique_id,
				type: "Campaign",
			};

			if (mediaPreview) {
				chatData.media = {
					url: mediaPreview.url,
					fileName: mediaPreview.fileName,
				};
			}

			await Chat.create(chatData);
		}

		// Deduct credit

		if (!user?.payment?.unlimited) {
			user.payment.messagesCount += 1;
			await user.save();
		}

		return {
			messageTemplate,
			data: response.response,
			components,
			templatename: template.name,
		};
	} catch (error) {
		console.error("Error sending test message:", error.message || error);
		throw error;
	}
}

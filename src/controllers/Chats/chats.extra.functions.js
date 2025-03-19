import Report from "../../models/report.model.js";
import Campaign from "../../models/campaign.model.js";
import Template from "../../models/templates.model.js";

export function getMimeType(fileName) {
	const ext = fileName.split(".").pop().toLowerCase();
	const mimeTypes = {
		// Image types
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",

		// Video types
		mp4: "video/mp4",
		mpeg: "video/mpeg",
		"3gp": "video/3gpp",
		mov: "video/quicktime",

		// Document types
		pdf: "application/pdf",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		txt: "text/plain",
	};

	return mimeTypes[ext] || "application/octet-stream";
}

export const determineMediaType = (url) => {
	console.log("img :", url);
	const extension = url.split(".").pop().toLowerCase();
	if (["jpg", "jpeg", "png", "gif"].includes(extension)) return "image";
	if (["mp4", "mov", "avi"].includes(extension)) return "video";
	if (["pdf", "doc", "docx"].includes(extension)) return "document";
	return "unknown";
};

export const fetchAndFormatReports = async (
	userId,
	phoneNumberId,
	skip = 0,
	limit = 10,
) => {
	// Aggregation pipeline:
	const aggregatedReports = await Report.aggregate([
		{
			$match: {
				useradmin: userId,
				FB_PHONE_ID: phoneNumberId,
			},
		},
		// Sort reports by updatedAt descending so the most recent comes first
		{
			$sort: { createdAt: -1 },
		},
		// Group by recipientPhone (wa_id), keeping only the first document per group
		{
			$group: {
				_id: "$recipientPhone",
				doc: { $first: "$$ROOT" },
			},
		},
		// Replace root with the grouped document
		{
			$replaceRoot: { newRoot: "$doc" },
		},
		// Optionally project only the fields you need
		{
			$project: {
				contactName: 1,
				recipientPhone: 1,
				status: 1,
				replyContent: 1,
				updatedAt: 1,
				campaignId: 1,
			},
		},
		// Apply pagination on the unique records
		{ $skip: skip },
		{ $limit: limit },
	]);

	if (!aggregatedReports || aggregatedReports.length === 0) {
		return [];
	}

	// Format the results as needed.
	const formattedReports = aggregatedReports.map((report) => {
		const isReplyRecent =
			report.replyContent &&
			Date.now() - report.updatedAt < 24 * 60 * 60 * 1000; // less than 24 hours

		return {
			lastmessage: report.replyContent || "No recent reply",
			wa_id: report.recipientPhone,
			status: isReplyRecent ? 0 : 1,
			name: report.contactName,
			usertimestmp: report.updatedAt,
			campaignId: report.campaignId,
			is_read: report.status === "READ" ? true : false,
		};
	});

	return formattedReports;
};

export const createTextPayload = (to, body) => ({
	messaging_product: "whatsapp",
	recipient_type: "individual",
	to,
	type: "text",
	text: {
		body: body,
	},
});

export const createImagePayload = (to, mediaId, caption) => ({
	messaging_product: "whatsapp",
	recipient_type: "individual",
	to,
	type: "image",
	image: {
		id: mediaId,
		caption: caption,
	},
});

export const createVideoPayload = (to, mediaId, caption) => ({
	messaging_product: "whatsapp",
	recipient_type: "individual",
	to,
	type: "video",
	video: {
		id: mediaId,
		caption: caption,
	},
});

export const createDocumentPayload = (to, mediaId, filename, caption) => ({
	messaging_product: "whatsapp",
	recipient_type: "individual",
	to,
	type: "document",
	document: {
		id: mediaId,
		caption: caption,
		filename: filename,
	},
});

export const createChatsComponents = (templateData, dynamicVariables) => {
	const components = [];

	// Iterate through each component in templateData
	templateData.forEach((comp) => {
		// Process HEADER
		if (comp.type === "HEADER") {
			if (comp.format === "TEXT") {
				const headerExample =
					dynamicVariables?.header?.length > 0
						? dynamicVariables.header.map(
								(variable) => Object.values(variable)[0],
						  )
						: [];

				components.push({
					type: "HEADER",
					format: "TEXT",
					text: comp.text,
					example: {
						header_text: headerExample,
					},
				});
			} else if (comp.format === "IMAGE") {
				components.push({
					type: "HEADER",
					format: "IMAGE",
					link: dynamicVariables?.header?.imageUrl || "",
					caption: comp.text || "",
				});
			} else if (comp.format === "DOCUMENT") {
				components.push({
					type: "HEADER",
					format: "DOCUMENT",
					link: dynamicVariables?.header?.documentUrl || "",
					caption: comp.text || "",
				});
			} else if (comp.format === "VIDEO") {
				components.push({
					type: "HEADER",
					format: "VIDEO",
					link: dynamicVariables?.header?.videoUrl || "",
					caption: comp.text || "",
				});
			}
		}

		// Process BODY
		if (comp.type === "BODY") {
			const bodyExample =
				dynamicVariables?.body?.length > 0
					? dynamicVariables.body.map(
							(variable) => Object.values(variable)[0],
					  )
					: [];

			components.push({
				type: "BODY",
				text: comp.text,
				example: {
					body_text: [bodyExample],
				},
			});
		}

		// Process FOOTER
		if (comp.type === "FOOTER") {
			components.push({
				type: "FOOTER",
				text: comp.text,
			});
		}

		// Process BUTTONS
		if (comp.type === "BUTTONS" && comp.buttons.length > 0) {
			components.push({
				type: "BUTTONS",
				buttons: comp.buttons.map((button) => {
					if (button.type === "PHONE_NUMBER") {
						// Call-to-Action button for phone numbers
						return {
							type: "PHONE_NUMBER",
							text: button.text,
							phone_number: button.phone_number,
						};
					} else if (button.type === "URL") {
						// Call-to-Action button for URLs
						return {
							type: "URL",
							text: button.text,
							url: button.url,
						};
					}
				}),
			});
		}
	});

	return components;
};

export const buildCommonChatFields = (reportItem, wa_id, overrides = {}) => {
	return {
		media_message: { link: "", caption: "" },
		media_type: "",
		cmpid: reportItem.campaignId,
		wa_idK: reportItem.wa_idK || "",
		keyId: reportItem.keyId || "",
		mId: reportItem.messageId || "",
		name: reportItem.contactName || "user",
		wa_id,
		from: wa_id,
		text: "",
		timestamp: reportItem.updatedAt,
		type: "text",
		recive: reportItem.status === "REPLIED" ? "recive" : "send",
		status: reportItem.status === "REPLIED" ? "recive" : "send",
		...overrides,
	};
};

export const processTemplateReport = async (reportItem, wa_id, text) => {
	
	const template = await Template.findOne({
		unique_id: reportItem.templateId,
	});

	// Create a base chat object using common fields.
	let chat = buildCommonChatFields(reportItem, wa_id, { text });

	// Process each component and add its information to the single chat object.
	template.components.forEach((comp) => {
		if (comp.type === "HEADER") {
			if (["IMAGE", "VIDEO", "DOCUMENT"].includes(comp.format)) {
				chat.media_message = {
					link: comp.example.header_url || "",
					caption: comp.text || "",
				};
				chat.media_type = comp.format.toLowerCase();
			}
		}
	});

	return chat;
};

export const processMediaReport = (reportItem, wa_id) => {
	// Use media values from the report.
	const { url, caption } = reportItem.media;
	return buildCommonChatFields(reportItem, wa_id, {
		media_message: { link: url || "", caption: caption || "" },
		media_type: url ? determineMediaType(reportItem.media.fileName) : "",
	});
};

export const processTextReport = (reportItem, wa_id) => {
	// Use textSent if available; otherwise replyContent.
	const text = reportItem.textSent || reportItem.replyContent || "";
	return buildCommonChatFields(reportItem, wa_id, { text });
};

export function generateChatTemplate(template) {
	try {
		let previewMessage = "";
		// console.log(JSON.stringify(message));

		let headerText = template.components.find(
			(c) => c.type === "HEADER",
		)?.text;

		previewMessage += `${headerText}\n`;

		// Process Body component

		let bodyText = template.components.find((c) => c.type === "BODY")?.text;

		previewMessage += `${bodyText}\n`;

		// Process Footer component (optional)
		const footerComponent = template.components.find(
			(c) => c.type === "FOOTER",
		);
		if (footerComponent) {
			previewMessage += `${footerComponent.text}\n`;
		}
		// console.log(JSON.stringify(previewMessage));
		return previewMessage.trim();
	} catch (error) {
		console.error("Error generating preview message:", error.message);
		throw new Error(`Error generating preview message: ${error.message}`);
	}
}

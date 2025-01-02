import https from "https";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import axios from "axios";
import Template from "../../models/templates.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
const { FB_GRAPH_VERSION, WABA_ID, FB_ACCESS_TOKEN } = process.env;

dotenv.config();

export const saveTemplateToDatabase = async (
	req,
	templateData,
	dynamicVariables,
	id,
) => {
	const newTemplate = new Template({
		name: templateData.templateName,
		category: templateData.category,
		components: [
			{
				type: "BODY",
				text: templateData.body || "",
			},
			{
				type: "FOOTER",
				text: templateData.footer || "",
			},
			...(templateData.header && templateData.header.type === "text"
				? [
						{
							type: "HEADER",
							text: templateData.header.content || "",
							format: templateData.header.type.toUpperCase(),
						},
				  ]
				: templateData.header && templateData.header.type !== "text"
				? [
						{
							type: "HEADER",
							format: templateData.header.type.toUpperCase(),
							example: {
								header_handle: [
									templateData.header.content || "",
								],
							},
						},
				  ]
				: []),
			...(templateData.buttons && templateData.buttons.length
				? templateData.buttons.map((button) => ({
						type: "BUTTON",
						text: button.text || "",
						example: {
							header_handle: [button.urlPhone],
						},
				  }))
				: []),
		],
		status: "Pending",
		unique_id: generateUniqueId(),
		useradmin: id,
		dynamicVariables,
	});

	if (
		templateData.header &&
		templateData.header.type !== "text" &&
		req.file
	) {
		const filePath = path.join(
			"uploads",
			req.session.user.id,
			req.file.filename,
		);

		if (fs.existsSync(filePath)) {
			const headerComponent = newTemplate.components.find(
				(component) => component.type === "HEADER",
			);
			if (headerComponent) {
				headerComponent.example.header_handle = [filePath];
			}
		} else {
			const headerComponent = newTemplate.components.find(
				(component) => component.type === "HEADER",
			);
			if (headerComponent) {
				headerComponent.example.header_handle = [];
			}
		}
	}

	const savedTemplate = await newTemplate.save();
	return savedTemplate;
};

export async function submitTemplateToFacebook(savedTemplate) {
	try {
		const response = await axios.post(
			`https://graph.facebook.com/${FB_GRAPH_VERSION}/${WABA_ID}/message_templates`,
			{
				name: savedTemplate.name,
				language: savedTemplate.language,
				category: savedTemplate.category,
				components: savedTemplate.components,
			},
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${FB_ACCESS_TOKEN}`,
				},
			},
		);

		// If the response is successful (status code 200)
		return response.data;
	} catch (error) {
		// Handle any error
		if (error.response) {
			// Server responded with a status code outside the 2xx range
			throw new Error(
				error.response.data.error?.message ||
					"Unknown error from Facebook",
			);
		} else if (error.request) {
			// Request was made but no response was received
			throw new Error("No response received from Facebook");
		} else {
			// Something else went wrong
			throw new Error("Error with the request: " + error.message);
		}
	}
}

export const fetchFacebookTemplates = async () => {
	try {
		const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${WABA_ID}/message_templates`;

		// Using native fetch API
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${FB_ACCESS_TOKEN}`,
			},
		});

		// Check if the response is ok (status code 200-299)
		if (!response.ok) {
			throw new Error(
				`Error fetching templates from Facebook: ${response.statusText}`,
			);
		}

		// Parse and return the JSON response
		const data = await response.json();
		return data;
	} catch (error) {
		console.error(
			"Error fetching Facebook message templates:",
			error.message,
		);
		throw new Error("Failed to fetch Facebook message templates");
	}
};

import https from "https";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import Template from "../../models/templates.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
const { WABA_ID, FB_ACCESS_TOKEN } = process.env;

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

export function submitTemplateToFacebook(savedTemplate) {
	return new Promise((resolve, reject) => {
		const options = {
			hostname: "graph.facebook.com",
			path: `/v17.0/${WABA_ID}/message_templates`,
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${FB_ACCESS_TOKEN}`, // Facebook Access Token
			},
		};

		const req = https.request(options, (res) => {
			let data = "";

			// Accumulate the data as it's received
			res.on("data", (chunk) => {
				data += chunk;
			});

			// Handle the response when it's complete
			res.on("end", () => {
				try {
					const jsonResponse = JSON.parse(data);
					if (res.statusCode === 200) {
						resolve(jsonResponse);
					} else {
						reject(
							new Error(
								jsonResponse.error?.message || "Unknown error",
							),
						);
					}
				} catch (error) {
					reject(new Error("Failed to parse response from Facebook"));
				}
			});
		});

		req.on("error", (error) => {
			reject(new Error("Error with the request: " + error.message));
		});
		// console.log(req);
		// Prepare the data to send in the body
		const body = JSON.stringify({
			name: savedTemplate.name,
			language: savedTemplate.language,
			category: savedTemplate.category,
			components: savedTemplate.components,
		});

		// Write the data to the request body
		req.write(body);

		// End the request
		req.end();
	});
}

export const fetchFacebookTemplates = async () => {
	try {
		const wabaId = process.env.WABA_ID;
		const accessToken = process.env.FB_ACCESS_TOKEN;
		const url = `https://graph.facebook.com/v17.0/${wabaId}/message_templates`;

		// Using native fetch API
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
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

import dotenv from "dotenv";
import path from "path";
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
	try {
		const components = createComponents(templateData, dynamicVariables);
		console.log(components);
		const newTemplate = new Template({
			name: templateData.templateName,
			category: templateData.category,
			components,
			unique_id: generateUniqueId(),
			useradmin: id,
			dynamicVariables,
		});

		if (req.file) {
			const filePath = path.join(
				"uploads",
				req.session.user.id,
				req.file.filename,
			);
			const headerComponent = newTemplate.components.find(
				(component) => component.type === "HEADER",
			);

			if (headerComponent) {
				// Assuming that the file is an image, video, or document
				if (headerComponent.format === "IMAGE") {
					headerComponent.example.header_handle = [filePath];
				} else if (headerComponent.format === "VIDEO") {
					headerComponent.example.header_handle = [filePath];
				} else if (headerComponent.format === "DOCUMENT") {
					headerComponent.example.header_handle = [filePath];
				}
			}
		}

		// Save the template to the database

		return newTemplate;
	} catch (error) {
		console.error("Error saving template to database:", error);
		throw new Error(`Error saving template to database: ${error.message}`);
	}
};

export async function submitTemplateToFacebook(savedTemplate) {
	try {
		const plainTemplate = savedTemplate.toObject(); // Convert to plain object

		// Now you can clean up and submit to Facebook
		plainTemplate.components = plainTemplate.components.map((component) => {
			const {
				_id,
				$__parent,
				$__,
				$errors,
				$isNew,
				[Symbol("mongoose#documentArrayParent")]: symbol,
				...cleanComponent
			} = component;
			return cleanComponent;
		});

		// Continue with the request data preparation
		const requestData = {
			name: plainTemplate.name,
			language: plainTemplate.language,
			category: plainTemplate.category.toUpperCase(),
			components: plainTemplate.components,
		};
		console.log("Submitting template to Facebook: here", requestData);
		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${process.env.WABA_ID}/message_templates`,
			requestData,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${process.env.FB_ACCESS_TOKEN}`,
				},
			},
		);

		// If the response is successful, return the response data
		return response.data;
	} catch (error) {
		// Handle different error types
		if (error.response) {
			// Server responded with a status code outside the 2xx range
			console.error(
				"Facebook API error:",
				error.response.data.error?.message,
				"Request data:",
				error.config.data, // Log the request that was sent
			);
			throw new Error(
				error.response.data.error?.message ||
					"Unknown error from Facebook",
			);
		} else if (error.request) {
			// Request was made but no response received
			console.error("No response received from Facebook:", error.request);
			throw new Error("No response received from Facebook");
		} else {
			// Something else went wrong
			console.error("Error with the request:", error.message);
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
		// console.log(data);
		return data;
	} catch (error) {
		console.error(
			"Error fetching Facebook message templates:",
			error.message,
		);
		throw new Error("Failed to fetch Facebook message templates");
	}
};

function createComponents(templateData, dynamicVariables) {
	const components = [];
	// Add HEADER component based on type
	if (templateData.header.type === "text") {
		if (dynamicVariables.header && dynamicVariables.header.length > 0) {
			const headerExample = dynamicVariables.header.map((variable) => {
				const values = Object.values(variable);
				return values[0];
			});

			components.push({
				type: "HEADER",
				format: "TEXT",
				text: templateData.header.content,
				example: {
					header_text: headerExample,
				},
			});
		} else {
			components.push({
				type: "HEADER",
				format: "TEXT",
				text: templateData.header.content,
			});
		}
	} else if (templateData.header.type === "image") {
		components.push({
			type: "HEADER",
			format: "IMAGE",
			example: { link: [templateData.header.imageUrl] },
		});
	}
	
	// Add BODY component with dynamic variables
	if (dynamicVariables.body && dynamicVariables.body.length > 0) {
		const bodyExample = dynamicVariables.body.map((variable) => {
			const values = Object.values(variable);
			return values[0];
		});

		components.push({
			type: "BODY",
			text: templateData.body,
			example: {
				body_text: [bodyExample],
			},
		});
	} else if (templateData.body) {
		components.push({
			type: "BODY",
			text: templateData.body,
		});
	}

	// Add FOOTER component with dynamic variables
	if (dynamicVariables.footer && dynamicVariables.footer.length > 0) {
		const footerExample = dynamicVariables.footer.map((variable) => {
			const values = Object.values(variable);
			return values[0];
		});

		components.push({
			type: "FOOTER",
			text: templateData.footer,
			// example: {
			// 	footer_text: [footerExample],
			// },
		});
	} else if (templateData.footer) {
		components.push({
			type: "FOOTER",
			text: templateData.footer,
		});
	}

	// Add BUTTONS component if buttons exist
	if (templateData.buttons && templateData.buttons.length > 0) {
		components.push({
			type: "BUTTONS",
			buttons: templateData.buttons.map((button) => {
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
	return components;
}

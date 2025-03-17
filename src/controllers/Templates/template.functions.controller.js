import dotenv from "dotenv";
import axios from "axios";
import path from "path";
import fs from "fs";
import FormData from "form-data";
import Template from "../../models/templates.model.js";
import User from "../../models/user.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { getMimeType } from "../Chats/chats.extra.functions.js";

dotenv.config();

const { FB_GRAPH_VERSION } = process.env;

const __dirname = path.resolve();

export const uploadAndRetrieveMediaURL = async (
	accessToken,
	phoneNumberId,
	filePath,
	mediaType,
	fileName,
) => {
	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phoneNumberId}/media`;
		const formData = new FormData();

		// Get MIME type from file extension (implement getMimeType accordingly)
		const mimeType = getMimeType(fileName);

		// Append the file as a stream, along with required fields.
		formData.append("file", fs.createReadStream(filePath), {
			filename: fileName,
			contentType: mimeType,
		});
		formData.append("messaging_product", "whatsapp");
		formData.append("type", mediaType);

		// POST the form data to upload the media.
		const uploadResponse = await axios.post(url, formData, {
			headers: {
				...formData.getHeaders(),
				Authorization: `Bearer ${accessToken}`,
			},
		});
		// axios automatically throws an error for non-2xx responses.
		const mediaId = uploadResponse.data.id;

		// Use axios to GET the media URL using the returned mediaId.
		const getMediaUrl = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${mediaId}/`;
		const getResponse = await axios.get(getMediaUrl, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});
		const mediaUrl = getResponse.data.url;

		return { mediaId, mediaUrl };
	} catch (error) {
		// Log detailed error information.
		if (error.response) {
			console.error(
				"Error in uploadAndRetrieveMediaURL:",
				error.response.data,
			);
		} else {
			console.error("Error in uploadAndRetrieveMediaURL:", error.message);
		}
		// Throw the error so that the calling controller can handle it.
		throw error;
	}
};

export const getMediaUrl = async (fileHandle, accessToken) => {
	try {
		const response = await axios.get(
			`https://graph.facebook.com/${FB_GRAPH_VERSION}/${fileHandle}`,
			{
				params: {
					access_token: accessToken,
					fields: "source",
				},
			},
		);
		return response.data.source;
	} catch (error) {
		console.error("Error fetching media URL:", error);
		throw error;
	}
};

export const uploadMediaResumable = async (accessToken, appId, filePath) => {
	try {
		// Determine file properties.
		const fileName = path.basename(filePath);
		const fileStats = fs.statSync(filePath);
		const fileLength = fileStats.size;
		const fileType = getMimeType(fileName);

		// Step 1: Start an upload session.
		const startSessionUrl = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${appId}/uploads`;
		const startSessionParams = {
			file_name: fileName,
			file_length: fileLength,
			file_type: fileType,
			access_token: accessToken,
		};

		console.log(
			"Starting upload session with parameters:",
			startSessionParams,
		);
		const sessionResponse = await axios.post(startSessionUrl, null, {
			params: startSessionParams,
		});
		// Expect a response like: { "id": "upload:<UPLOAD_SESSION_ID>" }
		const uploadSessionId = sessionResponse.data.id;
		console.log("Upload session id:", uploadSessionId);

		// Step 2: Start the upload.
		const uploadUrl = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${uploadSessionId}`;
		const headers = {
			Authorization: `OAuth ${accessToken}`,
			file_offset: 0,
		};

		// For small files, read the entire file into a buffer.
		// For larger files, consider using streams.
		const fileData = fs.readFileSync(filePath);

		console.log(
			`Uploading file data (size: ${fileLength} bytes) to ${uploadUrl}`,
		);
		const uploadFileResponse = await axios.post(uploadUrl, fileData, {
			headers,
		});
		// Expect a response like: { "h": "<UPLOADED_FILE_HANDLE>" }
		const fileHandle = uploadFileResponse.data.h;
		console.log("File handle received:", fileHandle);

		return fileHandle;
	} catch (error) {
		if (error.response) {
			console.error(
				"Error in uploadMediaResumable:",
				error.response.data,
			);
		} else {
			console.error("Error in uploadMediaResumable:", error.message);
		}
		throw error;
	}
};

export const saveTemplateToDatabase = async (
	req,
	templateData,
	dynamicVariables,
	selectedLanguageCode,
	id,
	url,
) => {
	try {
		const components = createComponents(templateData, dynamicVariables);

		// Create the new template object
		const newTemplate = new Template({
			name: templateData.templateName,
			category: templateData.category,
			components,
			unique_id: generateUniqueId(),
			useradmin: id,
			dynamicVariables,
			language: selectedLanguageCode,
		});

		// Check if there is a file uploaded and update the corresponding header component with the file URL
		if (req.file) {
			// let filePath = `/uploads/${id}/${req.file?.filename}`;
			// filePath = encodeURI(filePath);

			let filePath = path.join(
				__dirname,
				"uploads",
				id,
				req.file.filename,
			);

			const user = await User.findOne({ unique_id: id });

			// const phoneNumberId = user.FB_PHONE_NUMBERS.find(
			// 	(u) => u.selected == true,
			// );
			const accessToken = user.FB_ACCESS_TOKEN;

			// filePath = await uploadAndRetrieveMediaURL(
			// 	accessToken,
			// 	phoneNumberId,
			// 	filePath,
			// 	mediaType,
			// 	req.file?.filename,
			// );
			const appId = process.env.FB_APP_ID;

			filePath = await uploadMediaResumable(accessToken, appId, filePath);

			// filePath = await getMediaUrl(filePath, accessToken);

			const headerComponent = newTemplate.components.find(
				(component) => component.type == "HEADER",
			);

			if (headerComponent) {
				// Depending on the header format, update the header_url with the file path
				if (headerComponent.format == "IMAGE") {
					headerComponent.example.header_handle = [filePath];
				} else if (headerComponent.format == "VIDEO") {
					headerComponent.example.header_handle = [filePath];
				} else if (headerComponent.format == "DOCUMENT") {
					headerComponent.example.header_handle = [filePath];
				}
			}
		}

		// Submit template to Facebook
		const data = await submitTemplateToFacebook(newTemplate, id);

		if (data && data.id) {
			// Save the Facebook template ID (fb_id)
			newTemplate.template_id = data.id;
		}

		if (req.file) {
			const mediaUrl = await getMediaUrl(filePath, accessToken);
		}
		// Return the saved template object after successful saving
		return newTemplate;
	} catch (error) {
		console.error("Error saving template to database:", error);
		throw new Error(`Error saving template to database: ${error.message}`);
	}
};

export async function submitTemplateToFacebook(savedTemplate, id) {
	try {
		let user = await User.findOne({ unique_id: id });

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

		console.log(JSON.stringify(plainTemplate.components));
		// Continue with the request data preparation
		const requestData = {
			name: plainTemplate.name,
			language: plainTemplate.language.code,
			allow_category_change: true,
			category: plainTemplate.category.toUpperCase(),
			components: plainTemplate.components,
		};

		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${user.WABA_ID}/message_templates`,
			requestData,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
				},
			},
		);

		// If the response is successful, return the response data
		return response.data;
	} catch (error) {
		// console.log(error.response.data.error);
		// Handle different error types
		if (error.response) {
			throw new Error(
				error.response.data.error?.error_user_msg ||
					error.response.data.error?.error_user_title ||
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

export async function updateTemplateOnFacebook(originalTemplate, user) {
	try {
		// Clean up the components array similar to what you do in submitTemplateToFacebook
		const cleanedComponents = originalTemplate.components.map(
			(component) => {
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
			},
		);

		// Prepare the request data
		const requestData = {
			category: originalTemplate.category.toUpperCase(), // Facebook requires uppercase
			components: cleanedComponents,
		};
		// console.log(JSON.stringify(requestData));
		// POST request to the WhatsApp template API endpoint
		const response = await axios.post(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${originalTemplate.template_id}`,
			requestData,
			{
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
				},
			},
		);

		// Return the response data if successful
		return response.data;
	} catch (error) {
		console.log(error.response.data.error);
		if (error.response) {
			throw new Error(
				error.response.data.error?.error_user_msg ||
					error.response.data.error?.error_user_title ||
					error.response.data.error?.message ||
					"Unknown error from Facebook",
			);
		} else if (error.request) {
			console.error("No response received from Facebook:", error.request);
			throw new Error("No response received from Facebook");
		} else {
			console.error("Error with the request:", error.message);
			throw new Error("Error with the request: " + error.message);
		}
	}
}

export const fetchFacebookTemplates = async (id) => {
	try {
		const user = await User.findOne({ unique_id: id });

		const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${user.WABA_ID}/message_templates`;

		// Using native fetch API
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
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

export function createComponents(templateData, dynamicVariables) {
	const components = [];
	// console.log(templateData.header.content);
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
			example: {},
		});
	} else if (templateData.header.type === "document") {
		components.push({
			type: "HEADER",
			format: "DOCUMENT",
			example: {},
		});
	} else if (templateData.header.type === "video") {
		components.push({
			type: "HEADER",
			format: "VIDEO",
			example: {},
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

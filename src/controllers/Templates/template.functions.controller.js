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
		console.error(
			"Error fetching media URL:",
			error.data.error.error_user_msg ||
				error.data.error.error_user_title ||
				error.data.error.message,
		);
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
	FB_PHONE_ID,
	req,
	templateData,
	dynamicVariables,
	selectedLanguageCode,
	id,
	url,
) => {
	try {
		const components = createComponents(
			templateData,
			dynamicVariables,
			templateData?.body_preview,
		);

		const newTemplate = new Template({
			FB_PHONE_ID,
			name: templateData.templateName,
			category: templateData.category,
			components,
			unique_id: generateUniqueId(),
			useradmin: id,
			dynamicVariables,
			language: selectedLanguageCode,
			agentName: req.session?.user?.name || req.session?.addedUser?.name,
			body_preview: templateData?.body_preview,
		});

		let headerComponent;

		if (req.file) {
			let filePath = path.join(
				__dirname,
				"uploads",
				id,
				req.file.filename,
			);

			const user = await User.findOne({ unique_id: id });

			const accessToken = user.FB_ACCESS_TOKEN;

			const appId = process.env.FB_APP_ID;

			filePath = await uploadMediaResumable(accessToken, appId, filePath);

			headerComponent = newTemplate.components.find(
				(component) => component.type === "HEADER",
			);

			if (headerComponent) {
				let fileUrl = `${url}/uploads/${id}/${req.file?.filename}`;
				if (headerComponent.format === "IMAGE") {
					headerComponent.example.header_handle = [filePath];
					headerComponent.example.header_url = fileUrl;
				} else if (headerComponent.format === "VIDEO") {
					headerComponent.example.header_url = fileUrl;
					headerComponent.example.header_handle = [filePath];
					console.log(headerComponent.example.header_url);
				} else if (headerComponent.format === "DOCUMENT") {
					headerComponent.example.header_url = fileUrl;
					headerComponent.example.header_handle = [filePath];
				}
			}
		}

		const data = await submitTemplateToFacebook(newTemplate, id);

		if (data && data.id) {
			newTemplate.template_id = data.id;
		}

		if (req.file) {
			if (headerComponent) {
				let fileUrl = `${url}/uploads/${id}/${req.file?.filename}`;
				if (headerComponent.format === "IMAGE") {
					console.log("img");
					headerComponent.example.header_url = fileUrl;
				} else if (headerComponent.format === "VIDEO") {
					console.log("vid");
					headerComponent.example.header_url = fileUrl;
					console.log(headerComponent.example.header_url);
				} else if (headerComponent.format === "DOCUMENT") {
					console.log("doc");
					headerComponent.example.header_url = fileUrl;
				}
			}
		}

		return newTemplate;
	} catch (error) {
		console.error("Error saving template to database:", error);
		throw error.message || error;
	}
};

export async function submitTemplateToFacebook(savedTemplate, id) {
	try {
		let user = await User.findOne({ unique_id: id });

		const plainTemplate = savedTemplate.toObject();

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

			if (cleanComponent.example && cleanComponent.example.header_url) {
				delete cleanComponent.example.header_url;
			}

			return cleanComponent;
		});

		const requestData = {
			name: plainTemplate.name,
			language: plainTemplate.language.code,
			category: plainTemplate.category.toUpperCase(),
			components: plainTemplate.components,
		};

		if (plainTemplate?.validityPeriod) {
			requestData.message_send_ttl_seconds = Number(
				plainTemplate?.validityPeriod,
			);
		}

		// console.log(JSON.stringify(requestData));

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

		return response.data;
	} catch (error) {
		// console.log(error.response.data.error);
		if (error.response) {
			throw (
				"Error from Meta: " +
					error.response.data.error?.error_user_msg ||
				error.response.data.error?.error_user_title ||
				error.response.data.error?.message ||
				"Unknown error from Facebook"
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
				if (
					cleanComponent.example &&
					cleanComponent.example.header_url
				) {
					delete cleanComponent.example.header_url;
				}

				return cleanComponent;
			},
		);
		// console.log(JSON.stringify(cleanedComponents));
		// Prepare the request data
		const requestData = {
			category: originalTemplate.category.toUpperCase(), // Facebook requires uppercase
			components: cleanedComponents,
		};
		console.log(JSON.stringify(requestData));
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

export function createComponents(templateData, dynamicVariables, html) {
	const components = [];
	const converted = convertHtmlToWhatsApp(html);

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
			text: converted || templateData.body,
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

export async function saveAuthTemplate(
	dynamicVariables,
	FB_PHONE_ID,
	name,
	language,
	category,
	components,
	useradmin,
	validityPeriod,
	agentName,
) {
	try {
		const newTemplate = new Template({
			FB_PHONE_ID,
			name,
			category,
			components,
			unique_id: generateUniqueId(),
			useradmin,
			language,
			dynamicVariables,
			validityPeriod,
			agentName,
		});

		const data = await submitTemplateToFacebook(newTemplate, useradmin);
		if (data?.id) {
			newTemplate.template_id = data.id;
			if (data.status === "APPROVED") {
				newTemplate.status = "Approved";
			} else if (data.status === "REJECTED") {
				newTemplate.status = "Rejected";
			}
			return newTemplate;
		} else {
			console.error("❌ Failed to submit template to Facebook:", data);
			throw data;
		}
	} catch (err) {
		console.error("🚨 Error submitting auth template:", err);
		throw err;
	}
}

export function convertHtmlToWhatsApp(html) {
	if (!html) return "";

	const placeholders = [];
	html = String(html).replace(/{{\s*\d+\s*}}/g, (m) => {
		const i = placeholders.length;
		placeholders.push(m);
		return `__PH_${i}__`;
	});

	html = html.replace(/\r\n/g, "\n");
	html = html.replace(/&nbsp;/gi, "\u00A0");

	const tagRe = /<\s*(\/)?\s*([a-zA-Z0-9]+)([^>]*)>/g;

	// ✅ Updated: no markers returned (disable * _ ~ completely)
	function markersFromTag(tagName, attrStr) {
		const markers = [];
		const tag = (tagName || "").toLowerCase();
		if (tag === "b" || tag === "strong") markers.push("*");
		if (tag === "i" || tag === "em") markers.push("_");
		if (tag === "u") markers.push("_");
		if (tag === "s" || tag === "strike" || tag === "del") markers.push("~");
		if (attrStr) {
			const s = attrStr.toLowerCase();
			if (
				/\bfont-weight\s*:\s*(bold|\d{3,})/.test(s) &&
				!markers.includes("*")
			)
				markers.unshift("*");
			if (/\bfont-style\s*:\s*italic/.test(s) && !markers.includes("_"))
				markers.unshift("_");
			if (
				/\btext-decoration\s*:\s*line-through/.test(s) &&
				!markers.includes("~")
			)
				markers.unshift("~");
			if (
				/\btext-decoration\s*:\s*underline/.test(s) &&
				!markers.includes("_")
			)
				markers.unshift("_");
		}
		return markers;
		return [];
	}

	function extractAttr(attrStr, name) {
		if (!attrStr) return "";
		const re = new RegExp(
			name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))",
			"i",
		);
		const r = re.exec(attrStr);
		return r ? r[1] || r[2] || r[3] || "" : "";
	}

	const stack = [];
	let out = "";
	let lastIndex = 0;
	let m;

	function processSegment(segment) {
		return segment.replace(/\u00A0/g, " ");
	}

	while ((m = tagRe.exec(html)) !== null) {
		const isClose = !!m[1];
		const tagName = m[2];
		const attrStr = m[3] || "";
		const idx = m.index;

		if (lastIndex < idx) {
			out += html.slice(lastIndex, idx);
		}
		lastIndex = tagRe.lastIndex;

		const tag = (tagName || "").toLowerCase();

		if (!isClose) {
			if (tag === "br") {
				// out += "\n";
				out += "\u000B";
				continue;
			}
			 // handle opening <p> - do nothing special (we'll add blank line on close)
    if (tag === "p") {
        // don't output text now; content will be collected until </p>
        continue;
    }
			const markers = markersFromTag(tag, attrStr);
			const href =
				extractAttr(attrStr, "href") ||
				extractAttr(attrStr, "xlink:href") ||
				"";
			stack.push({ tag, markers, href });
			// ensure space before markers if needed
			if (out && !out.endsWith(" ")) out += " ";
			out += markers.join("");

			// ✅ Updated: no marker injection
			// out += "";
		} else {
			// find matching opener in stack
			let poppedIndex = -1;
			for (let i = stack.length - 1; i >= 0; i--) {
				if (stack[i].tag === tag) {
					poppedIndex = i;
					break;
				}
			}
			if (poppedIndex === -1) continue;

			const popped = stack.splice(poppedIndex)[0];

			const closeMarkers = (popped.markers || [])
				.slice()
				.reverse()
				.join("");

			out += closeMarkers;
			// ensure space after markers if needed
			if (!out.endsWith(" ")) out += " ";

			// ✅ Updated: no closing markers added
			// out += "";
			// right after processing popped and closeMarkers:
    if (popped.tag === "p") {
        // Add two newlines to represent a paragraph break.
        out += "\n\n";
        // do NOT add extra space here
        continue;
    }

			if (popped.tag === "a" && popped.href) {
				const href = popped.href.trim();
				if (href && href !== "#") out += ` (${href})`;
			}
		}
	}

	if (lastIndex < html.length) out += html.slice(lastIndex);
	out = out.replace(
		/([*_~`]+)(\s*)([\s\S]*?)(\s*)(\1)/g,
		(full, openM, lead, inner, trail, closeM) => {
			if (openM !== closeM) return full;
			const core = inner.trim();
			if (!core) return "";
			return ` ${openM}${core}${closeM} `;
		},
	);

	// ✅ Removed marker placement regex block (not needed anymore)

	out = processSegment(out);
	out = out.replace(/__PH_(\d+)__/g, (_, n) => placeholders[Number(n)] || "");

	out = out.replace(/\r/g, "");
	out = out.replace(/\u00A0/g, " ");
	out = out.trimEnd();

	// FINAL FIX: allow double/ triple blank line spacing exactly as typed
	out = out.replace(/\u000B/g, "\n");


	const found = [...out.matchAll(/{{\s*(\d+)\s*}}/g)].map((x) =>
		Number(x[1]),
	);
	if (found.length > 0) {
		const max = Math.max(...found);
		for (let i = 1; i <= max; i++) {
			if (!found.includes(i))
				throw new Error(`Missing placeholder {{${i}}}`);
		}
	}

	if (out.length > 1024) throw new Error("Body exceeds 1024 characters");

	return out;
}


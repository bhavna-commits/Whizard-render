import https from "https";
import dotenv from "dotenv";
import Template from "../../models/templates.model.js";
const { WABA_ID, FB_ACCESS_TOKEN } = process.env;

dotenv.config();

export const saveTemplateToDatabase = async (req, templateData, id) => {
	// Prepare components for the template (assuming these are in request body)
	const components = templateData.components || [];

	// Validate and prepare other fields
	const language = templateData.language || "en";
	const namespace = templateData.namespace || "default_namespace";
	const subscribeUpdate = Date.now();
	const whizardStatus = templateData.whizard_status || 1;

	// Create a new Template document and save it to the database
	const newTemplate = new Template({
		owner: id,
		name: templateData.name,
		category: templateData.category,
		components: components,
		language: language,
		namespace: namespace,
		rejected_reason: "NONE",
		status: "pending",
		subscribe_update: subscribeUpdate,
		whizard_status: whizardStatus,
		unique_id: `unique_${Date.now()}`,
		useradmin: req.session.user || 1,
	});

	// If the template has a HEADER component with media, handle file paths
	const header = components.find((component) => component.type === "HEADER");

	if (header && header.format && req.file) {
		const __dirname = path.resolve();
		const filePath = path.join(
			__dirname,
			"..",
			"uploads",
			req.session.user.id,
			req.file.filename,
		);

		// Check if the file exists and update the header's example field
		if (fs.existsSync(filePath)) {
			header.example = {
				header_handle: [filePath], // Set the file path as header_handle
			};
		} else {
			header.example = {
				header_handle: [], // No file found, leave header_handle empty
			};
		}
	}

	const savedTemplate = await newTemplate.save();
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
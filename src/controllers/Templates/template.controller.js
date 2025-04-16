import axios from "axios";
import fs from "fs";
import path from "path";
import Template from "../../models/templates.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import Permissions from "../../models/permissions.model.js";
import User from "../../models/user.model.js";
import dotenv from "dotenv";
import {
	saveTemplateToDatabase,
	submitTemplateToFacebook,
	fetchFacebookTemplates,
	updateTemplateOnFacebook,
	createComponents,
	uploadAndRetrieveMediaURL,
	uploadMediaResumable,
} from "./template.functions.controller.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { languages, languagesCode } from "../../utils/dropDown.js";
import {
	isNumber,
	isObject,
	isString,
} from "../../middleWares/sanitiseInput.js";

dotenv.config();

const __dirname = path.resolve();

export const createTemplate = async (req, res, next) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const { dynamicVariables, name, selectedLanguageCode, url } =
			templateData;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// if (!isObject(templateData)) return next();

		// Check if a template with the same name exists for the user
		const exists = await Template.findOne({
			useradmin: id,
			name,
			deleted: false,
		});

		if (exists) {
			return res.status(500).json({
				success: false,
				message: `This template name already exists, choose a different name`,
			});
		}

		// Save template to DB
		const savedTemplate = await saveTemplateToDatabase(
			req,
			templateData,
			dynamicVariables,
			selectedLanguageCode,
			id,
			url,
		);

		await ActivityLogs.create({
			useradmin: id,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Create",
			details: `Created new template named: ${savedTemplate.name}`,
		});

		await savedTemplate.save();
		// Respond success
		res.status(201).json({
			success: true,
			message: "Template created successfully.",
		});
	} catch (error) {
		console.error("Error creating template:", error);
		res.status(500).json({
			success: false,
			message: error.message || error,
		});
	}
};

export const getList = async (req, res, next) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const { category, search, language } = req.query; // Language is added
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isString(category, search, language)) return next();

		const match = {
			useradmin: id,
			deleted: { $ne: true },
		};

		// Handle category filter
		if (category && category != "Category") {
			match["category"] = category;
		}

		// Handle search filter
		const searchQuery = search?.trim();
		if (searchQuery) {
			match["name"] = {
				$regex: new RegExp(searchQuery, "ims"),
			};
		}

		// Handle language filter (added condition for language)
		if (language && language !== "Language") {
			match["language.code"] = language;
		}

		const result = await Template.aggregate([
			{ $match: match },
			{ $sort: { createdAt: -1 } },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		const templates = result[0]?.paginatedResults || [];
		const totalCount = result[0]?.totalCount[0]?.total || 0;
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.templates?.type) {
				res.render("Templates/manage_template", {
					access,
					list: templates,
					page,
					totalPages,
					color: req.session?.addedUser?.color,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
					languagesCode,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: id });
			res.render("Templates/manage_template", {
				access: access.access,
				list: templates,
				page,
				totalPages,
				color: req.session.user.color,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				whatsAppStatus: req.session?.user?.whatsAppStatus,
				languagesCode,
			});
		}
	} catch (error) {
		console.log(error);
		res.render("errors/serverError");
	}
};

export const getDuplicateTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;

		if (!templateId)
			return res.status(404).json({
				success: false,
				error: "Template id not found",
			});

		if (!isString(templateId)) return next();
		// Find the template by its ID
		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		let mediaFileData = null;
		const headerComponent = originalTemplate.components.find(
			(component) =>
				component.type === "HEADER" &&
				(component.format === "IMAGE" ||
					component.format === "DOCUMENT" ||
					component.format === "VIDEO"),
		);

		let mediaFileName = null;
		// Assuming you have the file path stored in your template
		if (headerComponent && headerComponent.example?.header_url) {
			const mediaFileUrl = headerComponent.example.header_url;
			console.log(mediaFileUrl);
			mediaFileName = mediaFileUrl.split("/").pop();
			// Assuming you store the file path on your server
			const mediaFilePath = path.join(
				__dirname,
				"uploads",
				req.session?.user?.id || req.session?.addedUser?.owner,
				mediaFileName,
			);

			// Check if the file exists
			if (fs.existsSync(mediaFilePath)) {
				// Read the file and convert it into a buffer or base64 format
				mediaFileData = fs.readFileSync(mediaFilePath);
			} else {
				throw "Media file not found";
			}
		}

		// Permissions check (unchanged)
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (
				access.templates.duplicateTemplate &&
				req.session?.addedUser?.whatsAppStatus
			) {
				res.status(200).render("Templates/duplicateTemplate", {
					access,
					templateData: originalTemplate,
					name: req.session?.addedUser?.name,
					photo: req.session?.addedUser?.photo,
					color: req.session?.addedUser?.color,
					languagesCode,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
					mediaFileData: mediaFileData
						? mediaFileData.toString("base64")
						: null,
					mediaFileName,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else if (req.session?.user?.whatsAppStatus) {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Templates/duplicateTemplate", {
				access: access.access,
				templateData: originalTemplate,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
				languagesCode,
				whatsAppStatus: access.whatsAppStatus,
				mediaFileData: mediaFileData
					? mediaFileData.toString("base64")
					: null, // Send file data as base64
				mediaFileName,
			});
		} else {
			res.render("errors/notAllowed");
		}
	} catch (error) {
		console.error(error);
		res.status(500).render("errors/serverError");
	}
};

export const getEditTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;

		if (!templateId)
			return res.status(404).json({
				success: false,
				error: "Template id not found",
			});

		if (!isString(templateId)) return next();
		// Find the template by its ID
		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		let mediaFileData = null;
		const headerComponent = originalTemplate.components.find(
			(component) =>
				component.type === "HEADER" &&
				(component.format === "IMAGE" ||
					component.format == "DOCUMENT"),
		);

		let mediaFileName = null;
		// Assuming you have the file path stored in your template
		if (headerComponent && headerComponent.example?.header_url) {
			const mediaFileUrl = headerComponent.example.header_url;
			console.log(mediaFileUrl);
			mediaFileName = mediaFileUrl.split("/").pop();
			// Assuming you store the file path on your server
			const mediaFilePath = path.join(
				__dirname,
				"uploads",
				req.session?.user?.id || req.session?.addedUser?.owner,
				mediaFileName,
			);

			// Check if the file exists
			if (fs.existsSync(mediaFilePath)) {
				// Read the file and convert it into a buffer or base64 format
				mediaFileData = fs.readFileSync(mediaFilePath);
			} else {
				throw "Media file not found";
			}
		}

		// Permissions check (unchanged)
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (
				access.templates.editTemplate &&
				req.session?.addedUser?.whatsAppStatus
			) {
				res.status(200).render("Templates/duplicateTemplate", {
					access,
					templateData: originalTemplate,
					name: req.session?.addedUser?.name,
					photo: req.session?.addedUser?.photo,
					color: req.session?.addedUser?.color,
					languagesCode,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
					mediaFileData: mediaFileData
						? mediaFileData.toString("base64")
						: null,
					mediaFileName,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else if (req.session?.user?.whatsAppStatus) {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Templates/duplicateTemplate", {
				access: access.access,
				templateData: originalTemplate,
				name: req.session?.user?.name,
				photo: req.session?.user?.photo,
				color: req.session?.user?.color,
				languagesCode,
				whatsAppStatus: access.whatsAppStatus,
				mediaFileData: mediaFileData
					? mediaFileData.toString("base64")
					: null, // Send file data as base64
				mediaFileName,
			});
		} else {
			res.render("errors/notAllowed");
		}
	} catch (error) {
		console.error(error);
		res.status(500).render("errors/serverError");
	}
};

export const editTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;
		if (!templateId)
			return res.status(404).json({
				success: false,
				error: "Template id not found",
			});
		if (!isString(templateId)) return next();

		// Retrieve the original template from DB
		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		// Parse new template data from request body
		const templateData = JSON.parse(req.body.templateData);
		const { dynamicVariables, templateName, selectedLanguageCode, url } =
			templateData;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Check for duplicate template names
		const exists = await Template.findOne({
			useradmin: id,
			templateName,
			deleted: false,
			_id: { $ne: templateId },
		});
		if (exists) {
			return res.status(500).json({
				success: false,
				message:
					"This template name already exists, choose a different name",
			});
		}

		const components = createComponents(templateData, dynamicVariables);
		originalTemplate.dynamicVariables = dynamicVariables;
		originalTemplate.name = templateName;
		originalTemplate.selectedLanguageCode = selectedLanguageCode;
		originalTemplate.url = url;
		console.log(JSON.stringify(components));
		originalTemplate.components = components;

		const user = await User.findOne({ unique_id: id });

		if (req.file) {
			let filePath = path.join(
				__dirname,
				"uploads",
				id,
				req.file.filename,
			);

			const accessToken = user.FB_ACCESS_TOKEN;

			const appId = process.env.FB_APP_ID;

			filePath = await uploadMediaResumable(accessToken, appId, filePath);

			// Find the HEADER component and update its header_handle with the media URL.
			const headerComponent = originalTemplate.components.find(
				(component) => component.type === "HEADER",
			);
			if (headerComponent) {
				let fileUrl = `${url}/uploads/${id}/${req.file?.filename}`;
				// Depending on the header format, update the header_url with the file path
				if (headerComponent.format === "IMAGE") {
					console.log("img");
					headerComponent.example.header_handle = [filePath];
					headerComponent.example.header_url = fileUrl;
				} else if (headerComponent.format === "VIDEO") {
					console.log("vid");
					headerComponent.example.header_url = fileUrl;
					headerComponent.example.header_handle = [filePath];
					console.log(headerComponent.example.header_url);
				} else if (headerComponent.format === "DOCUMENT") {
					console.log("doc");
					headerComponent.example.header_url = fileUrl;
					headerComponent.example.header_handle = [filePath];
				}
			}
		}

		// Update the template on Facebook
		const updatedData = await updateTemplateOnFacebook(
			originalTemplate,
			user,
		);
		if (updatedData && updatedData.id) {
			originalTemplate.template_id = updatedData.id;
		}

		// Save the updated template in DB
		await originalTemplate.save();

		// Log the activity
		await ActivityLogs.create({
			useradmin: id,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Update",
			details: `Updated template named: ${originalTemplate.name}`,
		});

		res.status(200).json({
			success: true,
			message: "Template updated successfully.",
		});
	} catch (error) {
		console.error("Error updating template:", error);
		res.status(500).json({
			success: false,
			message: `Error updating template: ${error.message}`,
		});
	}
};

export const deleteTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		if (!templateId)
			return res
				.status(404)
				.json({ success: false, error: "Template id not found" });

		// Check if templateId is a string
		if (!isString(templateId)) return next();

		// Find the template in the database
		const deletedTemplate = await Template.findByIdAndUpdate(
			{ _id: templateId },
			{ deleted: true },
		);

		if (!deletedTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		// Get the user to retrieve the WABA_ID and access token
		const user = await User.findOne({
			unique_id: id,
		});

		if (!user || !user.WABA_ID || !user.FB_ACCESS_TOKEN) {
			return res.status(500).json({
				success: false,
				error: "Failed to retrieve user or credentials",
			});
		}

		// Send DELETE request to Meta's API to delete the template
		const response = await axios.delete(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${user.WABA_ID}/message_templates`,
			{
				params: {
					hsm_id: deletedTemplate.template_id, // Assuming the template ID on Meta is stored as template_id
					name: deletedTemplate.name,
				},
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
				},
			},
		);

		// Check the Meta API response for success
		if (response.data?.success) {
			// Log the deletion in ActivityLogs
			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				actions: "Delete",
				details: `Deleted Template named: ${deletedTemplate.name}`,
			});

			return res.status(200).json({
				success: true,
				message: "Template deleted successfully from both DB and Meta",
			});
		} else {
			return res.status(500).json({
				success: false,
				error: "Failed to delete the template from Meta",
			});
		}
	} catch (error) {
		// Handle any errors during the delete process
		res.status(500).json({ success: false, error: error.message });
	}
};

export const getCampaignSingleTemplates = async (req, res) => {
	try {
		// Fetch the template data by ID
		const templateData = await Template.findOne({
			unique_id: req.params.id,
		});
		if (!templateData) {
			return res.status(404).json({ error: "Template not found" });
		}

		// Handle file attachments for media in the header component
		const headerComponent = templateData.components.find(
			(component) => component.type === "HEADER",
		);

		if (
			headerComponent &&
			headerComponent.example &&
			headerComponent.example.header_handle[0]
		) {
			const filePath = headerComponent.example.header_handle[0];

			console.log("filePath:", filePath);

			if (fs.existsSync(filePath)) {
				headerComponent.fileUrl = `/${filePath.replace(/\\/g, "/")}`;
			} else {
				headerComponent.fileUrl = null;
			}
		}

		res.status(200).json({
			success: true,
			template: templateData,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

export const getFaceBookTemplates = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Fetch templates from MongoDB based on logged-in user
		const mongoTemplates = await Template.find({ useradmin: id });
		// Fetch templates from Facebook Graph API
		const facebookTemplatesResponse = await fetchFacebookTemplates(id);
		const facebookTemplates = facebookTemplatesResponse.data;

		// Loop through the MongoDB templates
		for (let mongoTemplate of mongoTemplates) {
			// Find the matching template in the Facebook templates by name
			const matchingFacebookTemplate = facebookTemplates.find(
				(fbTemplate) => fbTemplate.name === mongoTemplate.name,
			);

			if (matchingFacebookTemplate) {
				// Update the status in the MongoDB template based on Facebook data
				let newStatus;
				let rejectedReason = mongoTemplate.rejected_reason || null;

				switch (matchingFacebookTemplate.status) {
					case "APPROVED":
						newStatus = "Approved";
						rejectedReason = "NONE"; // Reset reason if approved
						break;
					case "REJECTED":
						console.log(JSON.stringify(matchingFacebookTemplate));
						newStatus = "Rejected";
						rejectedReason =
							matchingFacebookTemplate.rejected_reason ||
							"UNKNOWN";
						break;
					default:
						newStatus = "Pending";
				}

				// Only update if the status or rejected_reason has changed.
				if (
					mongoTemplate.status !== newStatus ||
					mongoTemplate.rejected_reason !== rejectedReason
				) {
					mongoTemplate.status = newStatus;
					mongoTemplate.rejected_reason = rejectedReason;
					await mongoTemplate.save();
				}
			} else {
				// No matching template found in Facebook data; mark as deleted.
				if (!mongoTemplate.deleted) {
					mongoTemplate.deleted = true;
					await mongoTemplate.save();
				}
			}
		}

		// Respond with the updated templates from MongoDB
		const updatedTemplates = await Template.find({ useradmin: id });
		res.json({
			success: true,
			data: updatedTemplates,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

export const getCampaignTemplates = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Respond with the updated templates from MongoDB
		const updatedTemplates = await Template.find({
			useradmin: id,
			status: "Approved",
			deleted: false,
		}).sort({ createdAt: -1 });
		// console.log(updatedTemplates);
		res.json({
			success: true,
			data: updatedTemplates,
		});
	} catch (error) {
		// Handle errors, returning a 500 status code with error message
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

export const getCreateTemplate = async (req, res) => {
	let mediaFileData = null;
	let mediaFileName = null;
	const permissions = req.session?.addedUser?.permissions;
	if (permissions) {
		const access = await Permissions.findOne({ unique_id: permissions });
		if (
			access.templates.createTemplate &&
			req.session?.addedUser?.whatsAppStatus
		) {
			res.render("Templates/create-template", {
				access,
				templateData: [],
				name: req.session?.addedUser?.name,
				photo: req.session?.addedUser?.photo,
				color: req.session?.addedUser?.color,
				whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
				languagesCode,
				mediaFileData,
				mediaFileName,
			});
		} else {
			res.render("errors/notAllowed");
		}
	} else if (req.session?.user?.whatsAppStatus) {
		const access = await User.findOne({ unique_id: req.session?.user?.id });
		res.render("Templates/create-template", {
			access: access.access,
			templateData: [],
			name: req.session?.user?.name,
			photo: req.session?.user?.photo,
			color: req.session?.user?.color,
			whatsAppStatus: req.session?.user?.whatsAppStatus,
			languagesCode,
			mediaFileData,
			mediaFileName,
		});
	} else {
		res.render("errors/notAllowed");
	}
};

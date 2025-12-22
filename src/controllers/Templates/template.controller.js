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
	saveAuthTemplate,
} from "./template.functions.controller.js";
import {
	generateUniqueId,
	generateAuthTemplateToken,
} from "../../utils/otpGenerator.js";
import {
	languages,
	languagesCode,
	countries,
	help,
} from "../../utils/dropDown.js";
import {
	isNumber,
	isObject,
	isString,
} from "../../middleWares/sanitiseInput.js";

dotenv.config();

const __dirname = path.resolve();

export const getCreateTemplate = async (req, res) => {
	const { addedUser, user } = req.session || {};
	const isAddedUser = Boolean(addedUser?.permissions);
	const sessionUser = isAddedUser ? addedUser : user;

	if (!sessionUser?.whatsAppStatus) {
		return res.render("errors/notAllowed");
	}

	let access = null;

	if (isAddedUser) {
		access = await Permissions.findOne({
			unique_id: addedUser.permissions,
		});
		if (!access?.templates?.createTemplate) {
			return res.render("errors/notAllowed");
		}
	} else {
		const userDoc = await User.findOne({ unique_id: user?.id });
		access = userDoc?.access;
	}

	res.render("Templates/create-template", {
		access,
		templateData: [],
		name: sessionUser.name,
		photo: sessionUser.photo,
		color: sessionUser.color,
		whatsAppStatus: sessionUser.whatsAppStatus,
		languagesCode,
		mediaFileData: null,
		mediaFileName: null,
		countries,
		help,
	});
};

export const createTemplate = async (req, res, next) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const {
			dynamicVariables,
			templateName,
			selectedLanguageCode,
			url,
			category,
			components,
			validityPeriod,
		} = templateData;

		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		const user = await User.findOne({ unique_id: id });
		const FB_PHONE_ID =
			req.session?.addedUser?.selectedFBNumber?.phone_number_id ||
			user?.FB_PHONE_NUMBERS?.find((n) => n.selected)?.phone_number_id;

		const exists = await Template.findOne({
			useradmin: id,
			name: templateName,
			deleted: false,
		});

		if (exists) {
			return res.status(500).json({
				success: false,
				message: `This template name already exists, choose a different name`,
			});
		}

		let savedTemplate;
		if (category === "Authentication") {
			if (!user?.authTemplateToken) {
				user.authTemplateToken = generateAuthTemplateToken();
				await user.save();
			}
			savedTemplate = await saveAuthTemplate(
				dynamicVariables,
				FB_PHONE_ID,
				templateName,
				selectedLanguageCode,
				category,
				components,
				id,
				validityPeriod,
				req.session?.user?.name || req.session?.addedUser?.name,
			);
		} else {
			savedTemplate = await saveTemplateToDatabase(
				FB_PHONE_ID,
				req,
				templateData,
				dynamicVariables,
				selectedLanguageCode,
				id,
				url,
			);
		}

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
		const { category, search, language } = req.query;
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
			{ $sort: { updatedAt: -1 } },
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

		const sessionUser = req.session?.addedUser || req.session?.user;
		const permissionsId = sessionUser?.permissions;
		const userColor = sessionUser?.color;
		const userPhoto = sessionUser?.photo;
		const userName = sessionUser?.name;
		const whatsAppStatus = sessionUser?.whatsAppStatus;
		const user = await User.findOne({ unique_id: id });
		let access;

		if (permissionsId) {
			access = await Permissions.findOne({ unique_id: permissionsId });

			if (!access?.templates?.type) {
				return res.render("errors/notAllowed");
			}
		} else {
			access = user?.access;
		}

		res.render("Templates/manage_template", {
			authTemplateToken: user?.authTemplateToken,
			access,
			list: templates,
			page,
			totalPages,
			color: userColor,
			photo: userPhoto,
			name: userName,
			whatsAppStatus,
			languagesCode,
			help,
		});
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

		if (headerComponent && headerComponent.example?.header_url) {
			const mediaFileUrl = headerComponent.example.header_url;
			console.log(mediaFileUrl);
			mediaFileName = mediaFileUrl.split("/").pop();

			const mediaFilePath = path.join(
				__dirname,
				"uploads",
				req.session?.user?.id || req.session?.addedUser?.owner,
				mediaFileName,
			);

			if (fs.existsSync(mediaFilePath)) {
				mediaFileData = fs.readFileSync(mediaFilePath);
			} else {
				throw "Media file not found";
			}
		}

		let access;
		const isAddedUser = req.session?.addedUser;
		const isMainUser = req.session?.user;

		const renderData = {
			templateData: originalTemplate,
			languagesCode,
			mediaFileData: mediaFileData
				? mediaFileData.toString("base64")
				: null,
			mediaFileName,
			countries,
			help,
		};

		if (isAddedUser?.permissions) {
			access = await Permissions.findOne({
				unique_id: isAddedUser.permissions,
			});

			if (
				access?.templates?.duplicateTemplate &&
				isAddedUser.whatsAppStatus
			) {
				return res.status(200).render("Templates/duplicateTemplate", {
					...renderData,
					access,
					name: isAddedUser.name,
					photo: isAddedUser.photo,
					color: isAddedUser.color,
					whatsAppStatus: isAddedUser.whatsAppStatus,
				});
			}
		} else if (isMainUser?.whatsAppStatus) {
			const userData = await User.findOne({ unique_id: isMainUser.id });

			return res.render("Templates/duplicateTemplate", {
				...renderData,
				access: userData?.access,
				name: isMainUser.name,
				photo: isMainUser.photo,
				color: isMainUser.color,
				whatsAppStatus: userData?.whatsAppStatus,
			});
		}

		res.render("errors/notAllowed");
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
					component.format === "DOCUMENT" ||
					component.format === "VIDEO"),
		);

		let mediaFileName = null;
		// Assuming you have the file path stored in your template
		if (headerComponent && headerComponent.example?.header_url) {
			const mediaFileUrl = headerComponent.example.header_url;
			// console.log(mediaFileUrl);
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

		let access;
		const isAddedUser = req.session?.addedUser;
		const isMainUser = req.session?.user;

		const renderData = {
			templateData: originalTemplate,
			languagesCode,
			mediaFileData: mediaFileData
				? mediaFileData.toString("base64")
				: null,
			mediaFileName,
			countries,
			help,
		};

		if (isAddedUser?.permissions) {
			access = await Permissions.findOne({
				unique_id: isAddedUser.permissions,
			});

			if (access?.templates?.editTemplate && isAddedUser.whatsAppStatus) {
				return res.status(200).render("Templates/duplicateTemplate", {
					...renderData,
					access,
					name: isAddedUser.name,
					photo: isAddedUser.photo,
					color: isAddedUser.color,
					whatsAppStatus: isAddedUser.whatsAppStatus,
				});
			}
		} else if (isMainUser?.whatsAppStatus) {
			const userData = await User.findOne({ unique_id: isMainUser.id });

			return res.render("Templates/duplicateTemplate", {
				...renderData,
				access: userData?.access,
				name: isMainUser.name,
				photo: isMainUser.photo,
				color: isMainUser.color,
				whatsAppStatus: userData?.whatsAppStatus,
			});
		}

		res.render("errors/notAllowed");
	} catch (error) {
		console.error(error);
		res.status(500).render("errors/serverError");
	}
};
// edit template
export const editTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;
		if (!templateId)
			return res.status(404).json({
				success: false,
				error: "Template id not found",
			});
		if (!isString(templateId)) return next();

		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		const templateData = JSON.parse(req.body.templateData);
		const {
			dynamicVariables,
			templateName,
			selectedLanguageCode,
			url,
			body_preview,
			category,
		} = templateData;

		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Prevent editing category OR language if already approved
		if (originalTemplate.status === "APPROVED") {
			if (category !== originalTemplate.category) {
				return res.status(400).json({
					success: false,
					message:
						"You cannot update the category after the template is approved by Meta.",
				});
			}
			if (
				selectedLanguageCode !== originalTemplate.selectedLanguageCode
			) {
				return res.status(400).json({
					success: false,
					message:
						"You cannot update the language after the template is approved by Meta.",
				});
			}
		}

		// Check duplicate template name
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

		const components = createComponents(
			templateData,
			dynamicVariables,
			body_preview,
		);

		originalTemplate.dynamicVariables = dynamicVariables;
		originalTemplate.name = templateName;
		originalTemplate.selectedLanguageCode = selectedLanguageCode;
		originalTemplate.category = category;
		originalTemplate.url = url;
		originalTemplate.components = components;
		originalTemplate.status = "Pending";
		originalTemplate.body_preview = body_preview;

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

			const headerComponent = originalTemplate.components.find(
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
				} else if (headerComponent.format === "DOCUMENT") {
					headerComponent.example.header_url = fileUrl;
					headerComponent.example.header_handle = [filePath];
				}
			}
		}

		const updatedData = await updateTemplateOnFacebook(
			originalTemplate,
			user,
		);
		if (updatedData && updatedData.id) {
			originalTemplate.template_id = updatedData.id;
		}

		if (req.file) {
			const headerComponent = originalTemplate.components.find(
				(component) => component.type === "HEADER",
			);
			if (headerComponent) {
				let fileUrl = `${url}/uploads/${id}/${req.file?.filename}`;
				headerComponent.example.header_url = fileUrl;
			}
		}

		await originalTemplate.save();

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
		// ---------- USER ----------
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		if (!userId) {
			return res.status(401).json({
				success: false,
				error: "Unauthorized",
			});
		}

		// ---------- FETCH ----------
		const [mongoTemplates, facebookResponse] = await Promise.all([
			Template.find({ useradmin: userId }).lean(),
			fetchFacebookTemplates(userId),
		]);

		const fbTemplates = Array.isArray(facebookResponse?.data)
			? facebookResponse.data
			: [];

		// ---------- EXTRACT BODY VARIABLES ----------
		function extractVariables(components) {
			const body = components.find((c) => c.type === "BODY");
			if (!body?.text) return [];
			const matches = body.text.match(/\{\{\d+\}\}/g);
			return matches ? matches.map((v) => v.replace(/[{}]/g, "")) : [];
		}

		// ---------- DB MAP ----------
		const mongoMap = new Map();
		mongoTemplates.forEach((t) => {
			mongoMap.set(String(t.template_id), t);
		});

		let newDocs = [];
		let updateOps = [];

		// ---------- PROCESS LOOP ----------
		fbTemplates.forEach((fb) => {
			const exists = mongoMap.get(String(fb.id));

			// ⬇ convert facebook language into standard object
			// facebook: "en_US" → { code:"en_US", label:"en_US" }
			const langObject = {
				code: fb.language,
				label: fb.language,
			};

			// ---------- INSERT ----------
			if (!exists) {
				newDocs.push({
					useradmin: userId,
					template_id: fb.id,
					name: fb.name,

					language: langObject,

					status:
						fb.status === "APPROVED"
							? "Approved"
							: fb.status === "REJECTED"
							? "Rejected"
							: "Pending",

					category: fb.category || "MARKETING",

					dynamicVariables: extractVariables(fb.components),

					unique_id: fb.id,
					FB_PHONE_ID: "",
					deleted: false,
				});
			}

			// ---------- UPDATE ----------
			if (exists) {
				let update = {};

				// fix language mixing issue
				if (
					typeof exists.language === "string" ||
					!exists.language?.code
				) {
					update.language = langObject;
				}

				if (exists.category !== fb.category) {
					update.category = fb.category;
				}

				let newStatus =
					fb.status === "APPROVED"
						? "Approved"
						: fb.status === "REJECTED"
						? "Rejected"
						: "Pending";

				if (exists.status !== newStatus) {
					update.status = newStatus;
				}

				if (Object.keys(update).length > 0) {
					updateOps.push({
						updateOne: {
							filter: { _id: exists._id },
							update: { $set: update },
						},
					});
				}
			}
		});

		// ---------- WRITE ----------
		if (newDocs.length > 0) {
			await Template.insertMany(newDocs);
		}

		if (updateOps.length > 0) {
			await Template.bulkWrite(updateOps);
		}

		// ---------- FINAL OUTPUT ----------
		const finalMongo = await Template.find({
			useradmin: userId,
		}).lean();

		return res.json({
			success: true,
			message: "template sync complete",
			facebook_count: fbTemplates.length,
			db_count: finalMongo.length,
			facebook_data: fbTemplates,
			db_data: finalMongo,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
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
			category: { $ne: "Authentication" },
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


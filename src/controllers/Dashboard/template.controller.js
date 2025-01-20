import path from "path";
import fs from "fs";
import Template from "../../models/templates.model.js";
import dotenv from "dotenv";
import {
	saveTemplateToDatabase,
	submitTemplateToFacebook,
	fetchFacebookTemplates,
} from "./template.functions.controller.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import Permissions from "../../models/permissions.model.js";
import User from "../../models/user.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { isNumber, isObject, isString } from "../../middleWares/sanitiseInput.js";

dotenv.config();

export const createTemplate = async (req, res, next) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const { dynamicVariables, name } = templateData;
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isObject(templateData)) return next();

		// Check if a template with the same name exists for the user
		const exists = await Template.findOne({ useradmin: id, name });
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
			id,
		);

		// Submit template to Facebook
		const data = await submitTemplateToFacebook(savedTemplate);
		console.log("template creation : ", JSON.stringify(data));
		// Log activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
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
			message: `Error creating template: ${error.message}`,
		});
	}
};

// export const templatePreview = async (req, res) => {
// 	try {
// 		const id = req.session?.user?.id || req.session?.addedUser?.owner;
// 		const template = await Template.find({ owner: id });
// 		if (template) {
// 			res.render("Templates/create-template", {
// 				templateData: template,
// 				photo: req.session.user?.photo,
// 				name: req.session.user.name,
// 				color: req.session.user.color,
// 			});
// 		} else {
// 		}
// 	} catch (error) {
// 		res.status(400).json({
// 			success: false,
// 			error: error.message,
// 		});
// 	}
// };

export const getList = async (req, res, next) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const { category, search } = req.query;
		const limit = 6;
		const skip = (page - 1) * limit;

		// if (!isString(category, search)) return next();
		// if (!isNumber(page)) return next();

		const match = {
			useradmin: id,
			deleted: { $ne: true },
		};

		if (category && category != "Category") {
			match["category"] = category;
		} else if (category == "Category") {
			delete match["category"];
		}

		const searchQuery = search?.trim();

		if (searchQuery) {
			match["name"] = {
				$regex: new RegExp(searchQuery, "ims"),
			};
		}

		const result = await Template.aggregate([
			{
				$match: match,
			},
			{
				$sort: {
					createdAt: -1,
				},
			},
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
			// console.log(access);
			if (access?.templates?.type) {
				// console.log(templates);
				res.render("Templates/manage_template", {
					access,
					list: templates,
					page,
					totalPages,
					color: req.session?.addedUser?.color,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: id });
			// console.log(access.access);
			res.render("Templates/manage_template", {
				access: access.access,
				list: templates,
				page,
				totalPages,
				color: req.session.user.color,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				whatsAppStatus: req.session?.user?.whatsAppStatus,
			});
		}
	} catch (error) {
		console.log(error);
		res.render("errors/serverError");
	}
};

export const duplicateTemplate = async (req, res) => {
	try {
		const templateId = req.params?.id;

		if (!templateId)
			return res
				.status(404)
				.json({ success: false, error: "Template id not found" });

		if (!isString(templateId)) return next();
		// Find the template by its ID
		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		// Create a new template with the same data but a new _id
		const newTemplate = new Template({
			...originalTemplate.toObject(),
			createdAt: new Date(),
			updatedAt: new Date(),
			unique_id: generateUniqueId(), // Generate a new unique ID
		});

		// Save the duplicated template
		const savedTemplate = await newTemplate.save();

		// Log the duplication activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Create",
			details: `Duplicated Template named: ${savedTemplate.name}`,
		});

		res.status(201).json({ success: true, template: savedTemplate });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const deleteTemplate = async (req, res, next) => {
	try {
		const templateId = req.params?.id;
		if (!templateId)
			return res
				.status(404)
				.json({ success: false, error: "Template id not found" });

		if (!isString(templateId)) return next();

		const deletedTemplate = await Template.findByIdAndUpdate(
			{ _id: templateId },
			{ deleted: true },
		);
		if (!deletedTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Delete",
			details: `Deleted Template named: ${deletedTemplate.name}`,
		});

		res.status(200).json({
			success: true,
			message: "Template deleted successfully",
		});
	} catch (error) {
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
		// console.log(mongoTemplates);
		// Fetch templates from Facebook Graph API
		const facebookTemplatesResponse = await fetchFacebookTemplates();
		const facebookTemplates = facebookTemplatesResponse.data;
		// console.log(facebookTemplates);
		// Loop through the MongoDB templates and update their status based on Facebook data
		for (let mongoTemplate of mongoTemplates) {
			// Find the matching template in the Facebook templates by name
			const matchingFacebookTemplate = facebookTemplates.find(
				(fbTemplate) => fbTemplate.name === mongoTemplate.name,
			);
			// console.log(matchingFaceboo	kTemplate);
			// If a match is found, update the status in the MongoDB template
			if (matchingFacebookTemplate) {
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

				// Only update if the status has changed
				if (
					mongoTemplate.status !== newStatus ||
					mongoTemplate.rejected_reason !== rejectedReason
				) {
					mongoTemplate.status = newStatus;
					mongoTemplate.rejected_reason = rejectedReason; // Update rejected reason
					await mongoTemplate.save(); // Save the updated template
				}
			}
		}

		// Respond with the updated templates from MongoDB
		const updatedTemplates = await Template.find({ useradmin: id });
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

export const getCampaignTemplates = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Respond with the updated templates from MongoDB
		const updatedTemplates = await Template.find({
			useradmin: id,
			status: "Approved", 
		});
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
	const permissions = req.session?.addedUser?.permissions;
	if (permissions) {
		const access = Permissions.findOne({ unique_id: permissions });
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
			});
		} else {
			res.render("errors/notAllowed");
		}
	} else if (req.session?.user?.whatsAppStatus) {
		const access = User.findOne({ unique_id: req.session?.user?.id });
		res.render("Templates/create-template", {
			access: access.access,
			templateData: [],
			name: req.session?.user?.name,
			photo: req.session?.user?.photo,
			color: req.session?.user?.color,
			whatsAppStatus: req.session?.user?.whatsAppStatus,
		});
	} else {
		res.render("errors/notAllowed");
	}
};

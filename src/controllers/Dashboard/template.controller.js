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

dotenv.config();

export const createTemplate = async (req, res) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const { dynamicVariables } = templateData;
		const id = req.session.user.id;
		console.log(templateData);

		// Save template to DB
		const savedTemplate = await saveTemplateToDatabase(
			req,
			templateData,
			dynamicVariables,
			id,
		);

		// Submit template to Facebook
		await submitTemplateToFacebook(savedTemplate);

		// Log activity
		await ActivityLogs.create({
			name: req.session.user?.name || req.session.addedUser?.name,
			actions: "Create",
			details: `Created new template named: ${savedTemplate.name}`,
		});

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

export const templatePreview = async (req, res) => {
	try {
		const id = req.session.user.id;
		const template = await Template.find({ owner: id });
		if (template) {
			res.render("Templates/create-template", {
				templateData: template,
			});
		} else {
		}
	} catch (error) {
		res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

export const getList = async (req, res) => {
	try {
		const id = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const result = await Template.aggregate([
			{
				$match: {
					useradmin: id,
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

		// Calculate total pages
		const totalPages = Math.ceil(totalCount / limit);

		res.render("Templates/manage_template", {
			list: templates,
			page,
			totalPages,
		});
	} catch (error) {
		res.render("Templates/manage_template", {
			list: [],
			page: 1,
			totalPages: 0,
		});
	}
};

export const duplicateTemplate = async (req, res) => {
	try {
		const templateId = req.params.id;

		// Find the template by its ID
		const originalTemplate = await Template.findById(templateId);
		if (!originalTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		// Create a new template with the same data but a new _id
		const newTemplate = new Template({
			...originalTemplate.toObject(), // Copy all properties
			_id: undefined, // Remove _id to generate a new one
			createdAt: new Date(),
			updatedAt: new Date(),
			unique_id: `unique_${Date.now()}`, // Generate a new unique ID
			status: "pending", // New template starts as pending
		});

		// Save the duplicated template
		const savedTemplate = await newTemplate.save();

		// Log the duplication activity
		await ActivityLogs.create({
			name: req.session.user.name || req.session.addedUser.name,
			actions: "Create",
			details: `Duplicated Template named: ${savedTemplate.name}`,
		});

		res.status(201).json({ success: true, template: savedTemplate });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const deleteTemplate = async (req, res) => {
	try {
		const templateId = req.params.id;

		const one = Template.findById(templateId);
		const deletedTemplate = await Template.findByIdAndDelete(templateId);
		if (!deletedTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

		await ActivityLogs.create({
			name: req.session.user.name || req.session.addedUser.name,
			actions: "Delete",
			details: `Deleted Template named: ${one.name}`,
		});

		res.status(200).json({
			success: true,
			message: "Template deleted successfully",
		});
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const getCampaignTemplates = async (req, res) => {
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

export const getTemplates = async (req, res) => {
	try {
		const { id } = req.session.user;

		// Fetch templates from MongoDB based on logged-in user
		// const mongoTemplates = await Template.find({ owner: id });

		// Fetch templates from Facebook Graph API
		// const facebookTemplatesResponse = await fetchFacebookTemplates();
		// const facebookTemplates = facebookTemplatesResponse.data;

		// Loop through the MongoDB templates and update their status based on Facebook data
		// for (let mongoTemplate of mongoTemplates) {
		// 	// Find the matching template in the Facebook templates by name
		// 	const matchingFacebookTemplate = facebookTemplates.find(
		// 		(fbTemplate) => fbTemplate.name === mongoTemplate.name,
		// 	);

		// 	// If a match is found, update the status in the MongoDB template
		// 	if (matchingFacebookTemplate) {
		// 		let newStatus;
		// 		let rejectedReason = mongoTemplate.rejected_reason || null;

		// 		switch (matchingFacebookTemplate.status) {
		// 			case "APPROVED":
		// 				newStatus = "approved";
		// 				rejectedReason = "NONE"; // Reset reason if approved
		// 				break;
		// 			case "REJECTED":
		// 				newStatus = "rejected";
		// 				rejectedReason =
		// 					matchingFacebookTemplate.rejected_reason ||
		// 					"UNKNOWN"; // Assign rejection reason
		// 				break;
		// 			default:
		// 				newStatus = "pending";
		// 		}

		// 		// Only update if the status has changed
		// 		if (
		// 			mongoTemplate.status !== newStatus ||
		// 			mongoTemplate.rejected_reason !== rejectedReason
		// 		) {
		// 			mongoTemplate.status = newStatus;
		// 			mongoTemplate.rejected_reason = rejectedReason; // Update rejected reason
		// 			await mongoTemplate.save(); // Save the updated template
		// 		}
		// 	}
		// }

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

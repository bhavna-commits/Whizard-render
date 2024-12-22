import path from "path";
import fs from "fs";
import Template from "../../models/templates.model.js";
import dotenv from "dotenv";
import { saveTemplateToDatabase } from "./template.functions.controller.js";
import { submitTemplateToFacebook } from "./template.functions.controller.js";

dotenv.config();

export const createTemplate = async (req, res) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const id = req.session.user.id;

		const savedTemplate = await saveTemplateToDatabase(
			req,
			templateData,
			id,
		);
		console.log("yah a gya");

		const facebookResponse = await submitTemplateToFacebook(savedTemplate);

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Create",
			details: `Created new template named: ${savedTemplate.name}`,
		});

		res.status(201).json({
			success: true,
			templateData: savedTemplate,
			facebookResponse,
			WABA_ID,
		});
	} catch (error) {
		res.status(500).json({ success: false, message: error.message });
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

		// Count total templates for the owner
		const totalTemplates = await Template.countDocuments({ owner: id });
		const templates = await Template.find({ owner: id })
			.skip(skip)
			.limit(limit);

		const totalPages = Math.ceil(totalTemplates / limit);

		res.render("Templates/manage_template", {
			list: templates, // Templates with components array
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
		const templateData = await Template.findById(req.params.id);
		if (!templateData) {
			return res.status(404).json({ error: "Template not found" });
		}

		// Handle file attachments if the header contains media
		const __dirname = path.resolve();
		const header = templateData.components.find(
			(component) => component.type === "HEADER",
		);

		if (header && header.type === "media" && header.content) {
			const filePath = path.join(
				__dirname,
				"..",
				"uploads",
				req.session.user.id,
				header.content,
			);
			console.log("fileURL:", filePath);

			// Check if the file exists before adding to the response
			if (fs.existsSync(filePath)) {
				header.fileUrl = filePath;
			} else {
				header.fileUrl = null; // File not found
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
		const templates = await Template.find({ owner: id });
		res.json(templates);
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

import path from "path";
import fs from "fs";
import Template from "../../models/templates.model.js";

export const createTemplate = async (req, res) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		const id = req.session.user.id;

		// Prepare the header content
		let header = templateData.header;
		if (req.file) {
			// If the file is uploaded, save the file name in the header content
			console.log(req.file.filename, ": fileName");
			header.content = req.file.filename;
		}

		// Create a new Template document and save it to the database
		const newTemplate = new Template({
			owner: id,
			templateName: templateData.templateName,
			category: templateData.category,
			body: templateData.body,
			footer: templateData.footer,
			buttons: templateData.buttons,
			header: header,
			dynamicVariables: templateData.dynamicVariables,
			status: "pending",
		});

		const savedTemplate = await newTemplate.save();

		const __dirname = path.resolve();
		if (header.type === "media" && header.content) {
			const filePath = path.join(
				__dirname,
				"..",
				"uploads",
				req.session.user.name,
				header.content,
			);

			// Check if the file exists before adding to the response
			if (fs.existsSync(filePath)) {
				templateData.header.fileUrl = filePath;
			} else {
				templateData.header.fileUrl = null; // File not found
			}
		}

		res.status(201).json({
			success: true,
			templateData: savedTemplate,
		});
	} catch (error) {
		res.status(400).json({
			success: false,
			error: error.message,
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

		const totalTemplates = await Template.countDocuments({ owner: id });
		const templates = await Template.find({ owner: id })
			.skip(skip)
			.limit(limit);

		const totalPages = Math.ceil(totalTemplates / limit);

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
		});

		// Save the duplicated template
		await newTemplate.save();

		res.status(201).json({ success: true, template: newTemplate });
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const deleteTemplate = async (req, res) => {
	try {
		const templateId = req.params.id;

		// Find and delete the template by its ID
		const deletedTemplate = await Template.findByIdAndDelete(templateId);
		if (!deletedTemplate) {
			return res
				.status(404)
				.json({ success: false, error: "Template not found" });
		}

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
		if (!templateData)
			return res.status(404).json({ error: "Template not found" });

		// If the header contains a media file, attach the file path
		const __dirname = path.resolve();
		if (
			templateData.header.type === "media" &&
			templateData.header.content
		) {
			const filePath = path.join(
				__dirname,
				"..",
				"uploads",
				req.session.user.id,
				templateData.header.content,
			);
			console.log("fileURL :", filePath);
			// Check if the file exists before adding to the response
			if (fs.existsSync(filePath)) {
				templateData.header.fileUrl = filePath;
				console.log("fileURL :", filePath);
			} else {
				templateData.header.fileUrl = null; // File not found
			}
		}

		// Send the full template data (including file if present)
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

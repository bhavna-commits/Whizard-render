import Template from "../../models/templates.model.js";

export const createTemplate = async (req, res) => {
	try {
		const templateData = JSON.parse(req.body.templateData);
		console.log(templateData);
		const id = req.session.user.id;
		// Create a new Template document and save it to the database
		const newTemplate = new Template({
			owner: id,
			templateName: templateData.templateName,
			category: templateData.category,
			body: templateData.body,
			footer: templateData.footer,
			buttons: templateData.buttons,
			header: templateData.header,
			dynamicVariables: templateData.dynamicVariables,
			status: "pending",
		});

		const savedTemplate = await newTemplate.save();

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
	const id = req.session.user.id;
	if (!id) res.render("login");
	try {
		const template = await Template.find({ owner: id });
		// console.log(template);
		res.render("Templates/manage_template", { list: template });
	} catch (error) {
		res.render("Templates/manage_template", { list: [] });
	}
};

// Controller function to duplicate a template
export const duplicateTemplate = async (req, res) => {
    try {
        const templateId = req.params.id;

        // Find the template by its ID
        const originalTemplate = await Template.findById(templateId);
        if (!originalTemplate) {
            return res.status(404).json({ success: false, error: 'Template not found' });
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

// Controller function to delete a template
export const deleteTemplate = async (req, res) => {
    try {
        const templateId = req.params.id;

        // Find and delete the template by its ID
        const deletedTemplate = await Template.findByIdAndDelete(templateId);
        if (!deletedTemplate) {
            return res.status(404).json({ success: false, error: 'Template not found' });
        }

        res.status(200).json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

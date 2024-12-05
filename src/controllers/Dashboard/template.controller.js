export const createTemplate = async (req, res) => {
	try {
		const templateData = JSON.parse(req.body.templateData);

		// Add file path if a file was uploaded
		if (req.file) {
			templateData.header.content = req.file.path;
		}
		console.log(req.file);
		console.log(templateData);
		// Store template data in session
		req.session.user = req.session.user || {};
		req.session.user.template = templateData;

		res.status(201).json({
			success: true,
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
		const { template } = req.session.user;
		if (template) {
			res.status(200).json({ success: true, template: template });
		}
	} catch (error) {
		res.status(400).json({
			success: false,
			error: error.message,
		});
	}
};

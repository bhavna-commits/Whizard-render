import upload from "./multerUpload.js";

const multerMiddle = (req, res, next) => {
	upload.single("headerFile")(req, res, (err) => {
		if (err) {
			// Handle Multer errors (e.g., file too large or invalid type)
			return res.status(400).json({ error: err.message });
		}
		next(); // Proceed to the next middleware if no error
	});
};

export default multerMiddle;

import upload from "./multerUpload.js";

const multerMiddle = (req, res, next) => {
	upload.single("headerFile")(req, res, (err) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}
		next(); 
	});
};

export default multerMiddle;

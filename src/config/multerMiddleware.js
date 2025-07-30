import {
	upload,
	uploadProfilePicture,
	uploadPhoneMumberPic,
} from "./multerUpload.js";

export const multerMiddle = (req, res, next) => {
	upload.single("headerFile")(req, res, (err) => {
		if (err) {
			return res.status(400).json({ error: err.message });
		}
		next();
	});
};

export const uploadProfilePicController = (req, res, next) => {
	uploadProfilePicture.single("profilePhoto")(req, res, (err) => {
		if (err) {
			return res
				.status(400)
				.json({ success: false, message: err.message });
		}
		next();
	});
};

export const uploadPhoneMumberPicController = (req, res, next) => {
	uploadPhoneMumberPic.single("profilePhoto")(req, res, (err) => {
		if (err) {
			return res
				.status(400)
				.json({ success: false, message: err.message });
		}
		next();
	});
};
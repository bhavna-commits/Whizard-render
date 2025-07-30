import multer from "multer";
import path from "path";
import fs from "fs";

// Set up storage for general files
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const userFolder = path.join("uploads", req.session?.user?.id || req.session?.addedUser?.owner);

		// Check if the folder exists, if not, create it
		if (!fs.existsSync(userFolder)) {
			fs.mkdirSync(userFolder, { recursive: true });
		}

		cb(null, userFolder);
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname);
	},
});

// Set up storage for profile pictures (DP)
const profileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const profileFolder = path.join(
			"uploads",
			req.session?.user?.id || req.session?.addedUser?.owner,
			"profile",
		);

		// Check if the folder exists, if not, create it
		if (!fs.existsSync(profileFolder)) {
			fs.mkdirSync(profileFolder, { recursive: true });
		}

		cb(null, profileFolder);
	},
	filename: (req, file, cb) => {
		// Save the file with a static name (e.g., 'profile-picture') to ensure a single profile picture per user
		cb(null, "profile-picture" + path.extname(file.originalname));
	},
});

const phoneNumberStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		const pathfile = path.join(
			"uploads",
			req.session?.user?.id || req.session?.addedUser?.owner,
			"phoneNumbers",
		);
		
		if (!fs.existsSync(pathfile)) {
			fs.mkdirSync(pathfile, { recursive: true });
		}

		cb(null, pathfile);
	}
})

// File filter for general files (images, videos, docs)
const fileFilter = (req, file, cb) => {
	const allowedTypes = [
		// Images
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/bmp",
		"image/webp",
		"image/svg+xml",
		// Videos
		"video/mp4",
		"video/x-msvideo",
		"video/x-matroska",
		"video/quicktime",
		"video/webm",
		"video/ogg",
		// Documents
		"application/pdf",
		"text/csv",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/msword",
	];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type"), false);
	}
};

// File filter for profile pictures (images only)
const profileFileFilter = (req, file, cb) => {
	const allowedTypes = [
		"image/jpeg",
		"image/png",
		"image/gif",
		"image/bmp",
		"image/webp",
		"image/svg+xml",
	];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type for profile picture"), false);
	}
};

// General upload configuration (for documents, videos, etc.)
const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Profile picture upload configuration (images only, smaller size)
const uploadProfilePicture = multer({
	storage: profileStorage,
	fileFilter: profileFileFilter,
	limits: { fileSize: 100 * 1024 }, // 2MB limit for profile pictures
});

const uploadPhoneMumberPic = multer({
	storage: phoneNumberStorage,
	fileFilter: profileFileFilter,
	limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export { upload, uploadProfilePicture, uploadPhoneMumberPic };

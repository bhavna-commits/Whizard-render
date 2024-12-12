import multer from "multer";
import path from "path";
import fs from "fs";

// Set up storage and file filter
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		const userFolder = path.join("uploads", req.session.user.id);

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

const fileFilter = (req, file, cb) => {
	// Validate file types (example: accept images and videos)
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
		"video/x-msvideo", // avi
		"video/x-matroska", // mkv
		"video/quicktime", // mov
		"video/webm",
		"video/ogg",
		// Documents
		"application/pdf", // PDF
		"text/csv", // CSV
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
		"application/vnd.ms-excel", // XLS
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
		"application/msword", // DOC
	];
	if (allowedTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error("Invalid file type"), false);
	}
};

// Multer upload configuration
const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 10 * 1024 * 1024 }, // Limit to 10MB
});

export default upload;

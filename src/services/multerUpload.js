import multer from "multer";

const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "uploads/"); // Save in the uploads folder
	},
	filename: (req, file, cb) => {
		cb(null, file.originalname); // Retain original file name
	},
});

const upload = multer({ storage });

export default upload;

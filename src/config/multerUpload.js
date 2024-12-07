import multer from "multer";
import path from "path";
import fs from "fs";

// Configure storage to create user-specific folders
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		// Create the folder path based on the user's name or unique ID
		const userFolder = path.join("uploads", req.session.user.name); // Assuming req.body.name holds the username or unique identifier

		// Check if the folder already exists, if not, create it
		if (!fs.existsSync(userFolder)) {
			fs.mkdirSync(userFolder, { recursive: true }); // Create folder if it doesn't exist
		}

		// Set the destination to the user's folder
		cb(null, userFolder);
	},
	filename: (req, file, cb) => {
		// Save the file with its original name, or you can add a timestamp for uniqueness
		cb(null, file.originalname);
	},
});

// Multer upload middleware
const upload = multer({ storage });

export default upload;

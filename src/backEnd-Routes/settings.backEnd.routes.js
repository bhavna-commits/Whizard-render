import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { uploadProfilePicController } from "../config/multerMiddleware.js";
import {
	updateProfile,
	updatePassword,
	updateAccountDetails,
	getActivityLogs,
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.post(
	"/profile",

	uploadProfilePicController,
	updateProfile,
);
router.post("/update-password", updatePassword);
router.post("/account-details", updateAccountDetails);

export default router;

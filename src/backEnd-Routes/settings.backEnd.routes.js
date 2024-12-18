import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { uploadProfilePicController } from "../config/multerMiddleware.js";
import {
	updateProfile,
	updatePassword,
	updateAccountDetails,
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.post(
	"/profile",
	checkSession,
	uploadProfilePicController,
	updateProfile,
);
router.post("/update-password", checkSession, updatePassword);
router.post("/account-details", checkSession, updateAccountDetails);

export default router;

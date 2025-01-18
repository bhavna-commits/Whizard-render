import express from "express";
import { uploadProfilePicController } from "../config/multerMiddleware.js";
import {
	updateProfile,
	updatePassword,
	updateAccountDetails,
	sendUserInvitation,
	createPermissions,
	updateUserManagement,
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.post("/profile", uploadProfilePicController, updateProfile);
router.post("/update-password", updatePassword);
router.post("/account-details", updateAccountDetails);
router.post("/user-management/invite", sendUserInvitation);
router.post("/user-management/permissions/update", createPermissions);
router.post("/updateUserManagement", updateUserManagement);

export default router;
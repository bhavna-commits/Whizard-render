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
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post("/profile", uploadProfilePicController, updateProfile, trackSanitationFailures);
router.post("/update-password", updatePassword, trackSanitationFailures);
router.post("/account-details", updateAccountDetails, trackSanitationFailures);
router.post(
	"/user-management/invite",
	sendUserInvitation,
	trackSanitationFailures,
);
router.post(
	"/user-management/permissions/update",
	createPermissions,
	trackSanitationFailures,
);
router.post(
	"/updateUserManagement",
	updateUserManagement,
	trackSanitationFailures,
);

export default router;
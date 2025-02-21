import express from "express";
import { uploadProfilePicController } from "../config/multerMiddleware.js";
import {
	updateProfile,
	updatePassword,
	updateAccountDetails,
	sendUserInvitation,
	createPermissions,
	updateUserManagement,
	editPermissions,
	deleteRole,
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
	"/user-management/permissions/create",
	createPermissions,
	trackSanitationFailures,
);

router.post(
	"/user-management/permissions/edit",
	editPermissions,
	trackSanitationFailures,
);

router.post(
	"/updateUserManagement",
	updateUserManagement,
	trackSanitationFailures,
);

router.delete("/deleteRole", deleteRole);

export default router;
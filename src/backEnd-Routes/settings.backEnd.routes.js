import express from "express";
import {
	uploadProfilePicController,
	uploadPhoneMumberPicController,
} from "../config/multerMiddleware.js";
import {
	updateProfile,
	updatePassword,
	updateAccountDetails,
	sendUserInvitation,
	createPermissions,
	updateUserManagement,
	editPermissions,
	deleteRole,
	updatewhatsAppAccountDetails,
} from "../controllers/Settings/settings.controller.js";
import { getIntent } from "../controllers/Settings/payment.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post(
	"/profile",
	uploadProfilePicController,
	updateProfile,
	trackSanitationFailures,
);
router.post("/update-password", updatePassword, trackSanitationFailures);
router.post("/account-details", updateAccountDetails, trackSanitationFailures);
router.post(
	"/whatsapp-account-details",
	uploadPhoneMumberPicController,
	updatewhatsAppAccountDetails,
	trackSanitationFailures,
);
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

router.post("/create-payment-intent", getIntent, trackSanitationFailures);

router.delete("/deleteRole", deleteRole);

export default router;

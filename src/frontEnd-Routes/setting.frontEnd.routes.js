import express from "express";
import {
	home,
	profile,
	accountDetails,
	getActivityLogs,
	activityLogsFiltered,
	getUserManagement,
	getCreatePassword,
	getPermissions,
} from "../controllers/Settings/settings.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/", home, trackSanitationFailures);
router.get("/profile", profile, trackSanitationFailures);
router.get("/account-details", accountDetails, trackSanitationFailures);
router.get("/activity-logs", getActivityLogs, trackSanitationFailures);
router.get(
	"/activity-logs/filtered",
	activityLogsFiltered,
	trackSanitationFailures,
);
router.get("/user-management", getUserManagement, trackSanitationFailures);
router.get(
	"/user-management/permissions",
	getPermissions,
	trackSanitationFailures,
);

export default router;

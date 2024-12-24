import express from "express";
import {
	home,
	profile,
	accountDetails,
	getActivityLogs,
	activityLogsFiltered,
	getUserManagement
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.get("/", home);
router.get("/profile", profile);
router.get("/account-details", accountDetails);
router.get("/activity-logs", getActivityLogs);
router.get("/activity-logs/filtered", activityLogsFiltered);
router.get("/user-management", getUserManagement);

export default router;

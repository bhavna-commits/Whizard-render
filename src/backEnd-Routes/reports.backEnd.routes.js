import express from "express";
import multer from "multer";
import {
	getCampaignReports,
	createCampaignData,
	createCampaign,
} from "../controllers/Report/report.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
import { multerMiddle } from "../config/multerMiddleware.js";

const router = express.Router();

// Route to get campaign reports
router.get("/campaign-list", getCampaignReports, trackSanitationFailures);

router.post("/create-broadcast", createCampaignData, trackSanitationFailures);

router.post(
	"/broadcast",
	multerMiddle,
	createCampaign,
	trackSanitationFailures,
);

export default router;

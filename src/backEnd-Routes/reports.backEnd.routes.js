import express from "express";
import multer from "multer";
import {
	getCampaignReports,
	createCampaignData,
	createCampaign,
} from "../controllers/Report/report.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const upload = multer();
const router = express.Router();

// Route to get campaign reports
router.get("/campaign-list", getCampaignReports, trackSanitationFailures);

router.post("/create-broadcast", createCampaignData, trackSanitationFailures);

router.post(
	"/broadcast",
	upload.none(),
	createCampaign,
	trackSanitationFailures,
);

export default router;

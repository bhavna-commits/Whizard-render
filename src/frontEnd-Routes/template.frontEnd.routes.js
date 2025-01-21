import express from "express";
import {
	getList,
	getFaceBookTemplates,
	getCampaignTemplates,
	getCreateTemplate,
} from "../controllers/Dashboard/template.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/template", getList, trackSanitationFailures);

router.get("/create-template", getCreateTemplate, trackSanitationFailures);

router.get(
	"/getFaceBookTemplates",
	getFaceBookTemplates,
	trackSanitationFailures,
);

router.get(
	"/getCampaignTemplates",
	getCampaignTemplates,
	trackSanitationFailures,
);

export default router;

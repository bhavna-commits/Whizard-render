import express from "express";
import {
	getList,
	getFaceBookTemplates,
	getCampaignTemplates,
	getCreateTemplate,
	duplicateTemplate,
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

router.get(
	"/templates/duplicate/:id",
	duplicateTemplate,
	trackSanitationFailures,
);

router.get("/templates/edit/:id", duplicateTemplate, trackSanitationFailures);

export default router;

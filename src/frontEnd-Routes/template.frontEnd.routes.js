import express from "express";
import {
	getList,
	getFaceBookTemplates,
	getCampaignTemplates,
	getCreateTemplate,
	getDuplicateTemplate,
	getEditTemplate,
} from "../controllers/Templates/template.controller.js";
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
	getDuplicateTemplate,
	trackSanitationFailures,
);

router.get("/templates/edit/:id", getEditTemplate, trackSanitationFailures);



export default router;

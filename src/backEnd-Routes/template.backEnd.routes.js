import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	createTemplate,
	deleteTemplate,
	getCampaignSingleTemplates,
	editTemplate,
	// syncFacebookTemplates,
} from "../controllers/Templates/template.controller.js";
import { multerMiddle } from "../config/multerMiddleware.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post(
	"/createTemplate",
	multerMiddle,
	createTemplate,
	trackSanitationFailures,
);

router.delete("/delete/:id", deleteTemplate, trackSanitationFailures);

/* ⭐⭐⭐ ADD SYNC ROUTE BEFORE /:id ⭐⭐⭐ */
// router.get("/sync", syncFacebookTemplates, trackSanitationFailures);

/* ⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐⭐ */

/* ❗ This MUST be last — catch-all route */
router.get("/:id", getCampaignSingleTemplates, trackSanitationFailures);

router.post(
	"/editTemplate/:id",
	multerMiddle,
	editTemplate,
	trackSanitationFailures,
);

export default router;

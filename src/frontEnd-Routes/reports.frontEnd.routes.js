import express from "express";
import {
	getCampaignList,
	getCampaignReports,
	getCampaignListFilter,
	getSendBroadcast,
	getCostReport,
	renderGetCostReport,
} from "../controllers/Report/report.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/campaign-list", getCampaignList, trackSanitationFailures);

router.get(
	"/campaign-list/filter",
	getCampaignListFilter,
	trackSanitationFailures,
);

router.get(
	"/campaign-list/broadcast",
	getSendBroadcast,
	trackSanitationFailures,
);

router.get("/campaign-list/:id", getCampaignReports, trackSanitationFailures);

router.get("/cost-report", renderGetCostReport, trackSanitationFailures);

router.get("/get-cost-report", getCostReport, trackSanitationFailures);

export default router;

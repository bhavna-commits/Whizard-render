import express from "express";
import {
	getCampaignList,
	getCampaignReports,
	getCampaignReportsFilter,
} from "../controllers/Report/report.controller.js";

const router = express.Router();

router.get("/campaign-list", getCampaignList);

router.get("/campaign-list/filter", getCampaignReportsFilter);

router.get("/campaign-list/:id", getCampaignReports);

export default router;

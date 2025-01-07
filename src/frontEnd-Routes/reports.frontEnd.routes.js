import express from "express";
import {
	getCampaignReports,
	getCampaignReportsFilter,
} from "../controllers/Report/report.controller.js";

const router = express.Router();

router.get("/campaign-list", getCampaignReports);

router.get("/campaign-list/filter", getCampaignReportsFilter);

export default router;

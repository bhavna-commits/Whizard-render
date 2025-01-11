import express from "express";
import {
	getCampaignList,
	getCampaignReports,
	getCampaignListFilter,
} from "../controllers/Report/report.controller.js";

const router = express.Router();

router.get("/campaign-list", getCampaignList);

router.get("/campaign-list/filter", getCampaignListFilter);

router.get("/campaign-list/:id", getCampaignReports);

export default router;

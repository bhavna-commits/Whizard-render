import express from "express";
import { getCampaignReports } from "../controllers/Report/report.controller.js";

const router = express.Router();

// Route to get campaign reports
router.get("/campaign-list", getCampaignReports);

export default router;

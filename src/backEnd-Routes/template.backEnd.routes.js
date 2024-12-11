import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	createTemplate,
	deleteTemplate,
	duplicateTemplate,
	getCampaignTemplates,
} from "../controllers/Dashboard/template.controller.js";
import multerMiddle from "../config/multerMiddleware.js";

const router = express.Router();

router.post("/createTemplate", checkSession, multerMiddle, createTemplate);

router.post("/duplicate/:id", checkSession, duplicateTemplate);

router.delete("/delete/:id", checkSession, deleteTemplate);

router.get("/:id", checkSession, getCampaignTemplates);

export default router;

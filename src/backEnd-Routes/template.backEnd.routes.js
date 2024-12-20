import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	createTemplate,
	deleteTemplate,
	duplicateTemplate,
	getCampaignTemplates,
} from "../controllers/Dashboard/template.controller.js";
import { multerMiddle } from "../config/multerMiddleware.js";

const router = express.Router();

router.post("/createTemplate", multerMiddle, createTemplate);

router.post("/duplicate/:id", duplicateTemplate);

router.delete("/delete/:id", deleteTemplate);

router.get("/:id", getCampaignTemplates);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	getList,
	getFaceBookTemplates,
	getCampaignTemplates,
	getCreateTemplate,
} from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", getList);

router.get("/create-template", getCreateTemplate);

router.get("/getFaceBookTemplates", getFaceBookTemplates);

router.get("/getCampaignTemplates", getCampaignTemplates);

export default router;

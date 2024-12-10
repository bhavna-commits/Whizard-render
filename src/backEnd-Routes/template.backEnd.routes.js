import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	createTemplate,
	deleteTemplate,
	duplicateTemplate,
} from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.post("/createTemplate", checkSession, createTemplate);

router.post("/duplicate/:id", checkSession, duplicateTemplate);

router.delete("/delete/:id", deleteTemplate);

export default router;

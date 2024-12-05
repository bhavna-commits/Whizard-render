import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { createTemplate } from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.post("/createTemplate", checkSession, createTemplate);

export default router;
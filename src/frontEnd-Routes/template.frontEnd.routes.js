import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { templatePreview } from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", checkSession, (req, res) => {
	res.render("Templates/manage_template");
});

router.get("/create-template", checkSession, (req, res) => {
	res.render("Templates/create-template");
});

router.get("/template-preview", checkSession, templatePreview);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	templatePreview,
	getList,
	getTemplates,
} from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", checkSession, getList);

router.get("/create-template", checkSession, (req, res) => {
	res.render("Templates/create-template", {
		templateData: [],
	});
});

router.get("/getTemplates", checkSession, getTemplates);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	templatePreview,
	getList,
	getTemplates,
} from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", getList);

router.get("/create-template", (req, res) => {
	res.render("Templates/create-template", {
		templateData: [],
	});
});

router.get("/getTemplates", getTemplates);

export default router;

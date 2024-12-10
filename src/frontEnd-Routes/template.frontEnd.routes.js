import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { templatePreview, getList } from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", checkSession, getList);

router.get("/create-template", checkSession, (req, res) => {
	res.render("Templates/create-template", {
		templateData: [],
	});
});

export default router;

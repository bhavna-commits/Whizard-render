import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	templatePreview,
	getList,
	getFaceBookTemplates,
	getCampaignTemplates,
} from "../controllers/Dashboard/template.controller.js";

const router = express.Router();

router.get("/template", getList);

router.get("/create-template", (req, res) => {
	res.render("Templates/create-template", {
		templateData: [],
		name: req.session.user.name,
		photo: req.session.user.photo,
		color: req.session.user.color,
	});
});

router.get("/getFaceBookTemplates", getFaceBookTemplates);

router.get("/getCampaignTemplates", getCampaignTemplates);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { createTemplate } from "../controllers/Dashboard/template.controller.js";
import upload from "../services/multerUpload.js";

const router = express.Router();

router.post(
	"/createTemplate",
	checkSession,
	upload.single("headerFile"),
	createTemplate,
);

router.get("/templatePreview", checkSession, )

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	createTemplate,
	templatePreview,
} from "../controllers/Dashboard/template.controller.js";
import upload from "../services/multerUpload.js";

const router = express.Router();

router.post(
	"/createTemplate",
	checkSession,
	upload.single("headerFile"),
	createTemplate,
);



export default router;

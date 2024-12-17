import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	home, profile
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.get("/", checkSession, home);
router.get("/profile", checkSession, profile);

export default router;

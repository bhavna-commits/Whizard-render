import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	home, profile, accountDetails
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.get("/", checkSession, home);
router.get("/profile", checkSession, profile);
router.get("/account-details", checkSession, accountDetails);

export default router;

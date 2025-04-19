import express from "express";
import {
	getSetToken,
	getMedia,
} from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/", getSetToken, trackSanitationFailures);

router.get("/get-media", getMedia, trackSanitationFailures);

export default router;

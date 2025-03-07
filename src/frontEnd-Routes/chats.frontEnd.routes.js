import express from "express";
import { getSetToken } from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/", getSetToken, trackSanitationFailures);

export default router;

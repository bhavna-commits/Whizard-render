import express from "express";
import { getChats } from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/", getChats, trackSanitationFailures);

export default router;

import express from "express";
import { getReturnedToken } from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post("/verify-chats", getReturnedToken, trackSanitationFailures);

export default router;

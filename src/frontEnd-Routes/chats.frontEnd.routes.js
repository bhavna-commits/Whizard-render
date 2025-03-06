import express from "express";
import { getUsers } from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.get("/", getUsers, trackSanitationFailures);

export default router;

import express from "express";
import {
	getReturnedToken,
	getRefreshToken,
	getSingleChat,
	getMoreChats,
	getMoreUsers,
} from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post("/verify-chats", getReturnedToken, trackSanitationFailures);

router.post("/refresh-token", getRefreshToken, trackSanitationFailures);

router.post("/single-chat", getSingleChat, trackSanitationFailures);

router.post("/get-more-chats", getMoreChats, trackSanitationFailures);

router.post("/get-more-users", getMoreUsers, trackSanitationFailures);

export default router;

import express from "express";
import {
	getUsers,
	getRefreshToken,
	getSingleChat,
	getMoreChats,
	getMoreUsers,
	searchUsers,
} from "../controllers/Chats/chats.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();

router.post("/verify-chats", getUsers, trackSanitationFailures);

router.post("/refresh-token", getRefreshToken, trackSanitationFailures);

router.post("/single-chat", getSingleChat, trackSanitationFailures);

router.post("/get-more-chats", getMoreChats, trackSanitationFailures);

router.post("/get-more-users", getMoreUsers, trackSanitationFailures);

router.post("/search-users", searchUsers, trackSanitationFailures);

export default router;

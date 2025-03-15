import express from "express";
import multer from "multer";
import {
	getUsers,
	getRefreshToken,
	getSingleChat,
	getMoreChats,
	getMoreUsers,
	searchUsers,
	sendMessages,
	getSendTemplate,
	getAllTemplates,
	getSingleTemplate,
} from "../controllers/Chats/chats.controller.js";
import { getCampaignTemplates } from "../controllers/Templates/template.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

router.get("/sendTemplate", getSendTemplate, trackSanitationFailures);

router.post("/verify-chats", getUsers, trackSanitationFailures);

router.post("/refresh-token", getRefreshToken, trackSanitationFailures);

router.post("/single-chat", getSingleChat, trackSanitationFailures);

router.post("/get-more-chats", getMoreChats, trackSanitationFailures);

router.post("/get-more-users", getMoreUsers, trackSanitationFailures);

router.post("/search-users", searchUsers, trackSanitationFailures);

router.get(
	"/get-template/:id",
	getSingleTemplate,
	trackSanitationFailures,
);

router.get(
	"/getCampaignTemplates/:id",
	getAllTemplates,
	trackSanitationFailures,
);

router.post(
	"/send-message",
	upload.single("file"),
	sendMessages,
	trackSanitationFailures,
);



export default router;

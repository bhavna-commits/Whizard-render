import express from "express";

import {
	getCreatePassword,
	createAddedUserPassword,
} from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.get("/settings/user-management/create-password", getCreatePassword);
router.post(
	"/api/settings/user-management/create-user-password",
	createAddedUserPassword,
);

export default router;

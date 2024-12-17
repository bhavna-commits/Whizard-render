import express from "express";
import { uploadProfilePicController } from "../config/multerMiddleware.js";
import { updateProfile } from "../controllers/Settings/settings.controller.js";

const router = express.Router();

router.post("/settings/profile", uploadProfilePicController, updateProfile);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { getList } from "../controllers/ContactList/contactList.controller.js";

const router = express.Router();

router.get("/contact-list", checkSession, getList);

export default router;

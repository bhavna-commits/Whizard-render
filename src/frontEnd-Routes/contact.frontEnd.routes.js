import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { getList } from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	updateContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.get("/contact-list", checkSession, getList);

router.get("/contact-list/overview/:id", checkSession, getContacts);

export default router;

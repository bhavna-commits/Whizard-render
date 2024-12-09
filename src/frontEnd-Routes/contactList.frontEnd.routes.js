import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	getList,
	addCustomField,
} from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	updateContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.get("/contact-list", checkSession, getList);
router.get("/contact-list/overview/:id", checkSession, getContacts);
router.get("/contact-list/custom-field", checkSession, addCustomField);

export default router;

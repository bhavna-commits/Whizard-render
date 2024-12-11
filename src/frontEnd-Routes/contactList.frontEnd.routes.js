import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	getList,
	addCustomField,
	getContactList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	updateContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.get("/contact-list", checkSession, getList);
router.get("/contact-list/overview/:id", checkSession, getContacts);
router.get("/contact-list/custom-field", checkSession, addCustomField);
router.get("/contact-list/getContactList", checkSession, getContactList);
router.get("/contact-list/createCampaign", checkSession, (req, res) => {
	res.render("Contact-List/createCampaign");
});

export default router;

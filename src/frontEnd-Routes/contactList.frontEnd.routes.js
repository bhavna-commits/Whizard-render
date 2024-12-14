import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import {
	getList,
	getCustomField,
	getContactList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	updateContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.get("/", checkSession, getList);
router.get("/overview/:id", checkSession, getContacts);
router.get("/custom-field", checkSession, getCustomField);
router.get("/getContactList", checkSession, getContactList);
router.get("/createCampaign", checkSession, (req, res) => {
	res.render("Contact-List/createCampaign");
});

export default router;

import express from "express";

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

router.get("/", getList);
router.get("/overview/:id", getContacts);
router.get("/custom-field", getCustomField);
router.get("/getContactList", getContactList);
router.get("/createCampaign", (req, res) => {
	res.render("Contact-List/createCampaign");
});

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";

import {
	createList,
	editList,
	deleteList,
	sampleCSV,
	updateContactListName,
	getCampaignContacts,
	createCustomField,
	deleteCustomField,
	searchContactLists,
} from "../controllers/ContactList/contactList.controller.js";
import {
	updateContact,
	deleteContact,
	editContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.post("/createList", createList);

router.put("/editList/:id", editList);

router.delete("/deleteList/:id", deleteList);

router.put("/overview/:id", updateContact);

router.delete("/overview/:id", deleteContact);

router.get("/sampleCSV", sampleCSV);

router.put("/contacts/:id", editContact);

router.delete("/contacts/:id", deleteContact);

router.put("/:id/updateName", updateContactListName);

router.get("/:id/contacts", getCampaignContacts);

router.post("/custom-fields", createCustomField);

router.delete("/custom-fields/:id", deleteCustomField);

router.get("/search", searchContactLists);

export default router;

import express from "express";
import multer from "multer";
import {
	createList,
	deleteList,
	sampleCSV,
	updateContactListName,
	getCampaignContacts,
	createCustomField,
	deleteCustomField,
	searchContactLists,
	previewContactList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	updateContact,
	deleteContact,
	editContact,
	createContact,
	createCampaign,
	getFilteredContacts,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();
const upload = multer();

router.post("/create-list", createList);

router.post("/previewContactList", previewContactList);

// router.put("/editList/:id", editList);

router.delete("/deleteList/:id", deleteList);

router.put("/overview/:id", updateContact);

router.delete("/overview/:id", deleteContact);

router.post("/overview/:id", getFilteredContacts);

router.get("/sampleCSV", sampleCSV);

router.put("/contacts/:id", upload.none(), editContact);

router.delete("/contacts/:id", deleteContact);

router.post("/contacts/create-contact", upload.none(), createContact);

router.put("/:id/updateName", updateContactListName);

router.get("/:id/contacts", getCampaignContacts);

router.post("/custom-fields", createCustomField);

router.delete("/custom-fields/:id", deleteCustomField);

router.get("/search", searchContactLists);

// router.post("/create-contact", createContact);

router.post("/create-campaign", upload.none(), createCampaign);

export default router;

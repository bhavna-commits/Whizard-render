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
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";

const router = express.Router();
const upload = multer();

router.post("/create-list", createList, trackSanitationFailures);

router.post("/previewContactList", previewContactList, trackSanitationFailures);

// router.put("/editList/:id", editList);

router.delete("/deleteList/:id", deleteList, trackSanitationFailures);

router.put("/overview/:id", updateContact, trackSanitationFailures);

router.delete("/overview/:id", deleteContact, trackSanitationFailures);

router.post("/overview/:id", getFilteredContacts, trackSanitationFailures);

router.get("/sampleCSV", sampleCSV);

router.put(
	"/contacts/:id",
	upload.none(),
	editContact,
	trackSanitationFailures,
);

router.delete("/contacts/:id", deleteContact, trackSanitationFailures);

router.post(
	"/contacts/create-contact",
	upload.none(),
	createContact,
	trackSanitationFailures,
);

router.put("/:id/updateName", updateContactListName, trackSanitationFailures);

router.get("/:id/contacts", getCampaignContacts, trackSanitationFailures);

router.post("/custom-fields", createCustomField, trackSanitationFailures);

router.delete("/custom-fields/:id", deleteCustomField, trackSanitationFailures);

router.get("/search", searchContactLists, trackSanitationFailures);

// router.post("/create-contact", createContact);

router.post(
	"/create-campaign",
	upload.none(),
	createCampaign,
	trackSanitationFailures,
);

export default router;

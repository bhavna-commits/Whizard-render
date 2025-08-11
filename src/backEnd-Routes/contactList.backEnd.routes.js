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
	duplicateList,
	downloadListCSV,
	previewOverviewCSV,
	addMoreInList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	updateContact,
	deleteContact,
	editContact,
	createContact,
	createCampaign,
	getFilteredContacts,
	validateAndPrepareCampaign,
} from "../controllers/ContactList/contacts.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
import { multerMiddle } from "../config/multerMiddleware.js";

const router = express.Router();
const upload = multer();

router.post("/create-list", createList, trackSanitationFailures);

router.post("/duplicate-list", duplicateList, trackSanitationFailures);

router.get("/download/:listId", downloadListCSV, trackSanitationFailures);

router.post("/previewContactList", previewContactList, trackSanitationFailures);

router.post(
	"/preview-overview-csv",
	previewOverviewCSV,
	trackSanitationFailures,
);

router.get("/add-more-in-list", addMoreInList, trackSanitationFailures);

router.post("/deleteList/:id", deleteList, trackSanitationFailures);

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

router.post(
	"/create-campaign",
	multerMiddle,
	validateAndPrepareCampaign,
	createCampaign,
	trackSanitationFailures,
);

export default router;

import express from "express";

import {
	getList,
	getCustomField,
	getContactList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	getOverviewFilter,
	getCreateCampaign,
} from "../controllers/ContactList/contacts.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
const router = express.Router();

router.get("/", getList, trackSanitationFailures);

router.get("/overview/:id", getContacts, trackSanitationFailures);

router.get("/custom-field", getCustomField, trackSanitationFailures);

router.get("/getContactList", getContactList, trackSanitationFailures);

router.get(
	"/get-overview-filter/:id",
	getOverviewFilter,
	trackSanitationFailures,
);

router.get("/createCampaign", getCreateCampaign, trackSanitationFailures);

export default router;
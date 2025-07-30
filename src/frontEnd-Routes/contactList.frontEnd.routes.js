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
	getMoreContacts,
} from "../controllers/ContactList/contacts.controller.js";
import { trackSanitationFailures } from "../middleWares/sanitiseInput.js";
const router = express.Router();

router.get("/", getList, trackSanitationFailures);

router.get(
	"/archive",
	(req, res, next) => {
		req.archive = true;
		next();
	},
	getList,
	trackSanitationFailures,
);

router.get("/overview/:id", getContacts, trackSanitationFailures);

router.get("/more-contacts/:id", getMoreContacts, trackSanitationFailures);

router.get("/custom-field", getCustomField, trackSanitationFailures);

router.get("/getContactList", getContactList, trackSanitationFailures);

router.get(
	"/get-overview-filter/:id",
	getOverviewFilter,
	trackSanitationFailures,
);

router.get("/createCampaign", getCreateCampaign, trackSanitationFailures);

export default router;

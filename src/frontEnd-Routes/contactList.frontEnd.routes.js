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

const router = express.Router();

router.get("/", getList);

router.get("/overview/:id", getContacts);

router.get("/custom-field", getCustomField);

router.get("/getContactList", getContactList);

router.get("/get-overview-filter/:id", getOverviewFilter);

router.get("/createCampaign", getCreateCampaign);

export default router;
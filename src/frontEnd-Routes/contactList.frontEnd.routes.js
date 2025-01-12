import express from "express";

import {
	getList,
	getCustomField,
	getContactList,
} from "../controllers/ContactList/contactList.controller.js";
import {
	getContacts,
	getOverviewFilter,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.get("/", getList);
router.get("/overview/:id", getContacts);
router.get("/custom-field", getCustomField);
router.get("/getContactList", getContactList);
router.get("/get-overview-filter/:id", getOverviewFilter);
router.get("/createCampaign", (req, res) => {
	res.render("Contact-List/createCampaign", {
		name: req.session.user.name,
		photo: req.session.user.photo,
		color: req.session.user.color,
	});
});

export default router;

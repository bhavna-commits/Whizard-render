import express from "express";
import { checkSession } from "../middleWares/checkSession.js";

import {
	createList,
	editList,
	deleteList,
	sampleCSV,
	updateContactListName,
} from "../controllers/ContactList/contactList.controller.js";
import {
	updateContact,
	deleteContact,
	editContact,
} from "../controllers/ContactList/contacts.controller.js";

const router = express.Router();

router.post("/createList", checkSession, createList);

router.put("/editList/:id", checkSession, editList);

router.delete("/deleteList/:id", checkSession, deleteList);

router.put("/overview/:id", checkSession, updateContact);

router.delete("/overview/:id", checkSession, deleteContact);

router.get("/template", checkSession, sampleCSV);

router.put("/contacts/:id", checkSession, editContact);

router.delete("/contacts/:id", checkSession, deleteContact);

router.put("/:id/updateName", checkSession, updateContactListName);



export default router;

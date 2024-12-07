import express from "express";
import { checkSession } from "../middleWares/checkSession.js";

import {
	createList,
	editList,
    deleteList,
    sampleCSV
} from "../controllers/ContactList/contactList.controller.js";

const router = express.Router();

router.post("/createList", checkSession, createList);

router.put("/editList/:id", checkSession, editList);

router.delete("/deleteList/:id", checkSession, deleteList);

router.get("/template", checkSession, sampleCSV);

export default router;

import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { countries } from "../utils/dropDown.js";


const router = express.Router();

router.get("/contact-list", checkSession, (req, res) => {
	res.render("Contact-List/contact-list", { countries: countries, contacts: [] });
});

export default router;

import express from "express";
import {
	checkSession,
	checkAdminSession,
} from "../middleWares/checkSession.js";
import { countries, roles, size, industryCategory } from "../utils/dropDown.js";
import {
	getDashboard,
	getFilters,
	migrate,
} from "../controllers/Dashboard/dashboard.controller.js";

import { adminPanel } from "../controllers/Dashboard/adminPanel.controller.js";

import {
	getCreatePassword,
	createAddedUserPassword,
} from "../controllers/Settings/settings.controller.js";
import {
	get2FA,
	oldAccountMigrate,
} from "../controllers/User/userController.js";

const router = express.Router();

router.get("/", checkSession, getDashboard);

router.get("/dashboard", checkSession, getFilters);

router.get("/register", (req, res) => {
	res.render("User/register", {
		countries: countries,
		defaultCountry: {
			name: "India",
			code: "IN",
			flag: "🇮🇳",
			dialCode: "+91",
		},
	});
});

router.get("/resetPassword", (req, res) => {
	res.render("User/resetPassword");
});

router.get("/login", (req, res) => {
	res.render("User/login", {
		OTPLogin:
			Boolean(process.env.EMAIL_OTP_LOGIN) ||
			Boolean(process.env.MOBILE_OTP_LOGIN),
	});
});

router.get("/verify-email", (req, res) => {
	res.render("User/verifyEmail");
});

router.get("/changePassword", (req, res) => {
	res.render("User/changePassword");
});

router.get("/verify-reset-password-email", (req, res) => {
	res.render("User/verifyResetPasswordEmail");
});

router.get("/about", (req, res) => {
	res.render("User/about", {
		countries: countries,
		roles: roles,
		size: size,
		industryCategory: industryCategory,
	});
});

router.get("/settings/user-management/create-password", getCreatePassword);

router.post(
	"/api/settings/user-management/create-user-password",
	createAddedUserPassword,
);

router.get("/2FA", get2FA);

router.get(`/UdY0U6Zlfp`, (req, res) => {
	res.render("User/oldAccountForm", {
		countries: countries,
		defaultCountry: {
			name: "India",
			code: "IN",
			flag: "🇮🇳",
			dialCode: "+91",
		},
		roles: roles,
		size: size,
		industryCategory: industryCategory,
	});
});

router.get(`/admin-panel`, checkSession, checkAdminSession, adminPanel);

router.get(
	"/run-migration",
	checkSession,
	checkAdminSession,
	migrate,
);

export default router;

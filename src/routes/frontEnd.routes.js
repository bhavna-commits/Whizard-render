import express from "express";
import { checkSession } from "../middleWares/checkSession.js";
import { countries, roles, size, industryCategory } from "../utils/dropDown.js";

const router = express.Router();

router.get("/", checkSession, (req, res) => {
  res.render("Dashboard/dashboard");
});

router.get("/register", (req, res) => {
  res.render("User/register", {
    countries: countries,
    defaultCountry: { name: "India", code: "IN", flag: "🇮🇳", dialCode: "+91" },
  });
});

router.get("/resetPassword", (req, res) => {
  res.render("User/resetPassword");
});

router.get("/login", (req, res) => {
  res.render("User/login");
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

router.get("/template", checkSession, (req, res) => {
  res.render("Dashboard/manage_template");
});

router.get("/create-template", checkSession, (req, res) => {
  res.render("Dashboard/templates/create-templates")
})

export default router;

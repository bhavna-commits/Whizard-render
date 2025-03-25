import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";

// Set up __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the absolute path to the "public" folder
const publicPath = path.join(__dirname, "public");

// Serve all files from the public folder
app.use(express.static(publicPath));
app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "..", "public")));

// If you need to map additional routes to "public", use a loop for cleaner code:
const additionalStaticRoutes = [
	"/templates/duplicate/:id",
	"/templates/edit/:id",
	"/api/chats",
	"/chats",
	"/contact-list",
	"/contact-list/overview",
	"/Contact-List/createCampaign",
	"/Contact-List/custom-field",
	"/Settings/profile",
	"/Settings/account-details",
	"/Settings/activity-logs",
	"/Settings/user-management",
	"/Reports/campaign-list",
	"/Reports/campaign-list/:id",
	"/Reports/cost-report",
];

additionalStaticRoutes.forEach((route) => {
	app.use(route, express.static(publicPath));
});

// Serve JavaScript assets from view directories using absolute paths
app.use(
	"/dashboard/js",
	express.static(path.join(__dirname, "views", "Dashboard", "js")),
);
app.use(
	"/user/js",
	express.static(path.join(__dirname, "views", "User", "js")),
);
app.use(
	"/chats/js",
	express.static(path.join(__dirname, "views", "Chats", "js")),
);
app.use(
	"/template/js",
	express.static(path.join(__dirname, "views", "Templates", "js")),
);
app.use(
	"/contact-list/js",
	express.static(path.join(__dirname, "views", "Contact-List", "js")),
);
app.use(
	"/settings/js",
	express.static(path.join(__dirname, "views", "Settings", "js")),
);
app.use(
	"/reports/js",
	express.static(path.join(__dirname, "views", "Reports", "js")),
);

// Serve commonJS files
app.use("/", express.static(path.join(__dirname, "views", "commonJS")));

// Serve files from the uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

export default app;

import express from "express";
import path from "path";
import app from "./app.js";

app.use(express.static("public"));
app.use("/contact-list/overview", express.static("public"));
app.use("/Contact-List/createCampaign", express.static("public"));
app.use("/Contact-List/custom-field", express.static("public"));
app.use("/Settings/profile", express.static("public"));
app.use("/Settings/account-details", express.static("public"));
app.use("/Settings/activity-logs", express.static("public"));
app.use("/Reports/campaign-list", express.static("public"));

const __dirname = path.resolve();

app.use(
	"/dashboard/js",
	express.static(path.join(__dirname, "views/Dashboard/js")),
);
app.use("/user/js", express.static(path.join(__dirname, "views/User/js")));
app.use(
	"/template/js",
	express.static(path.join(__dirname, "views/Templates/js")),
);
app.use(
	"/contact-list/js",
	express.static(path.join(__dirname, "views/Contact-List/js")),
);
app.use(
	"/settings/js",
	express.static(path.join(__dirname, "views/Settings/js")),
);

app.use(
	"/reports/js",
	express.static(path.join(__dirname, "views/Reports/js")),
);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

export default app;

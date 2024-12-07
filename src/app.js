import express from "express";
import dotenv from "dotenv";
import path from "path";
import sessionMiddleware from "./middleWares/sessionHandler.js";
import userRoutes from "./backEnd-Routes/user.backEnd.routes.js";
import userfrontEndRoutes from "./frontEnd-Routes/user.frontEnd.routes.js";
import tempalteFrontEndRoutes from "./frontEnd-Routes/template.frontEnd.routes.js";
import contactFrontEndRoutes from "./frontEnd-Routes/contact.frontEnd.routes.js";
import dashboardRoutes from "./backEnd-Routes/template.backEnd.routes.js";
import contactListRoute from "./backEnd-Routes/contactList.backEnd.routes.js";

dotenv.config();

const app = express();

// Set view engine to EJS
app.set("view engine", "ejs");

// Middleware for serving static files
app.use(express.static("public"));

// Serve static files from the "views/js" directory
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
// Middleware to handle session
app.use(sessionMiddleware);

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route to check session and serve appropriate view
app.use("/", userfrontEndRoutes, tempalteFrontEndRoutes, contactFrontEndRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact-list", contactListRoute);

export default app;

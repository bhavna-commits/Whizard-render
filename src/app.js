import express from "express";
import dotenv from "dotenv";
import path from "path";
import sessionMiddleware from "./middleWares/sessionHandler.js";
import userRoutes from "./routes/userRoutes.js";
import frontEndRoutes from "./routes/frontEnd.routes.js";

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
  express.static(path.join(__dirname, "views/Dashboard/js"))
);
app.use("/user/js", express.static(path.join(__dirname, "views/User/js")));

// Middleware to handle session
app.use(sessionMiddleware);

// Middleware to parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Home route to check session and serve appropriate view
app.use("/", frontEndRoutes);
// app.use("/twilio", twilioRoute);

app.use("/api/users", userRoutes);

export default app;

import express from "express";
import sessionMiddleware from "./middleWares/sessionHandler.js";
import corsMiddleware from "./middleWares/cors.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

app.set("views", path.join(__dirname, "..", "views"));
app.set("view engine", "ejs");
// app.set("trust proxy", 1);

app.locals.makeRange = (start, end) => {
	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

app.locals.ifEquals = (arg1, arg2, options) => {
	return arg1 == arg2 ? options.fn(this) : options.inverse(this);
};

app.use(sessionMiddleware);

export default app;

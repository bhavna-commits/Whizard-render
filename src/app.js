import express from "express";
import sessionMiddleware from "./middleWares/sessionHandler.js";
import corsMiddleware from "./middleWares/cors.js";

const app = express();

app.use((req, res, next) => {
	res.setHeader("X-Content-Type-Options", "nosniff");
	res.setHeader("X-Frame-Options", "DENY");
	res.setHeader("X-XSS-Protection", "1; mode=block");
	next();
});

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use(corsMiddleware);

app.set("view engine", "ejs");
app.set("trust proxy", 1);

app.locals.makeRange = (start, end) => {
	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

app.locals.ifEquals = (arg1, arg2, options) => {
	return arg1 == arg2 ? options.fn(this) : options.inverse(this);
};

app.use(sessionMiddleware);

export default app;

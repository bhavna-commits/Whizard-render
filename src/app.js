import express from "express";
import sessionMiddleware from "./middleWares/sessionHandler.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.locals.makeRange = (start, end) => {
	return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

app.locals.ifEquals = (arg1, arg2, options) => {
	return arg1 == arg2 ? options.fn(this) : options.inverse(this);
};


app.use(sessionMiddleware);


export default app;

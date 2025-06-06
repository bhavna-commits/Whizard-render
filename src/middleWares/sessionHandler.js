import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import session from "express-session";
import mongoose from "mongoose";

dotenv.config();

const maxAge = 30 * 24 * 60 * 60 * 1000;
const isProd = Boolean(process.env.PROD);

const sessionMiddleware = session({
	secret: process.env.SESSION_SECRET || "defaultSecret",
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({
		client: mongoose.connection.getClient(),
		mongoUrl: process.env.MONGO_URI,
		collectionName: "sessions",
		autoRemove: "native",
	}),
	cookie: {
		maxAge,
		httpOnly: true,
		secure: isProd,
		sameSite: isProd ? "strict" : "lax",
	},
});

if (!isProd) {
	console.log(`Running in dev mode → secure=false, sameSite="lax"`);
}

export default sessionMiddleware;

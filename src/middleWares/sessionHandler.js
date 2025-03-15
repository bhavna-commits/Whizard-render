import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const maxAge = 60 * 60 * 1000;

const sessionMiddleware = session({
	secret: process.env.SESSION_SECRET || "defaultSecret",
	resave: false,
	saveUninitialized: false,
	store: MongoStore.create({
		mongoUrl: process.env.MONGO_URI,
		ttl: maxAge / 1000, // ttl in seconds
	}),
	cookie: {
		maxAge: maxAge,
		httpOnly: true,
		secure: false,
		sameSite: "lax",
	},
});

if (process.env.NODE_ENV !== "production") {
	console.log(
		`Session Configured: Secure=${process.env.NODE_ENV === "production"}`,
	);
}

export default sessionMiddleware;

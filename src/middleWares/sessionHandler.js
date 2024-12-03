import MongoStore from "connect-mongo";
import dotenv from "dotenv";
import session from "express-session";

dotenv.config();

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "defaultSecret",
  resave: false, // Only save session if it was modified
  saveUninitialized: false, // Don't save unmodified sessions
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 60 * 60, // 1 hour in seconds
  }),
  cookie: {
    maxAge: 60 * 60 * 1000, // 1 hour in milliseconds
    httpOnly: true, // Helps prevent XSS attacks
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production (only over HTTPS)
    sameSite: "lax", // Helps mitigate CSRF attacks
  },
});

// Optional logging for development (remove for production)
if (process.env.NODE_ENV !== "production") {
  console.log(
    `Session Configured: Secure=${process.env.NODE_ENV === "production"}`
  );
}

export default sessionMiddleware;

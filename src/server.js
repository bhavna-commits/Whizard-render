import app from "./routes.app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import https from "https";
import fs from "fs";
import path from "path";

dotenv.config();

connectDB();

const __dirname = path.resolve();
// Path to your certificate and private key
const privateKey = fs.readFileSync(
	path.join(__dirname, "certs", "private-key-no-passphrase.pem"),
	"utf8",
);
const certificate = fs.readFileSync(
	path.join(__dirname, "certs", "certificate.pem"),
	"utf8",
);
const credentials = { key: privateKey, cert: certificate };

// HTTPS server
const PORT = process.env.PORT || 5001;
https.createServer(credentials, app).listen(PORT, () => {
	console.log(`Server running securely on https://localhost:${PORT}`);
});


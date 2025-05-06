import dotenv from "dotenv";
dotenv.config();
import app from "./routes.app.js";
import { connectDB } from "./config/db.js";
import https from "https";
import fs from "fs";
import path from "path";
import { agenda } from "./config/db.js";

connectDB();

const __dirname = path.resolve();
// // Path to your certificate and private key
// const privateKey = fs.readFileSync(
// 	path.join(__dirname, "certs", "private-key-no-passphrase.pem"),
// 	"utf8",
// );
// const certificate = fs.readFileSync(
// 	path.join(__dirname, "certs", "certificate.pem"),
// 	"utf8",
// );
// const credentials = { key: privateKey, cert: certificate };

agenda.on("ready", async () => {
	console.log("Agenda started");
	await agenda.start();
});

process.on("SIGTERM", async () => {
	console.log("Stopping Agenda...");
	await agenda.stop();
	process.exit(0);
});

const PORT = process.env.PORT || 5001;

// https.createServer(credentials, app).listen(PORT, "0.0.0.0", () => {
// 	console.log(`Server running securely on https://localhost:${PORT}`);
// });

app.listen(PORT, "0.0.0.0", () => {
	console.log(`Server running securely on http://localhost:${PORT}`);
});

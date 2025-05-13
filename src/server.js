import dotenv from "dotenv";
dotenv.config();
import app from "./routes.app.js";
import { connectDB } from "./config/db.js";
import { Server } from "socket.io";
import https from "https";
import {
	getUsers,
	sendMessages,
	searchUsers,
	getSingleChat,
} from "./controllers/Chats/chats.controller.js";
import path from "path";
import fs from "fs";
import { agenda } from "./config/db.js";

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

agenda.on("ready", async () => {
	console.log("Agenda started");
	await agenda.start();
});

process.on("SIGTERM", async () => {
	console.log("Stopping Agenda...");
	await agenda.stop();
	process.exit(0);
});

const httpsServer = https.createServer(credentials, app);

const io = new Server(httpsServer, {
	cors: { origin: "*" },
});

io.on("connection", (socket) => {
	console.log("User connected:", socket.id);

	socket.on("initial-users_idal_com", async (data) => {
		console.log(data);
		let res = {};
		try {
			if (data["type"] === "send-message") {
				console.log(data);
				try {
					res = await sendMessages(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] === "getUsers") {
				try {
					res = await getUsers(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] === "getSingleChat") {
				try {
					res = await getSingleChat(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] === "searchUsers") {
				try {
					res = await searchUsers(data);
				} catch (e) {
					console.log(e);
				}
			}
			socket.emit(data["emitnode"], res);
		} catch (e) {
			console.log(e);
		}

		socket.on("disconnect", () => {
			console.log("User disconnected:", socket.id);
		});
	});
});

const PORT = process.env.PORT || 5001;

// https.createServer(credentials, app).listen(PORT, "0.0.0.0", () => {
// 	console.log(`Server running securely on https://localhost:${PORT}`);
// });

httpsServer.listen(PORT, "0.0.0.0", () => {
	console.log(`Server running securely on http://localhost:${PORT}`);
});

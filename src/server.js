import dotenv from "dotenv";
dotenv.config();
import cluster from "cluster";
import os from "os";
import app from "./routes.app.js";
import { connectDB } from "./config/db.js";
import { Server } from "socket.io";
import https from "http";
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

// const __dirname = path.resolve();
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

if (cluster.isPrimary) {
	const cpuCount = os.cpus().length;
	console.log(
		`Primary process ${process.pid} is running. Forking ${cpuCount} workers...`,
	);

	// Fork a worker for each CPU
	for (let i = 0; i < cpuCount; i++) {
		cluster.fork();
	}

	cluster.on("exit", (worker, code) => {
		console.log(
			`Worker ${worker.process.pid} died (code: ${code}). Spawning a new one.`,
		);
		cluster.fork();
	});
} else {
	// Each worker runs the Express server
	const workerServer = https.createServer(app);
	workerServer.listen(PORT, () => {
		console.log(`Worker ${process.pid} listening on port ${PORT}`);
	});

	const io = new Server(workerServer, {
		cors: { origin: "*" },
	});

	io.on("connection", (socket) => {
		console.log("User connected:", socket.id);

		socket.on("initial-users_idal_com", async (data) => {
			let res = {};
			try {
				switch (data.type) {
					case "send-message":
						res = await sendMessages(data);
						break;
					case "getUsers":
						res = await getUsers(data);
						break;
					case "getSingleChat":
						res = await getSingleChat(data);
						break;
					case "searchUsers":
						res = await searchUsers(data);
						break;
				}
				socket.emit(data.emitnode, res);
			} catch (e) {
				console.log("Error handling socket event:", e);
			}
		});

		socket.on("disconnect", () => {
			console.log("User disconnected:", socket.id);
		});
	});
}

// httpsServer.listen(PORT, "0.0.0.0", () => {
// 	console.log(`Server running securely on http://localhost:${PORT}`);
// });

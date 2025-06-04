import dotenv from "dotenv";
dotenv.config();

import cluster from "cluster";
import os from "os";
import app from "./routes.app.js";
import { connectDB, agenda } from "./config/db.js";
import { Server } from "socket.io";
import http from "http"; 
import {
	getUsers,
	sendMessages,
	searchUsers,
	getSingleChat,
} from "./controllers/Chats/chats.controller.js";

const PORT = process.env.PORT || 5001;

const startWorkerServer = () => {
	const server = http.createServer(app);

	const io = new Server(server, {
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
				console.error("Error handling socket event:", e);
			}
		});

		socket.on("disconnect", () => {
			console.log("User disconnected:", socket.id);
		});
	});

	server.listen(PORT, () => {
		console.log(`Worker ${process.pid} listening on port ${PORT}`);
	});
};

const init = async () => {
	await connectDB();

	agenda.on("ready", async () => {
		console.log("Agenda started");
		await agenda.start();
	});

	process.on("SIGTERM", async () => {
		console.log("Stopping Agenda...");
		await agenda.stop();
		process.exit(0);
	});

	if (cluster.isPrimary) {
		const cpuCount = os.cpus().length;
		console.log(
			`Primary process ${process.pid} is running. Forking ${cpuCount} workers...`,
		);

		for (let i = 0; i < cpuCount; i++) cluster.fork();

		cluster.on("exit", (worker, code) => {
			console.warn(
				`Worker ${worker.process.pid} died (code: ${code}). Spawning a new one.`,
			);
			cluster.fork();
		});
	} else {
		startWorkerServer();
	}
};

init();

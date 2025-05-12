import express from "express";
import sessionMiddleware from "./middleWares/sessionHandler.js";
import corsMiddleware from "./middleWares/cors.js";
import { Server } from "socket.io";
import https from "https";
import { getUsers, sendMessages, searchUsers, getSingleChat } from "./controllers/Chats/chats.controller.js";

const app = express();

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

const httpsServer = https.createServer(app);

const io = new Server(httpsServer, {
	cors: { origin: "*" },
});

io.on("connection", (socket) => {

	socket.on("connect", () => {
		console.log("Connected to WebSocket server ✅");
	});
	socket.on("connect_error", (err) => {
		console.error("WebSocket connection failed ❌", err);
	});

	console.log("User connected:", socket.id);

	socket.on("initial-users_idal_com", async (data) => {
		console.log(data);
		let res = {};
		try {
			if (data["type"] == "send-message") {
				console.log(data);
				try {
					res = await sendMessages(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "getUsers") {
				try {
					res = await getUsers(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "getSingleChat") {
				try {
					res = await getSingleChat(data);
				} catch (e) {
					console.log(e);
				}
			} else if (data["type"] == "searchUsers") {
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

export default app;

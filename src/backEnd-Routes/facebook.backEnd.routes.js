import express from "express";
import dotenv from "dotenv";
import User from "../models/user.model.js";

dotenv.config();

const router = express.Router();

router.post("/auth_code", async (req, res) => {
	const { code } = req.body;

	try {
		const url = `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/oauth/access_token?client_id=${process.env.FB_APP_ID}&client_secret=${process.env.FB_APP_SECRET}&redirect_uri=https://localhost:5000&code=${code}`;

		const response = await fetch(url, {
			method: "POST",
		});

		const data = await response.json();

		if (response.ok) {
			const accessToken = data.access_token;
			await User.findByIdAndUpdate(req.session.user.id, { accessToken });
			res.json({ access_token: accessToken });
		} else {
			console.error("Error exchanging code for access token:", data);
			res.status(500).json({
				error: "Failed to exchange authorization code",
			});
		}
	} catch (error) {
		console.error("Error making fetch request:", error);
		res.status(500).json({
			error: "Failed to exchange authorization code",
		});
	}
});

export default router;

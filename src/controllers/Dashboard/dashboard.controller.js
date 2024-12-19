import User from "../../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

export const getDashboard = async (req, res) => {
	try {
		if (!req.session || !req.session.user || !req.session.user.id) {
			return res.status(401).send("User not authenticated");
		}

		const user = await User.findById(req.session.user.id);

		if (!user) {
			return res.status(404).send("User not found");
		}

		res.render("Dashboard/dashboard", {
			config: process.env.CONFIG_ID,
			app: process.env.FB_APP_ID,
			graph: process.env.FB_GRAPH_VERSION,
			status: user.WhatsAppConnectStatus,
			secret: process.env.FB_APP_SECRET,
		});
	} catch (error) {
		console.error(error);
		res.status(500).send("Server error");
	}
};

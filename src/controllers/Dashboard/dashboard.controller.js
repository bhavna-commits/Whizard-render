import User from "../../models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

export const getDashboard = async (req, res) => {
	try {
		if (!req.session || !req.session.user || !req.session.user.id) {
			return res.status(401).send("User not authenticated");
		}

		const id = req.session.user.id;
		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res.status(404).send("User not found");
		}

		// const addedUser = req.session?.addedUser;
		// if (addedUser) {
		// 	const access = Permissions.findOne({ unique_id: addedUser.permissions });
		// 	res.render("Dashboard/dashboard", {
		// 		access: access.dashboard,
		// 		config: process.env.CONFIG_ID,
		// 		app: process.env.FB_APP_ID,
		// 		graph: process.env.FB_GRAPH_VERSION,
		// 		status: user.WhatsAppConnectStatus,
		// 		secret: process.env.FB_APP_SECRET,
		// 	});
		// } else {
		// 	const access = Permissions.findOne({ owner: id });
		// 	res.render("Dashboard/dashboard", {
		// 		access: access.user.dashboard,
		// 		config: process.env.CONFIG_ID,
		// 		app: process.env.FB_APP_ID,
		// 		graph: process.env.FB_GRAPH_VERSION,
		// 		status: user.WhatsAppConnectStatus,
		// 		secret: process.env.FB_APP_SECRET,
		// 	});
		// }
		res.render("Dashboard/dashboard", {
			// access: access.user.dashboard,
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

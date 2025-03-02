import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import Permissions from "../../models/permissions.model.js";
import dotenv from "dotenv";

dotenv.config();

export const getChats = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		// Get user details
		let user = await User.findOne({ unique_id: id });

		const permissions = req.session?.addedUser?.permissions;
		const renderData = {
			user,
			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
			name: req.session?.addedUser?.name || req.session?.user?.name,
			color: req.session?.addedUser?.color || req.session?.user?.color,
		};

		// Handle permissions and render the appropriate view
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access) {
				renderData.access = access;
				res.render("Chats/chats", renderData);
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			renderData.access = access.access;
			res.render("Chats/chats", renderData);
		}
	} catch (error) {
		console.error("Error in getDashboard:", error);
		res.render("errors/serverError");
	}
};

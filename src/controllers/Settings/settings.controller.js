import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import path from "path";
import fs from "fs";
import { languages } from "../../utils/dropDown.js";

export const home = async (req, res) => {
	res.render("Settings/home");
};

export const profile = async (req, res) => {
	const id = req.session.user.id;

	try {
		const user = await User.findById(id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		console.log("User Information:", user);

		res.render("Settings/profile", { user, languages });
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "An error occurred while fetching the user profile",
		});
	}
};

export const updateProfile = async (req, res) => {
	const profilePicPath = path.join(
		"uploads",
		req.session.user.id,
		"profile",
		req.file.filename,
	);

	User.findByIdAndUpdate(
		req.session.user.id,
		{ profilePicture: profilePicPath },
		{ new: true },
	)
		.then(() =>
			res.status(200).json({
				success: true,
				message: "Profile picture uploaded successfully",
			}),
		)
		.catch((err) =>
			res.status(500).json({
				success: false,
				message: "Database error: " + err.message,
			}),
		);
};

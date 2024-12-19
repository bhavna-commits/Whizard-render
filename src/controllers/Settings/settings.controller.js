import path from "path";
import bcrypt from "bcrypt";
import { validatePassword } from "../../utils/otpGenerator.js";
import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import fs from "fs";
import {
	languages,
	countries,
	size,
	industryCategory,
	roles,
} from "../../utils/dropDown.js";

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

		// console.log("User Information:", user);
		const language = "English";
		res.render("Settings/profile", { user, languages, language });
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "An error occurred while fetching the user profile",
		});
	}
};

export const updateProfile = async (req, res) => {
	const data = req.body;
	// console.log(data);
	const profilePicPath = path.join(
		"uploads",
		req.session.user.id,
		"profile",
		req.file.filename,
	);
	// console.log(profilePicPath);
	User.findByIdAndUpdate(
		req.session.user.id,
		{
			profilePhoto: profilePicPath,
			name: data.name,
			language: data.language,
		},
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

export const updatePassword = async (req, res) => {
	const { currentPassword, newPassword, logoutDevices } = req.body;

	const user = await User.findById(req.user.session.id);

	if (!user) {
		return res.status(400).json({ error: "User not found" });
	}

	const isMatch = await bcrypt.compare(currentPassword, user.password);

	if (!isMatch) {
		return res.status(400).json({ error: "incorrect_password" });
	}

	const passwordValid = validatePassword(newPassword);
	if (!passwordValid) {
		return res
			.status(400)
			.json({ message: "Password does not meet the criteria." });
	}

	const hashedPassword = await bcrypt.hash(newPassword, 10);
	user.password = hashedPassword;

	await user.save();

	if (logoutDevices) {
		req.session.user = null;
		res.render("login");
	} else {
		return res
			.status(200)
			.json({ message: "Password updated successfully" });
	}
};

export const accountDetails = async (req, res) => {
	const id = req.session.user.id;

	try {
		const user = await User.findById(id);

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.render("Settings/accountDetails", {
			user,
			countries,
			industryCategory,
			size,
			roles,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "An error occurred while fetching the user profile",
		});
	}
};

export const updateAccountDetails = async (req, res) => {
	try {
		const {
			name: companyName,
			description,
			state,
			country,
			companySize,
			industry,
			jobRole,
			website,
		} = req.body;
		// console.log(req.body);

		const updatedUser = await User.findByIdAndUpdate(
			req.session.user.id,
			{
				companyName,
				companyDescription: description,
				state,
				country,
				companySize,
				industry,
				jobRole,
				website,
			},
			{ new: true },
		);

		if (!updatedUser) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		res.status(200).json({
			success: true,
			message: "Account details updated successfully",
			data: updatedUser,
		});
	} catch (error) {
		console.error("Error updating account details:", error);
		res.status(500).json({
			success: false,
			message: "Server error: " + error.message,
		});
	}
};


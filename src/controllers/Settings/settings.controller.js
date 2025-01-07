import path from "path";
import bcrypt from "bcrypt";
import { validatePassword } from "../../utils/otpGenerator.js";
import User from "../../models/user.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import AddedUser from "../../models/addedUser.model.js";

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
		const user = await User.findOne({ unique_id: id });

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

	// Construct the profile picture path
	const profilePicPath = path.join(
		"uploads",
		req.session.user.id,
		"profile",
		req.file.filename,
	);

	try {
		const updatedUser = await User.findOneAndUpdate(
			{ unique_id: req.session.user.id },
			{
				profilePhoto: profilePicPath,
				name: data.name,
				language: data.language,
			},
			{ new: true },
		);

		req.session.user.photo = profilePicPath;

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Updated its profile`,
		});

		updatedUser.save();
		// Send success response
		res.status(200).json({
			success: true,
			message: "Profile picture uploaded successfully",
		});
	} catch (err) {
		// Handle errors and send error response
		res.status(500).json({
			success: false,
			message: "Database error: " + err.message,
		});
	}
};

export const updatePassword = async (req, res) => {
	const { currentPassword, newPassword, logoutDevices } = req.body;
	let id;
	req.session.addedUser
		? (id = req.session.addedUser.id)
		: (id = req.session.user.id);

	const user = await User.findOne({ unique_id: id });

	if (!user) {
		const addedUser = AddedUser.findById(id);
		if (!addedUser)
			return res.status(400).json({ error: "User not found" });

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

		addedUser.password = hashedPassword;
		addedUser.save();

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `${req.addedUser.name} updated their password`,
		});
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

	await ActivityLogs.create({
		name: req.session.user.name
			? req.session.user.name
			: req.session.addedUser.name,
		actions: "Update",
		details: `${req.addedUser.name} updated their password`,
	});

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
		const user = await User.findOne({ unique_id: id });

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

		const updatedUser = await User.findOneAndUpdate(
			{ unique_id: req.session.user.id },
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

export const getActivityLogs = async (req, res) => {
	try {
		const logs = await ActivityLogs.find().sort({ createdAt: -1 });

		res.render("Settings/activityLogs", { logs });
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.status(500).send("Server error");
	}
};

export const activityLogsFiltered = async (req, res) => {
	const { action, dateRange } = req.query;
	let filter = {};

	// Filter by action type
	if (action && action !== "All action") {
		filter.actions = action;
	}

	// Filter by date range
	const now = new Date();
	if (dateRange) {
		let startDate;
		switch (dateRange) {
			case "Past 7 days":
				startDate = new Date(now.setDate(now.getDate() - 7));
				break;
			case "Past 30 days":
				startDate = new Date(now.setDate(now.getDate() - 30));
				break;
			case "Past 90 days":
				startDate = new Date(now.setDate(now.getDate() - 90));
				break;
			case "This month":
				startDate = new Date(now.getFullYear(), now.getMonth(), 1);
				break;
			case "Previous month":
				startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
				break;
			default:
				startDate = null;
		}
		if (startDate) {
			filter.createdAt = { $gte: startDate };
		}
	}

	try {
		const logs = await ActivityLogs.find(filter).sort({ createdAt: -1 });
		res.render("Settings/partials/activityLogs", { logs });
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.status(500).send("Server error");
	}
};

export const getUserManagement = async (req, res) => {
	const id = req.session.user.id;

	try {
		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// console.log("User Information:", user);
		const language = "English";
		res.render("Settings/userMangement");
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "An error occurred while fetching the user profile",
		});
	}
};

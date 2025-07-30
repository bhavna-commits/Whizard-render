import path from "path";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { isObject, isString } from "../../middleWares/sanitiseInput.js";
import {
	generateUniqueId,
	validatePassword,
} from "../../utils/otpGenerator.js";
import User from "../../models/user.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import AddedUser from "../../models/addedUser.model.js";
import Login from "../../models/login.model.js";
import Permissions from "../../models/permissions.model.js";
import {
	languages,
	countries,
	size,
	industryCategory,
	roles,
	help,
	verticalCategories,
} from "../../utils/dropDown.js";
import sendAddUserMail from "../../services/OTP/addingUserService.js";
import dotenv from "dotenv";
import { getRandomColor } from "../User/userFunctions.js";
import { changeNumberDP } from "../../services/facebook/fetch.functions.facebook.js";
import { uploadMediaResumable } from "../Templates/template.functions.controller.js";

dotenv.config();

export const home = async (req, res) => {
	try {
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.settings.type) {
				res.render("Settings/home", {
					access,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.user?.color,
					help,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const id = req.session?.user?.id;
			const access = await User.findOne({ unique_id: id });
			// console.log(access.access);
			res.render("Settings/home", {
				access: access.access,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
				help,
			});
		}
	} catch (err) {
		console.log(err);
		res.render("errors/serverError");
	}
};

export const profile = async (req, res) => {
	try {
		let id;
		let user;
		if (req.session?.user?.id) {
			id = req.session?.user?.id;
			user = await User.findOne({ unique_id: id, deleted: false });
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			res.render("Settings/profile", {
				access: user.access,
				user,
				languages,
				photo: req.session?.user?.photo,
				name: req.session?.user?.name,
				color: req.session?.user?.color,
				help,
			});
		} else {
			id = req.session?.addedUser?.id;
			user = await AddedUser.findOne({ unique_id: id });
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			const access = await Permissions.findOne({
				unique_id: user.roleId,
			});
			res.render("Settings/profile", {
				access,
				user,
				languages,
				photo: req.session.addedUser?.photo,
				name: req.session.addedUser?.name,
				color: req.session.addedUser?.color,
				help,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const updateProfile = async (req, res) => {
	try {
		const data = req.body;

		// console.log(JSON.stringify(data));

		let profilePicPath;
		if (req.file?.filename) {
			profilePicPath = path.join(
				"uploads",
				req.session?.user?.id || req.session?.addedUser?.owner,
				"profile",
				req.file.filename,
			);
		}

		const updateFields = {
			name: data.name,
			language: data.language,
		};

		let updatedUser;

		// Check if updating a 'User' or an 'AddedUser'
		if (req.session?.user?.id) {
			if (profilePicPath) {
				updateFields.profilePhoto = profilePicPath;
			}

			updatedUser = await User.findOneAndUpdate(
				{
					unique_id: req.session?.user?.id,
				},
				updateFields,
				{ new: true },
			);

			// Update session with new photo
			req.session.user.photo = updatedUser.profilePhoto;
		} else {
			if (profilePicPath) {
				updateFields.photo = profilePicPath;
			}
			// delete updateFields.language;
			updatedUser = await AddedUser.findOneAndUpdate(
				{
					unique_id: req.session?.addedUser?.id,
				},
				updateFields,
				{ new: true },
			);

			// Update session with new photo
			req.session.addedUser.photo = updatedUser.photo;
		}

		// Log activity for both User and AddedUser
		try {
			await ActivityLogs.create({
				useradmin: req.session?.user?.id || req.session?.addedUser?.id,
				unique_id: generateUniqueId(),
				name: req.session.user?.name || req.session.addedUser?.name,
				actions: "Update",
				details: `Updated profile information`,
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				message: "Activity issue: " + err.message,
			});
		}

		// Send success response
		res.status(200).json({
			success: true,
			message: "Profile updated successfully",
		});
	} catch (err) {
		// Handle errors and send error response
		res.status(500).json({
			success: false,
			message: "Database error: " + err.message,
		});
	}
};

export const updatePassword = async (req, res, next) => {
	try {
		const { currentPassword, newPassword, logoutDevices } = req.body;
		let id, isAddedUser;

		if (!isString(currentPassword, newPassword)) return next();
		// Determine whether it's a regular user or an added user
		if (req.session?.addedUser) {
			// Use the owner's id for an addedUser so that all sessions for this account get cleared
			id = req.session.addedUser.owner;
			isAddedUser = true;
		} else {
			id = req.session?.user?.id;
			isAddedUser = false;
		}

		// Check if the user is found based on the session type
		let user;
		if (isAddedUser) {
			user = await AddedUser.findOne({
				unique_id: req.session.addedUser.id,
			});
		} else {
			user = await User.findOne({ unique_id: id });
		}

		if (!user) {
			return res
				.status(400)
				.json({ success: false, message: "User not found" });
		}

		// Check if the current password matches the one in the database
		const isMatch = await bcrypt.compare(currentPassword, user.password);
		if (!isMatch) {
			return res
				.status(400)
				.json({ success: false, message: "Incorrect password" });
		}

		// Validate the new password
		const passwordValid = validatePassword(newPassword);
		if (!passwordValid) {
			return res.status(400).json({
				success: false,
				message: "Password does not meet the criteria.",
			});
		}

		// Hash the new password and update
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;
		await user.save();

		// Log the password update activity
		await ActivityLogs.create({
			useradmin: req.session.user
				? req.session.user.id
				: req.session.addedUser.owner,
			unique_id: generateUniqueId(),
			name: req.session.user
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `${user.name} updated their password`,
		});

		if (logoutDevices) {
			try {
				// Step 1: Get all session documents from the MongoDB collection
				const db = mongoose.connection.db;
				if (!db) {
					throw "Mongoose database connection not established";
				}
				const sessions = await db
					.collection("sessions")
					.find({})
					.toArray();

				const destroyPromises = [];

				// Step 2: Iterate over each session document
				for (const sessionDoc of sessions) {
					if (!sessionDoc || !sessionDoc._id || !sessionDoc.session) {
						console.warn(
							`Skipping malformed session document: ${JSON.stringify(
								sessionDoc,
							)}`,
						);
						continue;
					}

					// Parse the session data (stored as a JSON string in MongoDB)
					let sessionData;
					try {
						sessionData = JSON.parse(sessionDoc.session);
					} catch (parseErr) {
						console.warn(
							`Skipping session with invalid JSON: ${sessionDoc._id}`,
						);
						continue;
					}

					// Step 3: Check if the session belongs to the user
					const isUserSession =
						sessionData.user && sessionData.user.id === id;
					const isAddedUserSession =
						sessionData.addedUser &&
						sessionData.addedUser.owner === id;

					if (isUserSession || isAddedUserSession) {
						// Step 4: Queue the session for destruction
						destroyPromises.push(
							new Promise((resolve, reject) => {
								req.sessionStore.destroy(
									sessionDoc._id,
									(err) => {
										if (err) {
											console.error(
												`Error destroying session ${sessionDoc._id}:`,
												err,
											);
											reject(err);
										} else {
											console.log(
												`Destroyed session ${sessionDoc._id} for user ${id}`,
											);
											resolve();
										}
									},
								);
							}),
						);
					}
				}

				// Step 5: Wait for all matching sessions to be destroyed
				await Promise.all(destroyPromises);

				// Step 6: Destroy the current session
				await new Promise((resolve, reject) => {
					req.session.destroy((err) => {
						if (err) {
							console.error(
								"Error destroying current session:",
								err,
							);
							reject(err);
						} else {
							res.clearCookie("connect.sid");
							resolve();
						}
					});
				});

				return res.status(200).json({
					success: true,
					message:
						"Password updated successfully, logged out from all devices",
				});
			} catch (error) {
				console.error("Error in updatePassword:", error);
				return res.status(500).json({
					success: false,
					message: "Error updating password",
					error: error.message,
				});
			}
		}

		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: error.message || error,
		});
	}
};

export const accountDetails = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		let user;

		user = await User.findOne({ unique_id: id, deleted: false });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const numbersPhoto =
			req.session?.addedUser?.selectedFBNumber?.dp ||
			user?.FB_PHONE_NUMBERS.find((n) => n.selected)?.dp;

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.settings?.whatsAppAccountDetails) {
				res.render("Settings/accountDetails", {
					access,
					user,
					photo: req.session.addedUser?.photo,
					name: req.session.addedUser.name,
					color: req.session.addedUser.color,
					help,
					numbersPhoto,
					verticalCategories,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const id = req.session?.user?.id;
			const access = await User.findOne({ unique_id: id });
			// console.log(access.access);
			res.render("Settings/accountDetails", {
				access: access.access,
				user,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
				help,
				numbersPhoto,
				verticalCategories,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const updateAccountDetails = async (req, res, next) => {
	try {
		const {
			name: companyName,
			description,
			website,
			email,
			address,
			about,
			industry,
		} = req.body;

		if (
			!isString(
				companyName,
				description,
				website,
				email,
				address,
				about,
				industry,
			)
		)
			return next();

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const updatedUser = await User.findOne({
			unique_id: userId,
			deleted: false,
		});

		if (!updatedUser) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			});
		}

		const selectedNumberObj =
			req.session?.addedUser?.selectedFBNumber ||
			updatedUser.FB_PHONE_NUMBERS.find((i) => i.selected);

		if (!selectedNumberObj) {
			return res.status(400).json({
				success: false,
				message: "No selected phone number found",
			});
		}

		const phoneNumberId = selectedNumberObj.phone_number_id;
		const accessToken = updatedUser.FB_ACCESS_TOKEN;
		let profilePictureHandle = null;

		if (req.file?.path) {
			const absolutePath = path.resolve(req.file.path);
			profilePictureHandle = await uploadMediaResumable(
				accessToken,
				process.env.FB_APP_ID,
				absolutePath,
			);

			// Save profile pic locally (for UI/reference)
			selectedNumberObj.dp = path.join(
				"uploads",
				userId,
				"phoneNumbers",
				req.file.filename,
			);
		}

		// Update WhatsApp Business Profile using Meta API
		await changeNumberDP({
			phoneNumberId,
			token: accessToken,
			about,
			address,
			description,
			email,
			vertical: industry,
			websites: website ? [website] : undefined,
			profilePictureHandle,
		});

		// Update fields in your own DB (only if not empty)
		const updateFields = {
			companyName,
			companyDescription: description,
			website,
			displayAddress: address,
			industry,
			companyDisplayEmail: email,
			displayAbout: about,
		};

		for (const [key, value] of Object.entries(updateFields)) {
			if (typeof value === "string" && value.trim()) {
				updatedUser[key] = value.trim();
			}
		}

		await updatedUser.save();

		await ActivityLogs.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Update",
			details: `Updated their account details`,
		});

		res.status(200).json({
			success: true,
			message: "Account details updated successfully",
		});
	} catch (error) {
		console.error("Error updating account details:", error);
		res.status(500).json({
			success: false,
			message: "Server error: " + error?.message || error,
		});
	}
};

export const getActivityLogs = async (req, res) => {
	try {
		let filter = {};
		const now = new Date();
		let startDate = new Date(now.setDate(now.getDate() - 7));
		// console.log(startDate);
		filter.useradmin =
			req.session?.user?.id || req.session?.addedUser?.owner;
		filter.createdAt = { $gte: startDate };

		const [users, addedUsers] = await Promise.all([
			User.find({ unique_id: filter.useradmin }), // Retrieve all users
			AddedUser.find({ useradmin: filter.useradmin, deleted: false }), // Retrieve all addedUsers that are not deleted
		]);

		// Step 2: Create a map (or dictionary) of users and addedUsers by their names for quick lookup
		const userMap = new Map();
		users.forEach((user) => {
			userMap.set(user.name, {
				photo: user.profilePhoto,
				color: user.color,
			});
		});

		const addedUserMap = new Map();
		addedUsers.forEach((addedUser) => {
			addedUserMap.set(addedUser.name, {
				photo: addedUser.photo,
				color: addedUser.color,
			});
		});

		// Step 3: Fetch logs based on the filter
		const logs = await ActivityLogs.find(filter).sort({ createdAt: -1 });

		// Step 4: Iterate over logs and assign the photo and color based on matching names
		logs.forEach((log) => {
			const userData = userMap.get(log.name); // Check if name matches with a user
			const addedUserData = addedUserMap.get(log.name); // Check if name matches with an addedUser

			if (userData) {
				// If it's a user, add the photo and color from the user
				log.photo = userData.photo;
				log.color = userData.color;
			} else if (addedUserData) {
				// If it's an addedUser, add the photo and color from the addedUser
				log.photo = addedUserData.photo;
				log.color = addedUserData.color;
			}
		});

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.settings?.activityLogs) {
				res.render("Settings/activityLogs", {
					access,
					logs,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
					help,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const id = req.session?.user?.id;
			const access = await User.findOne({ unique_id: id });
			// console.log(access.access);
			res.render("Settings/activityLogs", {
				access: access.access,
				logs,
				photo: req.session.user?.photo,
				name: req.session.user?.name,
				color: req.session.user?.color,
				help,
			});
		}
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.render("errors/serverError");
	}
};

export const activityLogsFiltered = async (req, res, next) => {
	try {
		const { action, dateRange } = req.query;
		let filter = {};

		if (!isString(action, dateRange)) return next();

		filter.useradmin =
			req.session?.user?.id || req.session?.addedUser?.owner;
		// Filter by action type
		if (action && action !== "All action") {
			filter.actions = action;
		}

		// Filter by date range
		const now = new Date();
		if (dateRange) {
			let startDate, endDate;
			const now = new Date();

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
					endDate = now;
					break;
				case "Previous month":
					startDate = new Date(
						now.getFullYear(),
						now.getMonth() - 1,
						1,
					);
					endDate = new Date(now.getFullYear(), now.getMonth(), 0);
					break;
				default:
					startDate = null;
			}

			if (startDate) {
				if (endDate) {
					filter.createdAt = { $gte: startDate, $lt: endDate };
				} else {
					filter.createdAt = { $gte: startDate };
				}
			}
		}

		const [users, addedUsers] = await Promise.all([
			User.find({ unique_id: filter.useradmin }), // Retrieve all users
			AddedUser.find({ useradmin: filter.useradmin, deleted: false }), // Retrieve all addedUsers that are not deleted
		]);

		// Step 2: Create a map (or dictionary) of users and addedUsers by their names for quick lookup
		const userMap = new Map();
		users.forEach((user) => {
			userMap.set(user.name, {
				photo: user.profilePhoto,
				color: user.color,
			});
		});

		const addedUserMap = new Map();
		addedUsers.forEach((addedUser) => {
			addedUserMap.set(addedUser.name, {
				photo: addedUser.photo,
				color: addedUser.color,
			});
		});

		const logs = await ActivityLogs.find(filter).sort({ createdAt: -1 });

		logs.forEach((log) => {
			const userData = userMap.get(log.name); // Check if name matches with a user
			const addedUserData = addedUserMap.get(log.name); // Check if name matches with an addedUser

			if (userData) {
				// If it's a user, add the photo and color from the user
				log.photo = userData.photo;
				log.color = userData.color;
			} else if (addedUserData) {
				// If it's an addedUser, add the photo and color from the addedUser
				log.photo = addedUserData.photo;
				log.color = addedUserData.color;
			}
		});

		if (req.session?.user) {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Settings/partials/activityLogs", {
				access: access.access,
				logs,
				photo: req.session.user?.photo,
				name: req.session.user?.name,
			});
		} else {
			const access = await Permissions.findOne({
				unique_id: req.session?.addedUser?.permissions,
			});
			res.render("Settings/partials/activityLogs", {
				access,
				logs,
				photo: req.session.addedUser?.photo,
				name: req.session.addedUser.name,
			});
		}
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.render("errors/serverError");
	}
};

export const getUserManagement = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		const exist = await User.findOne({ unique_id: id, deleted: false });

		const whatsAppNumbers = exist.FB_PHONE_NUMBERS;

		let users = await AddedUser.find({ useradmin: id, deleted: false });
		const permissions = await Permissions.find({
			useradmin: id,
			deleted: false,
		});
		users = users ? users : [];

		const permission = req.session?.addedUser?.permissions;
		if (permission) {
			const access = await Permissions.findOne({ unique_id: permission });
			console.log(access?.settings?.userManagement);
			if (access?.settings?.userManagement?.type) {
				res.render("Settings/userManagement", {
					access,
					users,
					permissions,
					id,
					photo: req.session.addedUser?.photo,
					name: req.session.addedUser.name,
					color: req.session.addedUser.color,
					help,
					whatsAppNumbers,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: id,
				deleted: false,
			});
			res.render("Settings/userManagement", {
				access: access.access,
				users,
				permissions,
				id,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
				help,
				whatsAppNumbers,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getCreatePassword = async (req, res) => {
	res.render("Settings/createAddedUserPassword");
};

export const sendUserInvitation = async (req, res, next) => {
	try {
		const adminId = req?.session?.user?.id || req.session?.addedUser?.owner;

		let { name, email, roleId, roleName, url, selectedFBNumber } = req.body;

		if (!isString(name, email, roleId, roleName)) {
			return next();
		}

		let exists = await User.findOne({ name, unique_id: adminId });
		if (exists) {
			return res
				.status(409)
				.json({ success: false, message: "Name already in use" });
		}

		exists = await AddedUser.findOne({
			name,
			deleted: false,
			useradmin: adminId,
		});
		if (exists) {
			return res
				.status(409)
				.json({ success: false, message: "Name already in use" });
		}

		exists = await AddedUser.findOne({ email, deleted: false });
		if (exists) {
			return res
				.status(409)
				.json({ success: false, message: "Email already in use" });
		}

		exists = await User.findOne({ email, deleted: false });
		if (exists) {
			return res
				.status(409)
				.json({ success: false, message: "Email already in use" });
		}

		const newUser = new AddedUser({
			unique_id: generateUniqueId(),
			name,
			email,
			roleId,
			roleName,
			useradmin: adminId,
			color: getRandomColor(),
			selectedFBNumber,
		});
		console.log("user added");

		// Generate unique invitation link
		const invitationToken = Buffer.from(
			`${adminId}:${newUser.unique_id}`,
		).toString("base64");
		const invitationLink = `${url}/settings/user-management/create-password?token=${invitationToken}`;

		// Send invitation email
		await sendAddUserMail(
			req.session?.user?.name || req.session?.addedUser?.name,
			invitationLink,
			email,
		);
		console.log("email sent");

		// Log activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Send",
			details: `Sent an invitation link to join the account`,
		});

		// Save new user to the database
		await newUser.save();
		console.log("last");

		// Send success response
		return res
			.status(200)
			.json({ message: "Invitation sent successfully" });
	} catch (error) {
		console.error("Error sending invitation:", error);
		// Send error response only if no response has been sent yet
		if (!res.headersSent) {
			res.status(500).json({ message: "Failed to send invitation" });
		}
	}
};

export const getPermissions = async (req, res) => {
	try {
		const id = req.session?.addedUser?.owner || req.session?.user?.id;
		const permission = req.session?.addedUser?.permissions;
		const editPermission = await Permissions.findOne({
			unique_id: req.query?.id,
		});
		if (permission) {
			const access = await Permissions.findOne({ unique_id: permission });
			// console.log(access.settings)
			if (access.settings.userManagement?.addPermission) {
				res.render("Settings/permissions", {
					access,
					editPermission,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
					help,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: id });
			// console.log(access.access);
			res.render("Settings/permissions", {
				access: access.access,
				editPermission,
				photo: req.session?.user?.photo,
				name: req.session?.user.name,
				color: req.session?.user.color,
				help,
			});
		}
	} catch (err) {
		console.error("Error getting permissions :", err);
		res.render("errors/serverError");
	}
};

export const createPermissions = async (req, res, next) => {
	try {
		const unique_id = generateUniqueId();
		const useradmin =
			req.session?.user?.id || req.session?.addedUser?.owner;

		const { name, permissions } = req.body;
		if (!name || !permissions)
			return res.status(401).json({
				success: false,
				message: "Invalid input : please fill the required fields",
			});

		if (!isString(name)) next();

		const existingRole = await Permissions.findOne({ useradmin, name });
		if (existingRole) {
			return res
				.status(400)
				.json({ message: "Role with this name already exists" });
		}

		const { dashboard, chats, contactlist, templates, reports, settings } =
			permissions;

		const newRole = new Permissions({
			useradmin,
			name,
			unique_id,
			createdBy: req.session?.user?.name || req.session?.addedUser?.name,
			dashboard: { ...dashboard },
			chats: { ...chats },
			contactList: { ...contactlist },
			templates: { ...templates },
			reports: {
				...reports,
				conversationReports: {
					...reports.conversationReports,
				},
			},
			settings: {
				...settings,
				userManagement: { ...settings.userManagement },
				manageTags: { ...settings.manageTags },
			},
		});

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Create",
			details: `Created a new role named ${newRole.name}`,
		});

		await newRole.save();

		return res
			.status(201)
			.json({ message: "Role created successfully!", role: newRole });
	} catch (error) {
		console.error("Error creating role:", error);
		return res.status(500).json({ message: error });
	}
};

export const editPermissions = async (req, res, next) => {
	try {
		// Get the unique id from the query parameters
		const unique_id = req.query?.id;
		const useradmin =
			req.session?.user?.id || req.session?.addedUser?.owner;

		const { permissions } = req.body;
		if (!permissions) {
			return res.status(401).json({
				success: false,
				message: "Invalid input: please fill the required fields",
			});
		}

		// if (!isString(name)) next();
		// console.log(permissions.settings);
		// Find the role to update
		const role = await Permissions.findOne({ unique_id, useradmin });
		if (!role) {
			return res.status(404).json({ message: "Role not found" });
		}

		const { dashboard, chats, contactlist, templates, reports, settings } =
			permissions;

		// Update role values
		role.dashboard = { ...dashboard };
		role.chats = { ...chats }; // fixed typo: was `chat`
		role.contactList = { ...contactlist };
		role.templates = { ...templates };
		role.reports = {
			...reports,
			conversationReports: { ...reports.conversationReports },
		};
		role.settings = {
			...settings,
			userManagement: { ...settings.userManagement },
			manageTags: { ...settings.manageTags },
		};

		await role.save();

		// Log the update action in ActivityLogs
		await ActivityLogs.create({
			useradmin,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Update",
			details: `Edited permissions role with name ${role.name}`,
		});

		return res
			.status(200)
			.json({ message: "Role updated successfully!", role });
	} catch (error) {
		console.error("Error editing role:", error);
		return res.status(500).json({ message: error });
	}
};

export const createAddedUserPassword = async (req, res, next) => {
	try {
		let { password, adminId, role } = req.body;

		if (!password || !adminId || !role)
			return res.json({
				success: false,
				message: "Invaild input : Please fill all fields",
			});

		if (!isString(password, adminId, role)) next();

		const data = await User.findOne({ unique_id: adminId });

		if (!data) {
			return res.json({ success: false, message: "User not found" });
		}

		const saltRounds = 10;
		password = await bcrypt.hash(password, saltRounds);

		const addedUser = await AddedUser.findOneAndUpdate(
			{ unique_id: role },
			{
				password,
				status: "Active",
			},
		);

		req.session.addedUser = {
			id: addedUser.unique_id,
			name: addedUser.name,
			photo: addedUser?.photo,
			color: addedUser.color,
			permissions: addedUser.roleId,
			owner: data.unique_id,
			whatsAppStatus: data.WhatsAppConnectStatus,
		};

		// console.log("user added");
		res.json({ success: true });
	} catch (err) {
		console.error(err);
		res.json({ success: false, message: err });
	}
};

export const updateUserManagement = async (req, res) => {
	let { userId, action, status, newRoleId, newRoleName, selectedFBNumber } =
		req.body;

	try {
		if (mongoose.connection.readyState !== 1) {
			console.error(
				"🚨 Mongoose not connected:",
				mongoose.connection.readyState,
			);
			return res
				.status(500)
				.json({ success: false, message: "DB not ready" });
		}

		const sessionColl = mongoose.connection.db.collection("sessions");
		console.log("👍 sessions collection name:", sessionColl.collectionName);

		let user;
		switch (action) {
			case "updateStatus":
				user = await AddedUser.findOneAndUpdate(
					{ unique_id: userId, deleted: false },
					{ status },
					{ new: true },
				);
				if (!user) {
					console.warn("⚠️ updateStatus: no user found for", userId);
					return res
						.status(404)
						.json({ success: false, message: "User not found" });
				}
				return res
					.status(200)
					.json({ success: true, message: "Status updated" });

			case "updateRole":
				user = await AddedUser.findOneAndUpdate(
					{ unique_id: userId, deleted: false },
					{
						roleName: newRoleName,
						roleId: newRoleId,
						selectedFBNumber,
					},
					{ new: true },
				);
				if (!user) {
					return res
						.status(404)
						.json({ success: false, message: "User not found" });
				}

				const permission = await Permissions.findOne({
					unique_id: newRoleId,
				});

				if (!permission?.chats?.allChats) {
					const login = await Login.findOne({ id: userId });
				}

				const allSessions = await sessionColl.find({}).toArray();

				const bulkOps = [];
				allSessions.forEach((doc) => {
					let sess;
					try {
						sess = JSON.parse(doc.session);
					} catch (err) {
						console.error(
							`   ✖ malformed JSON in session ${doc._id}`,
							err,
						);
						return;
					}

					if (sess.addedUser?.id === userId) {
						sess.addedUser.permissions = newRoleId;
						bulkOps.push({
							updateOne: {
								filter: { _id: doc._id },
								update: {
									$set: { session: JSON.stringify(sess) },
								},
							},
						});
					}
				});

				console.log(`🚀 Queued ${bulkOps.length} session updates`);
				if (bulkOps.length) await sessionColl.bulkWrite(bulkOps);

				return res.status(200).json({
					success: true,
					message: "Role and sessions updated",
				});

			case "deleteUser":
				// fetch & debug
				const sessions = await sessionColl.find({}).toArray();
				// console.log(
				// 	`🔍 Found ${sessions.length} total session docs (for delete)`,
				// );
				const toDeleteIds = [];

				sessions.forEach((doc) => {
					// console.log("→ checking session _id=", doc._id);
					let sess;
					try {
						sess = JSON.parse(doc.session);
					} catch (err) {
						console.error(
							`   ✖ malformed JSON in session ${doc._id}`,
							err,
						);
						return;
					}
					if (sess.addedUser?.id === userId) {
						// console.log(`   🗑️ marking for deletion`);
						toDeleteIds.push(doc._id);
					}
				});

				console.log(`🗑️ Deleting ${toDeleteIds.length} sessions`);
				if (toDeleteIds.length)
					await sessionColl.deleteMany({ _id: { $in: toDeleteIds } });

				// soft‑delete user
				user = await AddedUser.findOneAndUpdate(
					{ unique_id: userId, deleted: false },
					{ deleted: true },
					{ new: true },
				);
				if (!user) {
					// console.warn("⚠️ deleteUser: no user found for", userId);
					return res
						.status(404)
						.json({ success: false, message: "User not found" });
				}

				return res.status(200).json({
					success: true,
					message: "User deleted and sessions destroyed",
				});

			default:
				return res
					.status(400)
					.json({ success: false, message: "Invalid action" });
		}
	} catch (error) {
		console.error("🔥 updateUserManagement error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: error.message,
		});
	}
};

export const deleteRole = async (req, res) => {
	try {
		const useradmin =
			req.session?.user?.id || req.session?.addedUser?.owner;
		const { id, name } = req.query; // Now extract from req.params

		// Example deletion logic:
		await Permissions.findOneAndUpdate(
			{ unique_id: id },
			{ deleted: true },
		);

		await ActivityLogs.create({
			useradmin,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Delete",
			details: `Deleted role with name ${name}`,
		});

		return res.json({ success: true });
	} catch (error) {
		console.error(error);
		return res.json({ success: false, message: "Failed to delete role" });
	}
};

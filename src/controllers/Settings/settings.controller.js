import path from "path";
import bcrypt from "bcrypt";
import { isString } from "../../middleWares/sanitiseInput.js";
import {
	generateUniqueId,
	validatePassword,
} from "../../utils/otpGenerator.js";
import User from "../../models/user.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import AddedUser from "../../models/addedUser.model.js";
import Permissions from "../../models/permissions.model.js";

import {
	languages,
	countries,
	size,
	industryCategory,
	roles,
} from "../../utils/dropDown.js";
import sendAddUserMail from "../../services/OTP/addingUserService.js";
import dotenv from "dotenv";
import { getRandomColor } from "../User/userFunctions.js";

dotenv.config();

export const home = async (req, res) => {
	try {
		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.settings.type) {
				res.render("Settings/home", {
					access,
					photo: req.session.user?.photo,
					name: req.session.user.name,
					color: req.session.user.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const id = req.session?.user?.id;
			const access = await User.findOne({ unique_id: id });
			console.log(access.access);
			res.render("Settings/home", {
				access: access.access,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
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
			user = await User.findOne({ unique_id: id });
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			res.render("Settings/profile", {
				user,
				languages,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
			});
		} else {
			id = req.session?.addedUser?.owner;
			user = await AddedUser.findOne({ unique_id: id });
			if (!user) {
				return res.status(404).json({ message: "User not found" });
			}
			res.render("Settings/profile", {
				user,
				languages,
				photo: req.session.addedUser?.photo,
				name: req.session.addedUser?.name,
				color: req.session.addedUser?.color,
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

		console.log(JSON.stringify(data));

		let profilePicPath;
		if (req.file?.filename) {
			profilePicPath = path.join(
				"uploads",
				req.session.user.id,
				"profile",
				req.file.filename,
			);
		}

		const updateFields = {
			name: data.name,
			language: data.language,
		};

		if (profilePicPath) {
			updateFields.profilePhoto = profilePicPath;
		}

		const updatedUser = await User.findOneAndUpdate(
			{ unique_id: req.session.user.id },
			updateFields,
			{ new: true },
		);
		req.session.user.photo = updatedUser.profilePhoto;
		// console.log(updatedUser);
		try {
			await ActivityLogs.create({
				useradmin: req.session.user.id,
				unique_id: generateUniqueId(),
				name: req.session.user.name
					? req.session.user.name
					: req.session.addedUser.name,
				actions: "Update",
				details: `Updated its profile`,
			});
		} catch (err) {
			res.status(500).json({
				success: false,
				message: "Activity issue: " + err.message,
			});
		}

		await updatedUser.save();
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
	try {
		const { currentPassword, newPassword, logoutDevices } = req.body;
		let id;
		req.session.addedUser
			? (id = req.session.addedUser.id)
			: (id = req.session.user.id);

		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res
				.status(400)
				.json({ success: false, message: "User not found" });
			// const addedUser = AddedUser.findById(id);
			// if (!addedUser)
			// 	return res
			// 		.status(400)
			// 		.json({ success: false, message: "User not found" });

			// const isMatch = await bcrypt.compare(
			// 	currentPassword,
			// 	addedUser.password,
			// );

			// if (!isMatch) {
			// 	return res
			// 		.status(400)
			// 		.json({ success: false, message: "incorrect_password" });
			// }

			// const passwordValid = validatePassword(newPassword);
			// if (!passwordValid) {
			// 	return res
			// 		.status(400)
			// 		.json({
			// 			success: false,
			// 			message: "Password does not meet the criteria.",
			// 		});
			// }

			// const hashedPassword = await bcrypt.hash(newPassword, 10);

			// addedUser.password = hashedPassword;
			// addedUser.save();

			// await ActivityLogs.create({
			// 	useradmin: req.session.user.id,
			// 	unique_id: generateUniqueId(),
			// 	name: req.session.user.name
			// 		? req.session.user.name
			// 		: req.session.addedUser.name,
			// 	actions: "Update",
			// 	details: `${req.addedUser.name} updated their password`,
			// });
		}

		const isMatch = await bcrypt.compare(currentPassword, user.password);

		if (!isMatch) {
			return res
				.status(400)
				.json({ success: false, message: "incorrect_password" });
		}

		const passwordValid = validatePassword(newPassword);
		if (!passwordValid) {
			return res.status(400).json({
				success: false,
				message: "Password does not meet the criteria.",
			});
		}

		const hashedPassword = await bcrypt.hash(newPassword, 10);
		user.password = hashedPassword;

		await user.save();

		await ActivityLogs.create({
			useradmin: req.session.user.id,
			unique_id: generateUniqueId(),
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Updated their password`,
		});

		if (logoutDevices) {
			req.session.user = null;
			res.render("login");
		} else {
			return res
				.status(200)
				.json({ message: "Password updated successfully" });
		}
	} catch (error) {
		console.log(error);
		res.status(500).json({ success: false, message: error });
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
			photo: req.session.user?.photo,
			name: req.session.user.name,
			color: req.session.user.color,
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

		await ActivityLogs.create({
			useradmin: req.session.user.id,
			unique_id: generateUniqueId(),
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Updated their account details`,
		});

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
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const logs = await ActivityLogs.find({
			useradmin: id,
		}).sort({ createdAt: -1 });

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
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const id = req.session?.user?.id;
			const access = await User.findOne({ unique_id: id });
			console.log(access.access);
			res.render("Settings/activityLogs", {
				access: access.access,
				logs,
				photo: req.session.user?.photo,
				name: req.session.user?.name,
				color: req.session.user?.color,
			});
		}
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.render("errors/serverError");
	}
};

export const activityLogsFiltered = async (req, res) => {
	const { action, dateRange } = req.query;
	let filter = {};

	filter.useradmin = req.session.user.id;
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
				startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
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

	try {
		const logs = await ActivityLogs.find(filter).sort({ createdAt: -1 });
		// console.log(logs);
		res.render("Settings/partials/activityLogs", {
			logs,
			photo: req.session.user?.photo,
			name: req.session.user.name,
		});
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.status(500).send("Server error");
	}
};

export const getUserManagement = async (req, res) => {
	const id = req.session?.user?.id || req.session?.addedUser?.owner;
	try {
		let users = await AddedUser.find({ useradmin: id });
		const permissions = await Permissions.find({ useradmin: id });
		users = users ? users : [];

		const permission = req.session?.addedUser?.permissions;
		if (permission) {
			const access = await Permissions.findOne({ unique_id: permission });
			if (access.settings.userManagement) {
				res.render("Settings/userManagement", {
					users,
					permissions,
					id,
					photo: req.session.user?.photo,
					name: req.session.user.name,
					color: req.session.user.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: id });
			console.log(access.access);
			res.render("Settings/userManagement", {
				users,
				permissions,
				id,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			message: "An error occurred while fetching the user profile",
		});
	}
};

export const getCreatePassword = async (req, res) => {
	res.render("Settings/createAddedUserPassword");
};

export const sendUserInvitation = async (req, res) => {
	try {
		const adminId = req.session.user.id;

		let { name, email, roleId, roleName, url } = req.body;

		// Check if the user already exists in the User collection
		let exists = await User.findOne({ email });
		if (exists) {
			res.status(409).json({ message: "Email already in use" }); // return to stop execution
		}

		// Check if the user already exists in the AddedUser collection
		exists = await AddedUser.findOne({ email });
		if (exists) {
			res.status(409).json({ message: "Email already in use" }); // return to stop execution
		}

		// If user does not exist, create a new entry
		const newUser = new AddedUser({
			unique_id: generateUniqueId(),
			name,
			email,
			roleId,
			roleName,
			useradmin: adminId,
			color: getRandomColor(),
		});
		console.log("user added");
		// Generate unique invitation link
		const invitationToken = Buffer.from(
			`${adminId}:${newUser.unique_id}`,
		).toString("base64");
		const invitationLink = `${url}/settings/user-management/create-password?token=${invitationToken}`;

		// Send invitation email
		await sendAddUserMail(req.session.user.name, invitationLink, email);
		console.log("email sent");
		await ActivityLogs.create({
			useradmin: req.session.user.id,
			unique_id: generateUniqueId(),
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
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
		res.status(500).json({ message: "Failed to send invitation" });
	}
};

export const getPermissions = async (req, res) => {
	if (req.session?.user) {
		res.render("Settings/permissions", {
			photo: req.session?.user?.photo,
			name: req.session?.user.name,
			color: req.session?.user.color,
		});
	} else {
		res.render("Settings/permissions", {
			photo: req.session?.addedUser?.photo,
			name: req.session?.addedUser?.name,
			color: req.session?.addedUser?.color,
		});
	}
};

export const createPermissions = async (req, res) => {
	try {
		const unique_id = generateUniqueId();
		const useradmin = req.session.user.id;

		const { name, permissions } = req.body;

		// Check if a role with the same name already exists
		const existingRole = await Permissions.findOne({ useradmin, name });
		if (existingRole) {
			return res
				.status(400)
				.json({ message: "Role with this name already exists" });
		}
		console.log(permissions);
		// Create a new role with permissions
		const newRole = new Permissions({
			useradmin,
			name,
			unique_id,
			dashboard: {
				connectNow: permissions.dashboard.connectNow,
				viewUsers: permissions.dashboard.viewUsers,
				quickActions: permissions.dashboard.quickActions,
			},
			chats: {
				type: permissions.chats.type,
				redirectToVpchat: permissions.chats.redirectToVpchat,
			},
			contactList: {
				type: permissions.contactList.type,
				addContactIndividual:
					permissions.contactList.addContactIndividual,
				addContactListCSV: permissions.contactList.addContactListCSV,
				deleteList: permissions.contactList.deleteList,
				sendBroadcast: permissions.contactList.sendBroadcast,
				customField: {
					type: permissions.contactList.customField.type,
					view: permissions.contactList.customField.view,
					add: permissions.contactList.customField.add,
				},
			},
			templates: {
				type: permissions.templates.type,
				editTemplate: permissions.templates.editTemplate,
				createTemplate: permissions.templates.createTemplate,
				deleteTemplate: permissions.templates.deleteTemplate,
			},
			reports: {
				type: permissions.reports.type,
				conversationReports: {
					type: permissions.reports.conversationReports.type,
					viewReports:
						permissions.reports.conversationReports.viewReports,
					retargetingUsers:
						permissions.reports.conversationReports
							.retargetingUsers,
					redirectToVpchat:
						permissions.reports.conversationReports
							.redirectToVpchat,
				},
				costReports: permissions.reports.costReports,
			},
			settings: {
				type: permissions.settings.type,
				userManagement: permissions.settings.userManagement,
				activityLogs: permissions.settings.activityLogs,
				manageTags: {
					type: permissions.settings.manageTags.type,
					delete: permissions.settings.manageTags.delete,
					add: permissions.settings.manageTags.add,
					view: permissions.settings.manageTags.view,
				},
			},
		});

		await ActivityLogs.create({
			useradmin: req.session.user.id,
			unique_id: generateUniqueId(),
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Create",
			details: `Created a new role`,
		});
		// Save the role
		await newRole.save();

		return res
			.status(201)
			.json({ message: "Role created successfully!", role: newRole });
	} catch (error) {
		console.error("Error creating role:", error);
		return res
			.status(500)
			.json({ message: "Failed to create role", error });
	}
};

export const createAddedUserPassword = async (req, res, next) => {
	try {
		let { password, adminId, role } = req.body;

		const data = await User.findOne({ unique_id: adminId });

		if (!data) {
			return res.json({ success: false, message: "User not found" });
		}

		const saltRounds = 10;
		password = await bcrypt.hash(password, saltRounds);

		const addedUser = await AddedUser.findOneAndUpdate(
			{ unique_id: role },
			{ password },
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

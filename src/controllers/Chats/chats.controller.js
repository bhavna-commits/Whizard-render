import dotenv from "dotenv";
import axios from "axios";
import User from "../../models/user.model.js";
import Report from "../../models/report.model.js"; // Make sure Report is imported
import { generateRefreshToken, isTokenExpired } from "./chats.functions.js";

dotenv.config();

let storedTokens = {};

export const getChats = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Get user details
		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res
				.status(404)
				.render("errors/notFound", { message: "User not found" });
		}

		// Generate token and expiration time
		const { token, expiresAt } = generateRefreshToken();
		storedTokens[token] = { expiresAt, userId: id };
		// Handle permissions and render the appropriate view
		const permissions = req.session?.addedUser?.permissions;
		const renderData = {
			token,
			user,
			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
			name: req.session?.addedUser?.name || req.session?.user?.name,
			color: req.session?.addedUser?.color || req.session?.user?.color,
		};

		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.chats.type) {
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
		if (error.response) {
			console.error(
				`Error in getChats: Status ${error.response.status} - ${error.response.statusText}`,
			);
		} else {
			console.error(`Error in getChats:`, error.message);
		}
		res.render("errors/serverError");
	}
};

export const getReturnedToken = async (req, res) => {
	try {
		const token = req.body; // Token sent back as a query param

		if (!token) {
			return res
				.status(400)
				.render("errors/tokenError", { message: "Token not provided" });
		}

		const tokenData = storedTokens[token];

		if (!tokenData) {
			return res
				.status(400)
				.render("errors/tokenError", { message: "Invalid token" });
		}

		const { expiresAt, userId } = tokenData;
		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res
				.status(401)
				.render("errors/tokenError", { message: "Token has expired" });
		}

		// Fetch the latest 10 reports for the user
		const reports = await Report.find({ unique_id: userId })
			.sort({ updatedAt: -1 })
			.limit(10)
			.select("contactName recipientPhone status replyContent updatedAt");

		if (!reports || reports.length === 0) {
			return res.status(404).render("errors/notFound", {
				message: "No reports found for this user",
			});
		}

		// Format the reports based on the required format
		const formattedReports = reports.map((report) => {
			const isReplyRecent =
				report.replyContent &&
				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000; // Less than 24 hours
			return {
				lastmessage: report.replyContent || "No recent reply",
				wa_id: report.recipientPhone,
				status: isReplyRecent ? 1 : 0, // Status is 1 if replyContent is not empty and updatedAt is less than 24 hours
				name: report.contactName,
				usertimestmp: report.updatedAt,
				is_read: report.status === "READ" ? true : false, // is_read is true if the status is "READ"
			};
		});

		// Send the formatted reports data to the external frontend URL
		const externalUrl = `https://chat.viralpitch.co/api/chats/receive-reports`; // Replace with the actual endpoint
		const response = await axios.post(externalUrl, {
			reports: formattedReports,
		});

		if (response.status === 200) {
			// Reports successfully sent to the external frontend

			// const user = await User.findOne({ unique_id: userId });

			const permissions = req.session?.addedUser?.permissions;
			const renderData = {
				photo:
					req.session?.addedUser?.photo || req.session?.user?.photo,
				name: req.session?.addedUser?.name || req.session?.user?.name,
				color:
					req.session?.addedUser?.color || req.session?.user?.color,
			};

			// Handle permissions and render the appropriate view
			if (permissions) {
				const access = await Permissions.findOne({
					unique_id: permissions,
				});
				if (access.chats.type) {
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
		} else {
			// Handle case where external site couldn't process the data
			res.status(500).render("errors/serverError", {
				message: "Failed to send reports to external site",
			});
		}
	} catch (error) {
		console.error("Error in getReturnedToken:", error);
		res.render("errors/serverError");
	}
};

export const getMoreReports = async (req, res) => {
	try {
		const token = req.query.token;
		const skip = parseInt(req.query.skip, 10) || 0;
		const limit = 10;

		if (!token) {
			return res.status(400).json({ message: "Token not provided" });
		}

		const tokenData = storedTokens[token];

		if (!tokenData) {
			return res.status(400).json({ message: "Invalid token" });
		}

		const { expiresAt, userId } = tokenData;

		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res.status(401).json({ message: "Token has expired" });
		}

		// Fetch the next set of reports (pagination)
		const reports = await Report.find({ unique_id: userId })
			.sort({ updatedAt: -1 }) // Sort by updatedAt (latest first)
			.skip(skip) // Skip records for pagination
			.limit(limit) // Limit to the next batch (10 reports)
			.select("contactName recipientPhone status replyContent updatedAt"); // Select necessary fields

		if (!reports || reports.length === 0) {
			return res
				.status(404)
				.json({ message: "No more reports found for this user" });
		}

		// Format the reports in the required format
		const formattedReports = reports.map((report) => {
			const isReplyRecent =
				report.replyContent &&
				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000; // Less than 24 hours
			return {
				lastmessage: report.replyContent || "No recent reply",
				wa_id: report.recipientPhone,
				status: isReplyRecent ? 1 : 0, // status is 1 if replyContent is not empty and updatedAt is less than 24 hours
				name: report.contactName,
				usertimestmp: report.updatedAt,
				is_read: report.status === "READ" ? true : false, // is_read is true if the status is "READ"
			};
		});

		// Send the formatted reports as JSON for pagination or infinite scroll
		res.json({ reports: formattedReports });
	} catch (error) {
		console.error("Error in getMoreReports:", error);
		res.status(500).json({ message: "Server error" });
	}
};

import dotenv from "dotenv";
import User from "../../models/user.model.js";
import Report from "../../models/report.model.js"; // Make sure Report is imported
import { generateRefreshToken, isTokenExpired } from "./chats.functions.js";
import {
	setToken,
	getToken,
	getStoredTokens,
	saveStoredTokens,
} from "./chats.token.js";
import { createChatsComponents } from "../Templates/template.functions.controller.js";
import { isNumber, isString } from "../../middleWares/sanitiseInput.js";
import Campaign from "../../models/campaign.model.js";
import Template from "../../models/templates.model.js";

dotenv.config();

export const getSetToken = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		// Generate token and expiration time
		const { token, expiresAt } = generateRefreshToken();
		setToken(token, expiresAt, id); // Store the token using the new function

		// Handle permissions and render the appropriate view
		const permissions = req.session?.addedUser?.permissions;
		const renderData = {
			token,
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
				unique_id: id,
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

export const getMoreUsers = async (req, res, next) => {
	try {
		const token = req.body.token;
		const skip = parseInt(req.body.skip, 10) || 0;
		const limit = 10;

		if (!token || !skip) {
			return res
				.status(400)
				.json({ message: "Token not provided or skip not provided" });
		}

		if (!isString(token)) return next();
		if (!isNumber(skip)) return next();

		const tokenData = getToken(token); // Retrieve token data using the new function

		if (!tokenData) {
			return res
				.status(400)
				.json({ message: "Invalid token", success: false });
		}

		const { expiresAt, userId } = tokenData;
		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res
				.status(400)
				.json({ message: "Token has expired", success: false });
		}

		// Fetch the latest 10 reports for the user
		const reports = await Report.find({ useradmin: userId })
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit)
			.select("contactName recipientPhone status replyContent updatedAt");

		if (!reports || reports.length == 0) {
			return res.status(200).json({
				msg: [],
				success: true,
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

		res.status(200).json({ msg: formattedReports, success: true });
	} catch (error) {
		console.error("Error in getReturnedToken:", error);
		res.status(400).json({ message: error, success: false });
	}
};

export const getUsers = async (req, res, next) => {
	try {
		const token = req.body.token;

		if (!token) {
			return res
				.status(400)
				.json({ message: "Token not provided", success: false });
		}

		if (!isString(token)) return next();

		const tokenData = getToken(token); // Retrieve token data using the new function

		if (!tokenData) {
			return res
				.status(400)
				.json({ message: "Invalid token", success: false });
		}

		const { expiresAt, userId } = tokenData;
		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res
				.status(400)
				.json({ message: "Token has expired", success: false });
		}

		// Fetch the latest 10 reports for the user
		const reports = await Report.find({ useradmin: userId })
			.sort({ updatedAt: -1 })
			.limit(10)
			.select("contactName recipientPhone status replyContent updatedAt");

		if (!reports || reports.length == 0) {
			return res.status(400).json({
				message: "No reports found for this user",
				success: false,
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

		res.status(200).json({ msg: formattedReports, success: true });
	} catch (error) {
		console.error("Error in getReturnedToken:", error);
		res.status(400).json({ message: error, success: false });
	}
};

export const getMoreChats = async (req, res, next) => {
	try {
		const token = req.body?.token;
		const wa_id = req.body?.wa_id;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const limit = 10;

		if (!token || !skip) {
			return res
				.status(400)
				.json({ message: "Token not provided or skip not provided" });
		}

		if (!isString(token)) return next();
		if (!isNumber(skip)) return next();

		const tokenData = getToken(token);

		if (!tokenData) {
			return res.status(400).json({ message: "Invalid token" });
		}

		const { expiresAt, userId } = tokenData;

		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res.status(401).json({ message: "Token has expired" });
		}

		// Fetch the next set of reports (pagination)
		const reports = await Report.find({
			useradmin: userId,
			recipientPhone: wa_id,
		})
			.sort({ updatedAt: -1 }) // Sort by updatedAt (latest first)
			.skip(skip) // Skip records for pagination
			.limit(limit) // Limit to the next batch (10 reports)
			.select("contactName recipientPhone status replyContent updatedAt"); // Select necessary fields

		if (!reports || reports.length == 0) {
			return res.status(200).json({ chats: [], success: true });
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
		res.status(200).json({ chats: formattedReports, success: true });
	} catch (error) {
		console.error("Error in getMoreReports:", error);
		res.status(500).json({ message: error, success: false });
	}
};

export const getRefreshToken = async (req, res, next) => {
	try {
		const oldToken = req.body.token;

		if (!oldToken) {
			return res
				.status(400)
				.json({ message: "Token not provided", success: false });
		}

		if (!isString(oldToken)) return next();

		const tokenData = getToken(oldToken);

		// console.log(tokenData);

		if (!tokenData) {
			return res
				.status(400)
				.json({ message: "Invalid token", success: false });
		}

		const { expiresAt, userId } = tokenData;
		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			// Token has expired; generate a new token
			const { token: newToken, expiresAt: newExpiresAt } =
				generateRefreshToken();

			// Store the new token and remove the old one
			setToken(newToken, newExpiresAt, userId);

			// Optionally, remove the old token from the token store
			// This part can be skipped if you want to allow multiple valid tokens at the same time
			const tokens = getStoredTokens();
			delete tokens[oldToken];
			saveStoredTokens(tokens);

			return res.status(200).json({
				message: "Token refreshed successfully",
				token: newToken,
				expiresAt: newExpiresAt,
				success: true,
			});
		} else {
			return res
				.status(400)
				.json({ message: "Token is still valid", success: false });
		}
	} catch (error) {
		console.error("Error in getRefreshToken:", error);
		res.status(500).json({
			message: error,
			success: false,
		});
	}
};

export const getSingleChat = async (req, res, next) => {
	try {
		// Destructure token and wa_id from request body
		const { token, wa_id } = req.body;

		if (!token || !wa_id)
			return res.status(404).json({
				success: false,
				message: "All values not provided",
			});

		if (!isString(token, wa_id))
			// Validate that token and wa_id are strings
			return next();

		const tokenData = getToken(token);

		if (!tokenData) {
			return res.status(400).json({ message: "Invalid token" });
		}

		const { expiresAt, userId } = tokenData;

		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res.status(401).json({ message: "Token has expired" });
		}

		// Find the campaign by recipientPhone (using wa_id)
		const report = await Report.findOne({
			recipientPhone: wa_id,
			useradmin: userId,
		});
		// console.log(report)
		if (!report)
			return res.status(404).json({
				success: false,
				message: "Report not found",
			});

		const campaign = await Campaign.findOne({
			unique_id: report.campaignId,
		});

		if (!campaign)
			return res.status(404).json({
				success: false,
				message: "Campaign not found",
			});

		// Find the template using the campaign's templateId
		const template = await Template.findOne({
			unique_id: campaign.templateId,
		});
		if (!template)
			return res.status(404).json({
				success: false,
				message: "Template not found",
			});

		// Assume report contains dynamic variables for substitution (if not, use an empty object)
		const dynamicVariables = report.dynamicVariables || {};

		// console.log(template.components);

		// Build the components using the template's component data and dynamic variables
		const components = createChatsComponents(
			template.components,
			dynamicVariables,
		);

		// Format each component into the required chat object structure.
		// Note: Adjust field mappings based on your actual schema.
		const formattedChats = components.map((comp, index) => {
			let media_message = { link: "", caption: "" };
			let media_type = "text";

			// Only for HEADER components, check for media type by format
			if (comp.type === "HEADER") {
				if (comp.format === "IMAGE") {
					media_message = {
						link: comp.example.header_url[0] || "",
						caption: comp.text || "",
					};
					media_type = "image";
				} else if (comp.format === "VIDEO") {
					media_message = {
						link: comp.example.header_url[0] || "",
						caption: comp.text || "",
					};
					media_type = "video";
				} else if (comp.format === "DOCUMENT") {
					media_message = {
						link: comp.example.header_url[0] || "",
						caption: comp.text || "",
					};
					media_type = "document";
				}
			}

			return {
				media_message,
				media_type,
				cmpid: index,
				wa_idK: report?.wa_idK || "",
				keyId: report?.keyId || "",
				mId: report?.messageId || "",
				name: report.contactName || "user",
				wa_id: wa_id,
				from: wa_id,
				text: comp.type == "BODY" ? comp.text : "" || "",
				timestamp: report.updatedAt,
				type: "text",
				recive:
					report.status == "REPLIED" ? "recive" : "send" || "send",
				status:
					report.status == "REPLIED" ? "recive" : "send" || "send",
			};
		});

		return res.status(200).json({ success: true, chats: formattedChats });
	} catch (error) {
		console.error("Error in getSingleChat:", error);
		return res.status(500).json({ success: false, message: error });
	}
};

export const searchUsers = async (req, res, next) => {
	try {
		const token = req.body?.token;
		const search = req.body?.search;

		if (!token || !search) {
			return res.status(400).json({
				message: "Token not provided or search is empty",
				success: false,
			});
		}

		if (!isString(token, search)) return next();

		const tokenData = getToken(token); // Retrieve token data using the new function

		if (!tokenData) {
			return res
				.status(400)
				.json({ message: "Invalid token", success: false });
		}

		const { expiresAt, userId } = tokenData;
		const isValid = !isTokenExpired(expiresAt);

		if (!isValid) {
			return res
				.status(400)
				.json({ message: "Token has expired", success: false });
		}

		// Modify the query to allow searching by contact name or phone number using the 'search' parameter
		const reports = await Report.find({
			useradmin: userId,
			$or: [
				{ contactName: { $regex: search, $options: "imsx" } },
				{ recipientPhone: { $regex: search, $options: "imsx" } },
			],
		})
			.sort({ updatedAt: -1 })
			.limit(10)
			.select("contactName recipientPhone status replyContent updatedAt");

		if (!reports || reports.length === 0) {
			return res.status(400).json({
				message: "No matching reports found for the search criteria",
				success: false,
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

		res.status(200).json({ msg: formattedReports, success: true });
	} catch (error) {
		console.error("Error in searchUsers:", error);
		res.status(400).json({ message: error, success: false });
	}
};

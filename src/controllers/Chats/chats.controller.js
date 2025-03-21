import fs from "fs";
import ejs from "ejs";
import path from "path";
import { Buffer } from "buffer";
import dotenv from "dotenv";
import User from "../../models/user.model.js";
import Report from "../../models/chats.model.js";
import Campaign from "../../models/campaign.model.js";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import { uploadMedia, sendMessage, getMediaUrl } from "./chats.functions.js";
// import {
// 	setToken,
// 	getToken,
// 	getStoredTokens,
// 	saveStoredTokens,
// 	validateToken,
// 	generateRefreshToken,
// 	isTokenExpired,
// } from "./chats.token.js";
import {
	checkToken,
	createTokenRecord,
	getUserIdFromToken,
} from "./chats.newToken.js";
import {
	fetchAndFormatReports,
	createTextPayload,
	createImagePayload,
	createVideoPayload,
	createDocumentPayload,
	processTemplateReport,
	processMediaReport,
	processTextReport,
	generateChatTemplate,
	buildCommonChatFields,
} from "./chats.extra.functions.js";
import {
	isNumber,
	isObject,
	isString,
} from "../../middleWares/sanitiseInput.js";

import { generateUniqueId } from "../../utils/otpGenerator.js";
import { sendTestMessage } from "../ContactList/campaign.functions.js";

dotenv.config();

const __dirname = path.resolve();

export const getSetToken = async (req, res) => {
	try {
		// Get the user's unique ID from the session
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUser = req.session?.addedUser;
		const permissions = req.session?.addedUser?.permissions;
		let permissionValue, accessData;

		// Check if user has permissions via addedUser
		if (permissions) {
			accessData = await Permissions.findOne({ unique_id: permissions });
			if (!accessData || !accessData.chats?.view) {
				return res.render("errors/notAllowed");
			}
			// Use the specific permission for chats from the Permissions model
			permissionValue = accessData.chats.chat;
		} else {
			// Otherwise, fetch the user's access details
			accessData = await User.findOne({ unique_id: id });
			permissionValue = accessData.access.chats.chat;
		}

		// Create a new token record in the database
		const tokenRecord = await createTokenRecord(
			id,
			permissionValue,
			addedUser,
		);

		// Prepare data for rendering
		const renderData = {
			token: tokenRecord.token,
			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
			name: req.session?.addedUser?.name || req.session?.user?.name,
			color: req.session?.addedUser?.color || req.session?.user?.color,
			access: permissions ? accessData : accessData.access,
		};

		res.render("Chats/chats", renderData);
	} catch (error) {
		if (error.response) {
			console.error(
				`Error in getSetToken: Status ${error.response.status} - ${error.response.statusText}`,
			);
		} else {
			console.error(`Error in getSetToken:`, error.message);
		}
		res.render("errors/serverError");
	}
};

// -------------------------------------------------------------------------
// getUsers – Now using token validation to get the userId
export const getUsers = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		const skip = parseInt(req.body?.skip, 10) || 0;
		if (!isNumber(skip)) return next();

		// Find the user using the decoded userId.
		const user = await User.findOne({ unique_id: userId });
		if (!user) {
			return res
				.status(404)
				.json({ message: "User not found", success: false });
		}
		const phoneNumber = user.FB_PHONE_NUMBERS.find(
			(d) => d.selected == true,
		);
		if (!phoneNumber) {
			return res.status(400).json({
				message: "No phone number found for this user",
				success: false,
			});
		}

		const formattedReports = await fetchAndFormatReports(
			userId,
			phoneNumber.phone_number_id,
			skip,
		);

		if (formattedReports.length == 0) {
			return res.status(404).json({
				message: "No Reports Found",
				success: false,
			});
		}

		res.status(200).json({
			msg: formattedReports.reverse(),
			success: true,
			phoneNumber,
			token, // return the refreshed token
		});
	} catch (error) {
		console.error("Error in getUsers:", error);
		res.status(400).json({ message: error.message, success: false });
	}
};

// -------------------------------------------------------------------------
// getMoreUsers – Using token from req.body.token
export const getMoreUsers = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		const phoneNumberId = req.body?.phoneNumberId;
		const skip = parseInt(req.body?.skip, 10) || 0;

		if (!phoneNumberId) {
			return res
				.status(400)
				.json({ message: "Phone number ID not provided" });
		}

		if (!isString(phoneNumberId)) return next();
		if (!isNumber(skip)) return next();

		const formattedReports = await fetchAndFormatReports(
			userId,
			phoneNumberId,
			skip,
		);

		res.status(200).json({
			msg: formattedReports.reverse(),
			success: true,
			token,
		});
	} catch (error) {
		console.error("Error in getMoreUsers:", error);
		res.status(400).json({ message: error.message, success: false });
	}
};

// -------------------------------------------------------------------------
// getMoreChats – Using token from req.body.token
export const getMoreChats = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		const wa_id = req.body?.wa_id;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const limit = 10;

		if (!wa_id) {
			return res.status(400).json({ message: "All values not provided" });
		}

		if (!isString(wa_id)) return next();
		if (!isNumber(skip)) return next();

		const reports = await Report.find({
			useradmin: userId,
			recipientPhone: wa_id,
		})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		if (!reports || reports.length === 0) {
			return res.status(200).json({ chats: [], success: true });
		}

		const formattedReports = reports.map((report) => {
			const isReplyRecent =
				report.replyContent &&
				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000;
			return {
				lastmessage: report.replyContent || "No recent reply",
				wa_id: report.recipientPhone,
				status: isReplyRecent ? 1 : 0,
				name: report.contactName,
				usertimestmp: report.updatedAt,
				is_read: report.status === "READ" ? true : false,
			};
		});

		res.status(200).json({
			chats: formattedReports.reverse(),
			success: true,
			token,
		});
	} catch (error) {
		console.error("Error in getMoreChats:", error);
		res.status(500).json({ message: error.message, success: false });
	}
};

// -------------------------------------------------------------------------
// getRefreshToken – Now using token from req.body.token for refresh
export const getRefreshToken = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, addedUser, token } = await getUserIdFromToken(oldToken);

		// Determine permissions (this may use additional info from tokenData or user lookup)
		// In your system, you may retrieve additional user/permission data as needed.
		let permissionValue, accessData;

		if (addedUser && addedUser.permissions) {
			accessData = await Permissions.findOne({
				unique_id: addedUser.permissions,
			});
			if (!accessData || !accessData.chats?.view) {
				return res.render("errors/notAllowed");
			}
			permissionValue = accessData.chats.chat;
		} else {
			accessData = await User.findOne({ unique_id: userId });
			permissionValue = accessData.access.chats.chat;
		}

		res.status(200).json({
			message: "Token refreshed successfully",
			token: token,
			success: true,
			permission: permissionValue,
		});
	} catch (error) {
		console.error("Error in getRefreshToken:", error);
		res.status(500).json({
			message: error.message || error,
			success: false,
		});
	}
};

// -------------------------------------------------------------------------
// getSingleChat – Using token from req.body.token
export const getSingleChat = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, permission, token } = await getUserIdFromToken(
			oldToken,
		);

		const wa_id = req.body?.wa_id;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const limit = 10;

		if (!wa_id) {
			return res.status(400).json({ message: "All values not provided" });
		}

		if (!isString(wa_id)) return next();
		if (!isNumber(skip)) return next();

		const reports = await Report.find({
			useradmin: userId,
			recipientPhone: wa_id,
		})
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit);

		if (!reports || reports.length == 0) {
			return res.status(200).json({ chats: [], success: true });
		}

		let formattedChats = [];
		for (const reportItem of reports) {
			let chatsForReport = "";
			if (
				reportItem.type == "Template" ||
				reportItem.type == "Campaign"
			) {
				chatsForReport = buildCommonChatFields(reportItem, wa_id, {
					components: reportItem.components,
				});
				// console.log(chatsForReport);
			} else {
				if (reportItem.media_type) {
					chatsForReport = processMediaReport(reportItem, wa_id);
				} else if (reportItem.textSent || reportItem.replyContent) {
					chatsForReport = processTextReport(reportItem, wa_id);
				}
			}
			formattedChats.push(chatsForReport);
		}

		return res.status(200).json({
			success: true,
			chats: formattedChats.reverse(),
			permission,
			token,
		});
	} catch (error) {
		console.error("Error in getSingleChat:", error);
		return res
			.status(500)
			.json({ success: false, message: error.message || error });
	}
};

// -------------------------------------------------------------------------
// searchUsers – Using token from req.body.token
export const searchUsers = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		const search = req.body?.search;
		const phoneNumberId = req.body?.phoneNumberId;
		if (!search) {
			return res.status(400).json({
				message: "Search term not provided",
				success: false,
			});
		}
		if (!isString(search)) return next();

		const reports = await Report.find({
			useradmin: userId,
			FB_PHONE_ID: phoneNumberId,
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

		const formattedReports = reports.map((report) => {
			const isReplyRecent =
				report.replyContent &&
				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000;
			return {
				lastmessage: report.replyContent || "No recent reply",
				wa_id: report.recipientPhone,
				status: isReplyRecent ? 1 : 0,
				name: report.contactName,
				usertimestmp: report.updatedAt,
				is_read: report.status === "READ" ? true : false,
			};
		});

		res.status(200).json({ msg: formattedReports, success: true, token });
	} catch (error) {
		console.error("Error in searchUsers:", error);
		res.status(400).json({ message: error.message, success: false });
	}
};

// -------------------------------------------------------------------------
// sendMessages – Using token from req.body.token
export const sendMessages = async (req, res, next) => {
	try {
		const { messages, fileByteCode, fileName } = req.body;
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		if (!messages) {
			return res.status(400).json({
				message: "All data not provided",
				success: false,
			});
		}
		if (!isObject(messages)) return next();

		const user = await User.findOne({ unique_id: userId });

		const accessToken = user.FB_ACCESS_TOKEN;

		const mediaMessages = ["image", "video", "document"].includes(
			messages.mediatype,
		);

		let tempFilePath = "";
		let url = "";
		if (mediaMessages && fileByteCode) {
			const tempDir = path.join(__dirname, "uploads", userId);
			tempFilePath = path.join(tempDir, fileName);
			url = `https://whizard.onrender.com/uploads/${userId}/${fileName}`;
			fs.mkdirSync(tempDir, { recursive: true });
			fs.writeFileSync(tempFilePath, Buffer.from(fileByteCode, "base64"));
		}

		const {
			from,
			to,
			mediatype,
			message: messageText,
			caption,
			campaignId,
			name,
		} = messages;

		const campaign = await Campaign.findOne({
			unique_id: campaignId,
		});
		if (!campaign)
			return res.status(404).json({
				success: false,
				message: "Campaign not found",
			});

		let mediaId = "";
		let payload;
		switch (mediatype) {
			case "image":
			case "video":
			case "document":
				if (!tempFilePath) {
					throw new Error("Missing media file for media message");
				}
				mediaId = await uploadMedia(
					accessToken,
					from,
					tempFilePath,
					mediatype,
					fileName,
				);
				if (mediatype === "image") {
					payload = createImagePayload(to, mediaId, caption);
				} else if (mediatype === "video") {
					payload = createVideoPayload(to, mediaId, caption);
				} else {
					payload = createDocumentPayload(
						to,
						mediaId,
						fileName,
						caption,
					);
				}
				break;
			default:
				payload = createTextPayload(to, messageText);
		}

		const data = await sendMessage(accessToken, from, payload);
		res.status(200).json({
			message: "Message sent successfully",
			success: true,
			token,
		});

		const report = new Report({
			WABA_ID: user.WABA_ID,
			FB_PHONE_ID: from,
			useradmin: user.unique_id,
			unique_id: generateUniqueId(),
			campaignName: campaign.name,
			campaignId: campaign.unique_id,
			contactName: name,
			recipientPhone: to,
			status: "SENT",
			messageId: data.messages[0].id,
			textSent: messageText,
			media: { url, fileName, caption },
			type: "Chat",
		});
		await report.save();

		const letName = addedUser?.name ? addedUser.name : user.name;

		await ActivityLogs.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			name: letName,
			actions: "Send",
			details: `Sent message from chats to: ${name}`,
		});
	} catch (err) {
		console.error("Error sending message:", err);
		res.status(500).json({
			message: err.message,
			success: false,
		});
	}
};

// -------------------------------------------------------------------------
// getSendTemplate – Using token from req.query.token
export const getSendTemplate = async (req, res, next) => {
	try {
		const { wa_id, token: oldToken } = req.query;

		if (!wa_id || !oldToken) {
			return res.status(400).json({ message: "All data not provided" });
		}
		if (!isString(wa_id)) return next();

		const { userId } = await getUserIdFromToken(oldToken);

		const contactData = await Contacts.findOne({
			useradmin: userId,
			wa_id,
		});

		if (!contactData) {
			return res.status(404).json({ message: "Contact not found" });
		}

		const data = { ...contactData.toObject() };

		res.status(200).render("Chats/sendTemplate", { data, userId });
	} catch (err) {
		console.error("Error getting send template:", err);
		res.status(500).render("errors/chatsError");
	}
};

// -------------------------------------------------------------------------
// getAllTemplates – Unchanged (except token not used)
export const getAllTemplates = async (req, res, next) => {
	try {
		// const { userId, token } = getUserIdFromToken(req, res, next);

		const id = req.params?.id;
		if (!isString(id)) return next();
		const updatedTemplates = await Template.find({
			useradmin: id,
			deleted: { $ne: true },
			status: "Approved",
		}).sort({ createdAt: -1 });
		res.json({
			success: true,
			data: updatedTemplates,
			token,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// -------------------------------------------------------------------------
// getSingleTemplate – Unchanged (except token not used)
export const getSingleTemplate = async (req, res, next) => {
	try {
		// const { userId } = getUserIdFromToken(req, res, next);

		const id = req.params?.id;
		if (!isString(id)) return next();
		const updatedTemplate = await Template.findOne({
			unique_id: id,
			deleted: { $ne: true },
			status: "Approved",
		});
		res.json(updatedTemplate);
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message,
		});
	}
};

// -------------------------------------------------------------------------
// sendTemplate – Using token from req.body.token
export const sendTemplate = async (req, res, next) => {
	try {
		let { templateId, contactListId, variables, contactList, token: oldToken } =
			req.body;

		if (
			!templateId ||
			!contactListId ||
			!variables ||
			!contactList ||
			!oldToken
		) {
			return res.status(400).json({
				message: "All Data not provided",
			});
		}

		if (!isString(templateId, contactListId, oldToken)) return next();

		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;

		const { userId } = await getUserIdFromToken(oldToken);

		let user = await User.findOne({ unique_id: userId });

		const phone_number = user.FB_PHONE_NUMBERS.find(
			(n) => n.selected == true,
		)?.phone_number_id;

		if (!phone_number) {
			throw new Error("No phone number selected.");
		}

		const { data, messageTemplate, components, templatename } =
			await sendTestMessage(
				user,
				templateId,
				variables,
				contactListId,
				contactList[0]?.recipientPhone,
				phone_number,
			);

		let campaign = await Campaign.findOne({ contactListId }).sort({
			createdAt: -1,
		});

		const report = new Report({
			WABA_ID: user.WABA_ID,
			FB_PHONE_ID: phone_number,
			useradmin: user.unique_id,
			unique_id: generateUniqueId(),
			campaignName: campaign.name,
			campaignId: campaign.unique_id,
			contactName: contactList[0]?.contactName,
			recipientPhone: contactList[0]?.recipientPhone,
			status: "SENT",
			messageId: data.messages[0].id,
			messageTemplate,
			templateId,
			components,
			templatename,
			type: "Template",
		});

		await report.save();

		const name = addedUser?.name ? addedUser.name : user.name;

		await ActivityLogs.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			name,
			actions: "Send",
			details: `Sent message template from chats to: ${contactList[0]?.contactName}`,
		});

		res.status(201).json({
			message: "Template sent successfully",
			success: true,
		});
	} catch (error) {
		console.error("Error creating campaign:", error.message);
		res.status(500).json({
			message: `Error creating campaign: ${error.message}`,
		});
	}
};

// OLD (using token from req.body)
// const token = req.body?.token;
// if (!token) {
//   return res.status(400).json({ message: "Token not provided" });
// }
// if (!isString(token)) return next();
// let
// try {
//   tokenData = validateToken(token);
// } catch (err) {
//   return res.status(400).json({ success: false, message: err || "Token error" });
// }
// const { userId } = tokenData;
// // export const getSetToken = async (req, res) => {
// 	try {
// 		const id = req.session?.user?.id || req.session?.addedUser?.owner;
// 		const addedUser = req.session?.addedUser;
// 		// Generate token and expiration time
// 		const { token, expiresAt } = generateRefreshToken();

// 		// Handle permissions and render the appropriate view
// 		const permissions = req.session?.addedUser?.permissions;
// 		const renderData = {
// 			token,
// 			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
// 			name: req.session?.addedUser?.name || req.session?.user?.name,
// 			color: req.session?.addedUser?.color || req.session?.user?.color,
// 		};

// 		if (permissions) {
// 			const access = await Permissions.findOne({
// 				unique_id: permissions,
// 			});
// 			if (access.chats.view) {
// 				setToken(token, expiresAt, id, addedUser, access.chats.chat);
// 				renderData.access = access;
// 				res.render("Chats/chats", renderData);
// 			} else {
// 				res.render("errors/notAllowed");
// 			}
// 		} else {
// 			const access = await User.findOne({
// 				unique_id: id,
// 			});
// 			setToken(token, expiresAt, id, addedUser, access.access.chats.chat);
// 			renderData.access = access.access;
// 			res.render("Chats/chats", renderData);
// 		}
// 	} catch (error) {
// 		if (error.response) {
// 			console.error(
// 				`Error in getChats: Status ${error.response.status} - ${error.response.statusText}`,
// 			);
// 		} else {
// 			console.error(`Error in getChats:`, error.message);
// 		}
// 		res.render("errors/serverError");
// 	}
// };

// export const getUsers = async (req, res, next) => {
// 	try {
// 		const token = req.body?.token;

// 		if (!token) {
// 			return res.status(400).json({ message: "Token not provided" });
// 		}

// 		if (!isString(token)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(400).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}
// 		const { userId } = tokenData;

// 		const user = await User.findOne({ unique_id: userId });
// 		const phoneNumber = user.FB_PHONE_NUMBERS.find(
// 			(d) => d.selected === true,
// 		);

// 		if (!phoneNumber) {
// 			return res.status(400).json({
// 				message: "No phone number found for this user",
// 				success: false,
// 			});
// 		}

// 		const formattedReports = await fetchAndFormatReports(
// 			userId,
// 			phoneNumber.phone_number_id,
// 		);

// 		if (formattedReports.length == 0) {
// 			return res.status(404).json({
// 				message: "No Reports Found",
// 				success: false,
// 			});
// 		}

// 		res.status(200).json({
// 			msg: formattedReports.reverse(),
// 			success: true,
// 			phoneNumber,
// 		});
// 	} catch (error) {
// 		console.error("Error in getUsers:", error);
// 		res.status(400).json({ message: error.message, success: false });
// 	}
// };

// export const getMoreUsers = async (req, res, next) => {
// 	try {
// 		const token = req.body?.token;
// 		const phoneNumberId = req.body?.phoneNumberId;
// 		const skip = parseInt(req.body?.skip, 10) || 0;

// 		if (!phoneNumberId) {
// 			return res
// 				.status(400)
// 				.json({ message: "Phone number ID not provided" });
// 		}

// 		if (!token || !skip) {
// 			return res.status(400).json({
// 				message: "Token not provided or skip not provided",
// 			});
// 		}

// 		if (!isString(token)) return next();
// 		if (!isNumber(skip)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(401).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}
// 		const { userId } = tokenData;
// 		const formattedReports = await fetchAndFormatReports(
// 			userId,
// 			phoneNumberId,
// 			skip,
// 		);

// 		res.status(200).json({
// 			msg: formattedReports.reverse(),
// 			success: true,
// 		});
// 	} catch (error) {
// 		console.error("Error in getMoreUsers:", error);
// 		res.status(400).json({ message: error.message, success: false });
// 	}
// };

// export const getMoreChats = async (req, res, next) => {
// 	try {
// 		const token = req.body?.token;
// 		const wa_id = req.body?.wa_id;
// 		const skip = parseInt(req.body?.skip, 10) || 0;
// 		const limit = 10;

// 		if (!token || !skip) {
// 			return res
// 				.status(400)
// 				.json({ message: "Token not provided or skip not provided" });
// 		}

// 		if (!isString(token)) return next();
// 		if (!isNumber(skip)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(401).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}
// 		const { userId } = tokenData;

// 		// Fetch the next set of reports (pagination)
// 		const reports = await Report.find({
// 			useradmin: userId,
// 			recipientPhone: wa_id,
// 		})
// 			.sort({ createdAt: -1 }) // Sort by updatedAt (latest first)
// 			.skip(skip) // Skip records for pagination
// 			.limit(limit) // Limit to the next batch (10 reports)
// 			.select("contactName recipientPhone status replyContent updatedAt"); // Select necessary fields

// 		if (!reports || reports.length == 0) {
// 			return res.status(200).json({ chats: [], success: true });
// 		}

// 		// Format the reports in the required format
// 		const formattedReports = reports.map((report) => {
// 			const isReplyRecent =
// 				report.replyContent &&
// 				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000; // Less than 24 hours
// 			return {
// 				lastmessage: report.replyContent || "No recent reply",
// 				wa_id: report.recipientPhone,
// 				status: isReplyRecent ? 1 : 0, // status is 1 if replyContent is not empty and updatedAt is less than 24 hours
// 				name: report.contactName,
// 				usertimestmp: report.updatedAt,
// 				is_read: report.status === "READ" ? true : false, // is_read is true if the status is "READ"
// 			};
// 		});

// 		// Send the formatted reports as JSON for pagination or infinite scroll
// 		res.status(200).json({
// 			chats: formattedReports.reverse(),
// 			success: true,
// 		});
// 	} catch (error) {
// 		console.error("Error in getMoreReports:", error);
// 		res.status(500).json({ message: error, success: false });
// 	}
// };

// export const getRefreshToken = async (req, res, next) => {
// 	try {
// 		const oldToken = req.body.token;

// 		if (!oldToken) {
// 			return res
// 				.status(400)
// 				.json({ message: "Token not provided", success: false });
// 		}

// 		if (!isString(oldToken)) return next();

// 		const tokenData = getToken(oldToken);

// 		if (!tokenData) {
// 			return res
// 				.status(400)
// 				.json({ message: "Invalid token", success: false });
// 		}

// 		const { expiresAt, userId } = tokenData;
// 		const isValid = !isTokenExpired(expiresAt);

// 		if (!isValid) {
// 			// Token has expired; generate a new token
// 			const { token: newToken, expiresAt: newExpiresAt } =
// 				generateRefreshToken();

// 			// Store the new token and remove the old one
// 			setToken(newToken, newExpiresAt, userId);

// 			// Optionally, remove the old token from the token store
// 			// This part can be skipped if you want to allow multiple valid tokens at the same time
// 			const tokens = getStoredTokens();
// 			delete tokens[oldToken];
// 			saveStoredTokens(tokens);

// 			return res.status(200).json({
// 				message: "Token refreshed successfully",
// 				token: newToken,
// 				expiresAt: newExpiresAt,
// 				success: true,
// 			});
// 		} else {
// 			return res
// 				.status(400)
// 				.json({ message: "Token is still valid", success: false });
// 		}
// 	} catch (error) {
// 		console.error("Error in getRefreshToken:", error);
// 		res.status(500).json({
// 			message: error,
// 			success: false,
// 		});
// 	}
// };

// export const getSingleChat = async (req, res, next) => {
// 	try {
// 		const { token, wa_id } = req.body;

// 		if (!token || !wa_id)
// 			return res.status(400).json({
// 				success: false,
// 				message: "All values are not provided",
// 			});

// 		if (!isString(token, wa_id)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(401).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}

// 		const { userId, permission } = tokenData;

// 		const reports = await Report.find({
// 			recipientPhone: wa_id,
// 			useradmin: userId,
// 		}).sort({ createdAt: -1 });

// 		if (!reports || !reports.length)
// 			return res.status(404).json({
// 				success: false,
// 				message: "No reports found",
// 			});

// 		let formattedChats = [];

// 		for (const reportItem of reports) {
// 			let chatsForReport = "";
// 			console.log(reportItem);
// 			if (reportItem.messageTemplate) {
// 				// Process template-based messages.
// 				chatsForReport = await processTemplateReport(
// 					reportItem,
// 					wa_id,
// 					reportItem.messageTemplate,
// 				);
// 			} else if (reportItem.media && reportItem.media.url) {
// 				// Process media-based messages.
// 				chatsForReport = processMediaReport(reportItem, wa_id);
// 			} else if (reportItem.textSent || reportItem.replyContent) {
// 				// Process simple text messages.
// 				chatsForReport = processTextReport(reportItem, wa_id);
// 			}
// 			formattedChats.push(chatsForReport);
// 		}

// 		return res.status(200).json({
// 			success: true,
// 			chats: formattedChats.reverse(),
// 			permission,
// 		});
// 	} catch (error) {
// 		console.error("Error in getSingleChat:", error);
// 		return res
// 			.status(500)
// 			.json({ success: false, message: error.message || error });
// 	}
// };

// export const searchUsers = async (req, res, next) => {
// 	try {
// 		const token = req.body?.token;
// 		const search = req.body?.search;
// 		const phoneNumberId = req.body?.phoneNumberId;

// 		if (!token || !search) {
// 			return res.status(400).json({
// 				message: "Token not provided or search is empty",
// 				success: false,
// 			});
// 		}

// 		if (!isString(token, search)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(401).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}
// 		const { userId } = tokenData;
// 		// Modify the query to allow searching by contact name or phone number using the 'search' parameter
// 		const reports = await Report.find({
// 			useradmin: userId,
// 			FB_PHONE_ID: phoneNumberId,
// 			$or: [
// 				{ contactName: { $regex: search, $options: "imsx" } },
// 				{ recipientPhone: { $regex: search, $options: "imsx" } },
// 			],
// 		})
// 			.sort({ updatedAt: -1 })
// 			.limit(10)
// 			.select("contactName recipientPhone status replyContent updatedAt");

// 		if (!reports || reports.length === 0) {
// 			return res.status(400).json({
// 				message: "No matching reports found for the search criteria",
// 				success: false,
// 			});
// 		}

// 		// Format the reports based on the required format
// 		const formattedReports = reports.map((report) => {
// 			const isReplyRecent =
// 				report.replyContent &&
// 				Date.now() - report.updatedAt < 24 * 60 * 60 * 1000; // Less than 24 hours
// 			return {
// 				lastmessage: report.replyContent || "No recent reply",
// 				wa_id: report.recipientPhone,
// 				status: isReplyRecent ? 1 : 0, // Status is 1 if replyContent is not empty and updatedAt is less than 24 hours
// 				name: report.contactName,
// 				usertimestmp: report.updatedAt,
// 				is_read: report.status === "READ" ? true : false, // is_read is true if the status is "READ"
// 			};
// 		});

// 		res.status(200).json({ msg: formattedReports, success: true });
// 	} catch (error) {
// 		console.error("Error in searchUsers:", error);
// 		res.status(400).json({ message: error, success: false });
// 	}
// };

// export const sendMessages = async (req, res, next) => {
// 	const { messages, token, fileByteCode, fileName } = req.body;
// 	// Check for required fields
// 	if (!token || !messages) {
// 		return res.status(400).json({
// 			message: "All data not provided",
// 			success: false,
// 		});
// 	}

// 	if (!isString(token)) return next();
// 	if (!isObject(messages)) return next();

// 	let tokenData;
// 	try {
// 		tokenData = validateToken(token);
// 	} catch (err) {
// 		return res.status(401).json({
// 			success: false,
// 			message: err || "Token error",
// 		});
// 	}
// 	const { userId, addedUser } = tokenData;

// 	try {
// 		// Get access token for Meta API
// 		const user = await User.findOne({ unique_id: userId });
// 		const accessToken = user.FB_ACCESS_TOKEN;

// 		// Check for media messages
// 		const mediaMessages = ["image", "video", "document"].includes(
// 			messages.mediatype,
// 		);

// 		// If media file is included in the bytecode, handle the decoding
// 		// Handle media files
// 		let tempFilePath = "";
// 		if (mediaMessages && fileByteCode) {
// 			const tempDir = path.join(__dirname, "uploads", userId);
// 			tempFilePath = path.join(tempDir, fileName);

// 			// Ensure directory exists
// 			fs.mkdirSync(tempDir, { recursive: true });

// 			// Write decoded file
// 			fs.writeFileSync(tempFilePath, Buffer.from(fileByteCode, "base64"));
// 		}

// 		// Destructure messages content
// 		const {
// 			from,
// 			to,
// 			mediatype,
// 			message: messageText,
// 			caption,
// 			campaignId,
// 			name,
// 		} = messages;

// 		// Validate the campaign
// 		const campaign = await Campaign.findOne({
// 			unique_id: campaignId,
// 		});
// 		if (!campaign)
// 			return res.status(404).json({
// 				success: false,
// 				message: "Campaign not found",
// 			});

// 		// Create the payload based on message type
// 		let mediaId = "";
// 		let payload;
// 		switch (mediatype) {
// 			case "image":
// 			case "video":
// 			case "document":
// 				if (!tempFilePath) {
// 					throw new Error("Missing media file for media message");
// 				}

// 				// Upload using file path
// 				mediaId = await uploadMedia(
// 					accessToken,
// 					from,
// 					tempFilePath,
// 					mediatype,
// 					fileName,
// 				);

// 				// Create payload for each media type
// 				if (mediatype === "image") {
// 					payload = createImagePayload(to, mediaId, caption);
// 				} else if (mediatype === "video") {
// 					payload = createVideoPayload(to, mediaId, caption);
// 				} else {
// 					payload = createDocumentPayload(
// 						to,
// 						mediaId,
// 						fileName,
// 						caption,
// 					);
// 				}
// 				break;
// 			default:
// 				// Handle text messages
// 				payload = createTextPayload(to, messageText);
// 		}

// 		// Send the message using Meta API
// 		const data = await sendMessage(accessToken, from, payload);

// 		// Respond with success
// 		res.status(200).json({
// 			message: "Message sent successfully",
// 			success: true,
// 		});

// 		// Save the report
// 		const report = new Report({
// 			WABA_ID: user.WABA_ID,
// 			FB_PHONE_ID: from,
// 			useradmin: user.unique_id,
// 			unique_id: generateUniqueId(),
// 			campaignName: campaign.name,
// 			campaignId: campaign.unique_id,
// 			contactName: name,
// 			recipientPhone: to,
// 			status: "SENT",
// 			messageId: data.messages[0].id,
// 			textSent: messageText,
// 			media: { url: tempFilePath, fileName, caption },
// 			type: "Chat",
// 		});
// 		await report.save();

// 		const letName = addedUser?.name ? addedUser?.name : user.name;

// 		await ActivityLogs.create({
// 			useradmin: userId,
// 			unique_id: generateUniqueId(),
// 			name: letName,
// 			actions: "Send",
// 			details: `Sent message from chats to: ${name}`,
// 		});
// 	} catch (err) {
// 		console.log("Error sending message: ", err);
// 		res.status(500).json({
// 			message: err.message,
// 			success: false,
// 		});
// 	}
// };

// export const getSendTemplate = async (req, res, next) => {
// 	try {
// 		const { token, wa_id } = req.query;
// 		if (!token || !wa_id) {
// 			return res.status(400).json({ message: "All data not provided" });
// 		}

// 		if (!isString(token, wa_id)) return next();

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			console.log("token error :", err);
// 			return res.status(401).render("errors/serverError");
// 		}
// 		const { userId } = tokenData;

// 		const contactData = await Contacts.findOne({
// 			useradmin: userId,
// 			wa_id,
// 		});

// 		if (!contactData) {
// 			return res.status(404).json({ message: "Contact not found" });
// 		}

// 		// Create view data that includes the URL and other contact details.
// 		const data = {
// 			...contactData.toObject(),
// 		};

// 		// Send the rendered HTML as response
// 		res.status(200).render("Chats/sendTemplate", { data, userId });
// 	} catch (err) {
// 		console.error("Error getting send template:", err);
// 		res.status(500).render("errors/serverError");
// 	}
// };

// export const getAllTemplates = async (req, res, next) => {
// 	try {
// 		const id = req.params?.id;

// 		if (!isString(id)) return next();
// 		// console.log(id);
// 		// Respond with the updated templates from MongoDB
// 		const updatedTemplates = await Template.find({
// 			useradmin: id,
// 			deleted: { $ne: true },
// 			status: "Approved",
// 		}).sort({ createdAt: -1 });
// 		// console.log(updatedTemplates);
// 		res.json({
// 			success: true,
// 			data: updatedTemplates,
// 		});
// 	} catch (error) {
// 		// Handle errors, returning a 500 status code with error message
// 		res.status(500).json({
// 			success: false,
// 			error: error.message,
// 		});
// 	}
// };

// export const getSingleTemplate = async (req, res, next) => {
// 	try {
// 		const id = req.params?.id;

// 		if (!isString(id)) return next();
// 		// console.log(id);
// 		// Respond with the updated templates from MongoDB
// 		const updatedTemplates = await Template.findOne({
// 			unique_id: id,
// 			deleted: { $ne: true },
// 			status: "Approved",
// 		});
// 		console.log(updatedTemplates);
// 		res.json(updatedTemplates);
// 	} catch (error) {
// 		// Handle errors, returning a 500 status code with error message
// 		res.status(500).json({
// 			success: false,
// 			error: error.message,
// 		});
// 	}
// };

// export const sendTemplate = async (req, res, next) => {
// 	try {
// 		let { templateId, contactListId, variables, contactList, token } =
// 			req.body;

// 		if (!templateId || !contactListId) {
// 			return res.status(400).json({
// 				message: "Template ID and Contact List ID are required",
// 			});
// 		}

// 		if (!isString(templateId, contactListId)) return next();

// 		variables =
// 			typeof variables === "string" ? JSON.parse(variables) : variables;

// 		let tokenData;
// 		try {
// 			tokenData = validateToken(token);
// 		} catch (err) {
// 			return res.status(401).json({
// 				success: false,
// 				message: err || "Token error",
// 			});
// 		}
// 		const { userId, addedUser } = tokenData;

// 		let user = await User.findOne({ unique_id: userId });

// 		const phone_number = user.FB_PHONE_NUMBERS.find(
// 			(n) => n.selected == true,
// 		).phone_number_id;

// 		if (!phone_number) {
// 			throw new Error("No phone number selected.");
// 		}

// 		const { data, messageTemplate, components } = await sendTestMessage(
// 			user,
// 			templateId,
// 			variables,
// 			contactListId,
// 			contactList[0]?.recipientPhone,
// 			phone_number,
// 		);

// 		let campaign = await Campaign.findOne({
// 			contactListId,
// 		}).sort({ createdAt: -1 });

// 		const report = new Report({
// 			WABA_ID: user.WABA_ID,
// 			FB_PHONE_ID: phone_number,
// 			useradmin: user.unique_id,
// 			unique_id: generateUniqueId(),
// 			campaignName: campaign.name,
// 			campaignId: campaign.unique_id,
// 			contactName: contactList[0]?.contactName,
// 			recipientPhone: contactList[0]?.recipientPhone,
// 			status: "SENT",
// 			messageId: data.messages[0].id,
// 			messageTemplate,
// 			templateId,
// 			components,
// 			type: "Template",
// 		});

// 		await report.save();

// 		const name = addedUser?.name ? addedUser?.name : user.name;

// 		await ActivityLogs.create({
// 			useradmin: userId,
// 			unique_id: generateUniqueId(),
// 			name,
// 			actions: "Send",
// 			details: `Sent message template from chats to: ${contactList[0]?.contactName}`,
// 		});

// 		res.status(201).json({
// 			message: "Template sent successfully",
// 			success: true,
// 		});
// 	} catch (error) {
// 		console.error("Error creating campaign:", error.message);
// 		res.status(500).json({
// 			message: `Error creating campaign: ${error.message}`,
// 		});
// 	}
// };

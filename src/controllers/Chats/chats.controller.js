import fs from "fs";
import path from "path";
import axios from "axios";
import { Buffer } from "buffer";
import dotenv from "dotenv";
import User from "../../models/user.model.js";
import Report from "../../models/chats.model.js";
import Campaign from "../../models/campaign.model.js";
import Template from "../../models/templates.model.js";
import Contacts from "../../models/contacts.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import { uploadMedia, sendMessage, getMediaUrl } from "./chats.functions.js";
// import { setToken, getToken, getStoredTokens, saveStoredTokens, validateToken, generateRefreshToken, isTokenExpired } from "./chats.token.js";
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
import Permissions from "../../models/permissions.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { sendTestMessage } from "../ContactList/campaign.functions.js";
import ChatsTemp from "../../models/chatsTemp.model.js";

dotenv.config();

const __dirname = path.resolve();

/**
 * Renders the chats view with a new token.
 *
 * Retrieves the user's unique id from session data, checks permissions, creates a token record,
 * and renders the Chats view with user details.
 *
 * @async
 * @function getSetToken
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @returns {void}
 */
export const getSetToken = async (req, res) => {
	try {
		// Get the user's unique ID from the session
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUser = req.session?.addedUser;
		const permissions = req.session?.addedUser?.permissions;
		let permissionValue, accessData;

		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res
				.status(404)
				.json({ message: "User not found", success: false });
		}

		const phoneNumber = user.FB_PHONE_NUMBERS.find(
			(d) => d.selected === true,
		);

		if (!phoneNumber) {
			return res.status(400).json({
				message: "No phone number found for this user",
				success: false,
			});
		}

		// Check if user has permissions via addedUser
		if (permissions) {
			accessData = await Permissions.findOne({ unique_id: permissions });

			if (!accessData?.chats?.chat && !accessData?.chats?.allChats) {
				return res.render("errors/notAllowed");
			}
			// Use the specific permission for chats from the Permissions model
			permissionValue = accessData?.chats;
		} else {
			// Otherwise, fetch the user's access details
			permissionValue = user?.access?.chats;
		}

		// Create a new token record in the database
		const tokenRecord = await createTokenRecord(
			id,
			permissionValue,
			addedUser,
			phoneNumber.phone_number_id,
		);

		// Prepare data for rendering
		const renderData = {
			token: tokenRecord.token,
			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
			name: req.session?.addedUser?.name || req.session?.user?.name,
			color: req.session?.addedUser?.color || req.session?.user?.color,
			access: permissions ? accessData : user.access,
			phoneNumberId: phoneNumber.phone_number_id,
			phoneNumberName: phoneNumber.friendly_name,
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
		res.render("errors/chatsError");
	}
};

/**
 * Retrieves users based on token and returns formatted reports.
 *
 * Validates token, retrieves the user by ID, gets the selected phone number,
 * and returns formatted reports with pagination.
 *
 * @async
 * @function getUsers
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getUsers = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token, permission, addedUser } =
			await getUserIdFromToken(oldToken);

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
			addedUser,
			permission?.allChats,
			phoneNumberId,
			skip,
		);

		res.status(200).json({
			msg: formattedReports,
			success: true,
			token,
			permission: permission?.chat || permission?.allChats,
		});
	} catch (error) {
		console.error("Error in getMoreUsers:", error.message || error);
		res.status(400).json({
			message: error.message || error,
			success: false,
		});
	}
};

/**
 * Refreshes the token using the token from the request body.
 *
 * Validates the old token, checks permissions, and returns a refreshed token along with permission details.
 *
 * @async
 * @function getRefreshToken
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getRefreshToken = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, addedUser, token } = await getUserIdFromToken(oldToken);

		let permissionValue, accessData;

		if (addedUser && addedUser.permissions) {
			accessData = await Permissions.findOne({
				unique_id: addedUser.permissions,
			});
			if (!accessData?.chats?.chat && !accessData?.chats?.allChats) {
				return res.status(500).json({
					message: "Permission Error: Not Allowed",
					success: false,
				});
			}
			permissionValue =
				accessData?.chats?.chat || accessData?.chats?.allChats;
		} else {
			permissionValue = true;
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

/**
 * Retrieves a single chat for a given recipient.
 *
 * Fetches chat reports for a recipient identified by wa_id, processes them, and returns the chat data.
 *
 * @async
 * @function getSingleChat
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getSingleChat = async (req, res, next) => {
	try {
		const oldToken = checkToken(req, next);
		const { userId, token } = await getUserIdFromToken(oldToken);

		const wa_id = req.body?.wa_id;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const limit = 10;

		if (!wa_id) {
			return res.status(400).json({ message: "All values not provided" });
		}

		if (!isString(wa_id)) throw "Invalid Input";
		if (!isNumber(skip)) throw "Invalid Input";

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
					templatename: reportItem.templatename,
				});
			} else {
				if (reportItem?.media?.url) {
					chatsForReport = processMediaReport(reportItem, wa_id);
				} else if (reportItem.textSent || reportItem.replyContent) {
					chatsForReport = processTextReport(reportItem, wa_id);
				}
			}
			formattedChats.push(chatsForReport);
		}

		console.log(formattedChats);

		return res.status(200).json({
			success: true,
			chats: formattedChats.filter((item) => item !== "").reverse(),
			token,
		});
	} catch (error) {
		console.error("Error in getSingleChat:", error);
		return res
			.status(500)
			.json({ success: false, message: error.message || error });
	}
};

/**
 * Searches for users by name or phone number using the provided search term.
 *
 * Validates input, searches for matching reports, and returns the formatted report data.
 *
 * @async
 * @function searchUsers
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
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
		if (!isString(search)) throw "Invalid Input";

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
		res.status(400).json({
			message: error.message || error,
			success: false,
		});
	}
};

/**
 * Sends messages (text or media) based on the provided payload.
 *
 * Processes media if needed, sends the message via the sendMessage function,
 * creates a report and temporary chat record, and logs the activity.
 *
 * @async
 * @function sendMessages
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const sendMessages = async (req, res, next) => {
	try {
		const { messages, fileByteCode, fileName } = req.body;
		const oldToken = checkToken(req, next);
		const { userId, token, addedUser } = await getUserIdFromToken(oldToken);

		if (!messages) {
			return res.status(400).json({
				message: "All data not provided",
				success: false,
			});
		}
		if (!isObject(messages)) throw "Invalid Input";

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
			url,
			caption,
			token,
		});

		// const report = new Report({
		// 	WABA_ID: user.WABA_ID,
		// 	FB_PHONE_ID: from,
		// 	useradmin: user.unique_id,
		// 	unique_id: generateUniqueId(),
		// 	campaignName: campaign.name,
		// 	campaignId: campaign.unique_id,
		// 	contactName: name,
		// 	recipientPhone: to,
		// 	status: "SENT",
		// 	messageId: data.messages[0].id,
		// 	textSent: messageText,
		// 	media: { url, fileName, caption },
		// 	type: "Chat",
		// 	media_type: mediatype,
		// });
		// await report.save();
		const temp = new ChatsTemp({
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
			media_type: mediatype,
		});
		await temp.save();

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
			message: err.message || err,
			success: false,
		});
	}
};

/**
 * Renders the send template view for a specific contact.
 *
 * Retrieves contact details using the provided wa_id and renders the send template page.
 *
 * @async
 * @function getSendTemplate
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getSendTemplate = async (req, res, next) => {
	try {
		const { wa_id, token: oldToken } = req.query;

		if (!wa_id || !oldToken) {
			return res.status(400).json({ message: "All data not provided" });
		}
		if (!isString(wa_id)) throw "Invalid Input";

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

/**
 * Retrieves all approved templates for a given user.
 *
 * Finds templates for the user by id that are not deleted and have status "Approved".
 *
 * @async
 * @function getAllTemplates
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getAllTemplates = async (req, res, next) => {
	try {
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
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			error: error.message || error,
		});
	}
};

/**
 * Retrieves a single approved template by unique id.
 *
 * Finds a template using unique_id that is not deleted and has status "Approved".
 *
 * @async
 * @function getSingleTemplate
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const getSingleTemplate = async (req, res, next) => {
	try {
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
			error: error.message || error,
		});
	}
};

/**
 * Sends a message template to a contact.
 *
 * Validates input data, sends a test message using the provided template,
 * creates a report and a temporary chat record, logs the activity, and returns a success response.
 *
 * @async
 * @function sendTemplate
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {void}
 */
export const sendTemplate = async (req, res, next) => {
	try {
		let {
			templateId,
			contactListId,
			variables,
			contactList,
			token: oldToken,
		} = req.body;

		if (!templateId || !contactListId || !contactList || !oldToken) {
			return res.status(400).json({
				message: "All Data not provided",
			});
		}

		if (!isString(templateId, contactListId, oldToken))
			throw "Invalid Input";

		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;

		const { userId, addedUser } = await getUserIdFromToken(oldToken);

		let user = await User.findOne({ unique_id: userId });

		const phone_number = user.FB_PHONE_NUMBERS.find(
			(n) => n.selected == true,
		)?.phone_number_id;

		if (!phone_number) {
			throw "No phone number selected.";
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

		// const report = new Report({
		// 	WABA_ID: user.WABA_ID,
		// 	FB_PHONE_ID: phone_number,
		// 	useradmin: user.unique_id,
		// 	unique_id: generateUniqueId(),
		// 	campaignName: campaign.name,
		// 	campaignId: campaign.unique_id,
		// 	contactName: contactList[0]?.contactName,
		// 	recipientPhone: contactList[0]?.recipientPhone,
		// 	status: "SENT",
		// 	messageId: data.messages[0].id,
		// 	messageTemplate,
		// 	templateId,
		// 	components,
		// 	templatename,
		// 	type: "Template",
		// });

		// await report.save();

		const temp = new ChatsTemp({
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
			agent: addedUser.id,
		});

		await temp.save();

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
		console.error("Error creating campaign:", error.message || error);
		res.status(500).json({
			message: error.message || error,
			success: false,
		});
	}
};

/**
 * Gets url of the designated file from facebook.
 *
 * This is get request on url,
 * creates a inline rendered version of the asked file.
 *
 * @async
 * @function sendTemplate
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 * @returns {Buffer}
 */

export const getMedia = async (req, res, next) => {
	try {
		const { token: oldToken, mediaId } = req.query;

		if (!oldToken || !mediaId) {
			throw "No token or mediaId provided";
		}

		if (!isString(oldToken, mediaId)) throw "Invalid Input";

		const { userId } = await getUserIdFromToken(oldToken);

		let user = await User.findOne({ unique_id: userId });

		const { url, mime_type } = await getMediaUrl(
			user.FB_ACCESS_TOKEN,
			mediaId,
		);

		const fileRes = await axios.get(url, {
			headers: { Authorization: `Bearer ${user.FB_ACCESS_TOKEN}` },
			responseType: "stream",
		});

		res.set("Content-Type", mime_type);
		res.set("Content-Disposition", `inline; filename="${url}"`);
		fileRes.data.pipe(res);
		
	} catch (error) {
		console.error("Error getting Media:", error.message || error);
		res.status(500).json({
			message: error.message || error,
			success: false,
		});
	}
};

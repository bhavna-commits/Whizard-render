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
import ChatsUsers from "../../models/chatsUsers.model.js";
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
import AddedUser from "../../models/addedUser.model.js";
import Chats from "../../models/chats.model.js";
import TempMessageModel from "../../models/TempMessage.model.js";
import { help } from "../../utils/dropDown.js";

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
		// identify owner and agent
		const ownerId = req.session?.user?.id || req.session?.addedUser?.owner;
		const added = req.session?.addedUser;
		const permissions = added?.permissions;
		const name = added?.name || req.session?.user?.name;

		// fetch user record
		const user = await User.findOne({ unique_id: ownerId }).lean();
		if (!user) return res.render("errors/chatsError");

		// resolve permissionValue
		let permissionValue;
		let accessData;
		let type;
		if (permissions) {
			if (permissions === "UnAssignedChats") {
				type = "support";
			}
			accessData = await Permissions.findOne({
				unique_id: permissions,
			});

			if (!accessData?.chats?.chat && !accessData?.chats?.allChats)
				return res.render("errors/notAllowed");
			permissionValue = accessData?.chats;
		} else {
			permissionValue = user?.access?.chats;
		}

		// create or update token record
		const { token, agentId } = await createTokenRecord(
			ownerId,
			permissionValue,
			added,
			name,
			type,
		);

		const iframeBaseURL =
			process.env.CHAT_IFRAME_URL || "https://whizard-chat.web.app";

		if (user.WhatsAppConnectStatus === "Pending") {
			return res.render("Chats/chats", {
				token,
				photo: added?.photo || req.session.user?.photo,
				name: added?.name || req.session?.user?.name,
				color: added?.color || req.session.user?.color,
				access: permissions ? accessData : user.access,
				phoneNumberId: "null",
				phoneNumberName: "null",
				phoneNumber: "null",
				agentId,
				iframeBaseURL,
				help,
			});
		}

		// pick phone number
		const phone =
			added?.selectedFBNumber ||
			user.FB_PHONE_NUMBERS.find((f) => f.selected);
		if (!phone) return res.render("errors/chatsError");

		// console.log(token, agentId);
		// render with correct details
		res.render("Chats/chats", {
			token,
			photo: added?.photo || req.session.user?.photo,
			name: added?.name || req.session?.user?.name,
			color: added?.color || req.session.user?.color,
			access: permissions ? accessData : user.access,
			phoneNumberId: phone.phone_number_id,
			phoneNumberName: phone.friendly_name,
			phoneNumber: phone.number,
			agentId,
			iframeBaseURL,
			help,
		});
	} catch (error) {
		console.error("Error in getSetToken:", error);
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

export const getUsers = async (req, res) => {
	try {
		const oldToken = checkToken(req);
		const { userId, token, permission, agentId, tokenType } =
			await getUserIdFromToken(oldToken);

		const phoneNumberId = req.body?.phoneNumberId;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const filter = req.body?.filter;

		if (!phoneNumberId) {
			return res
				.status(400)
				.json({ message: "Phone number ID not provided" });
		}

		if (!isString(phoneNumberId)) throw "Invalid Input";
		if (!isNumber(skip)) throw "Invalid Input";

		const formattedReports = await fetchAndFormatReports(
			userId,
			agentId,
			permission?.allChats,
			phoneNumberId,
			tokenType,
			"",
			filter,
			skip,
		);

		return res.status(200).json({
			msg: formattedReports,
			success: true,
			token,
			permission: permission?.chat || permission?.allChats,
		});
	} catch (error) {
		console.error("Error in getUsers API:", error.message || error);
		return res.status(500).json({
			message: error.message || "Server error",
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
export const getRefreshToken = async (req, res) => {
	try {
		const oldToken = checkToken(req);
		const { token, permission } = await getUserIdFromToken(oldToken);

		let permissionValue = permission?.chat || permission?.allChats;

		res.status(200).json({
			message: "Token refreshed successfully",
			token: token,
			success: true,
			permission: permissionValue,
		});
	} catch (error) {
		console.error("Error in getRefreshToken:", error.message || error);
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

export const getSingleChat = async (req, res) => {
	try {
		const oldToken = checkToken(req);
		const { userId, token } = await getUserIdFromToken(oldToken);

		console.log(req.body);

		const wa_id = req.body?.wa_id;
		const FB_PHONE_ID = req.body?.phoneNumberId;
		const skip = parseInt(req.body?.skip, 10) || 0;
		const limit = 10;

		if (!wa_id || !FB_PHONE_ID) {
			return res.status(400).json({
				message: "All values not provided",
				success: false,
			});
		}

		if (!isString(wa_id) || !isString(FB_PHONE_ID)) throw "Invalid Input";
		if (!isNumber(skip)) throw "Invalid Input";

		const reports = await Report.find({
			FB_PHONE_ID,
			recipientPhone: wa_id,
		})
			.sort({ updatedAt: -1 })
			.skip(skip)
			.limit(limit);

		if (!reports?.length) {
			return res.status(200).json({
				chats: [],
				success: true,
			});
		}

		const formattedChats = [];

		for (const reportItem of reports) {
			let chatsForReport = "";

			if (
				reportItem?.type === "Template" ||
				reportItem?.type === "Campaign"
			) {
				chatsForReport = buildCommonChatFields(reportItem, wa_id, {
					components: reportItem?.components,
					templatename: reportItem?.templatename,
				});
			} else {
				if (reportItem?.media_type) {
					chatsForReport = processMediaReport(reportItem, wa_id);
				} else if (reportItem?.text) {
					chatsForReport = processTextReport(reportItem, wa_id);
				}
			}

			if (chatsForReport) {
				formattedChats.push(chatsForReport);
			}
		}

		return res.status(200).json({
			success: true,
			chats: formattedChats.reverse(),
			token,
		});
	} catch (error) {
		console.error("Error in getSingleChat:", error);
		return res.status(500).json({
			message: error.message || error,
			success: false,
		});
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

export const searchUsers = async (req, res) => {
	try {
		// Token check — expecting full request, not just token string
		const oldToken = checkToken(req);
		const { userId, token, permission, agentId, tokenType } =
			await getUserIdFromToken(oldToken);

		const { search, phoneNumberId } = req.body || {};

		// 🕵️‍♀️ Validate search input
		if (!search || !isString(search)) {
			return res.status(400).json({
				message: "Invalid or missing search term",
				success: false,
			});
		}

		const formattedReports = await fetchAndFormatReports(
			userId,
			agentId,
			permission?.allChats,
			phoneNumberId,
			tokenType,
			search,
		);

		return res.status(200).json({
			msg: formattedReports,
			success: true,
			token,
		});
	} catch (error) {
		console.error("Error in searchUsers:", error);
		return res.status(500).json({
			message: error.message || String(error),
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

export const sendMessages = async (req, res) => {
	try {
		const { messages } = req.body;

		const oldToken = checkToken(req);
		const { userId, token, name, agentId } = await getUserIdFromToken(
			oldToken,
		);

		if (!messages) {
			return res.status(400).json({
				message: "All data not provided",
				success: false,
			});
		}

		const user = await User.findOne({ unique_id: userId }).lean();
		const accessToken = user.FB_ACCESS_TOKEN;

		const {
			from,
			to,
			mediatype,
			message: messageText,
			caption,
			campaignId,
			name: contactName,
			mediaId,
			fileName,
		} = messages;

		const campaign = await Campaign.findOne({ unique_id: campaignId });

		let payload;

		switch (mediatype) {
			case "image":
				if (!mediaId) throw "Missing mediaId for image message";
				payload = createImagePayload(to, mediaId, caption);
				break;
			case "video":
				if (!mediaId) throw "Missing mediaId for video message";
				payload = createVideoPayload(to, mediaId, caption);
				break;
			case "document":
				if (!mediaId || !fileName)
					throw "Missing mediaId or fileName for document";
				payload = createDocumentPayload(to, mediaId, fileName, caption);
				break;
			default:
				payload = createTextPayload(to, messageText);
		}

		const data = await sendMessage(accessToken, from, payload);

		const mediaUrl = messages.url || "";

		const report = {
			WABA_ID: user.WABA_ID,
			FB_PHONE_ID: from,
			useradmin: user.unique_id,
			unique_id: generateUniqueId(),
			campaignName: campaign?.name || "-",
			campaignId: campaign?.unique_id || "-",
			contactName,
			recipientPhone: to,
			status: "SENT",
			messageId: data.messages?.[0]?.id,
			text: messageText,
			media: { url: mediaUrl, fileName, caption },
			type: "Chat",
			media_type: mediatype !== "text" ? mediatype : "",
			agent: agentId,
		};

		const tempMsg = {
			name: contactName,
			wabaId: user.WABA_ID,
			messageId: data.messages?.[0]?.id,
			from: to,
			timestamp: Date.now(),
			type: mediatype || "text",
			text: messageText ? { body: messageText } : mediatype,
			mediaId: mediaId || "",
			fbPhoneId: from,
			status: "sent",
		};

		await TempMessageModel.create(tempMsg);
		await Report.create(report);

		await ActivityLogs.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			name,
			actions: "Send",
			details: `Sent message from chats to: ${name}`,
		});

		return res.status(200).json({
			message: "Message sent successfully",
			success: true,
			url: mediaUrl,
			caption,
			token,
		});
	} catch (err) {
		console.error("Error sending message:", err);
		return res.status(500).json({
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
export const getSendTemplate = async (req, res) => {
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
export const getAllTemplates = async (req, res) => {
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
export const getSingleTemplate = async (req, res) => {
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
export const sendTemplate = async (req, res) => {
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

		const { userId, agentId, name } = await getUserIdFromToken(oldToken);

		let [user, template, addedUser] = await Promise.all([
			User.findOne({ unique_id: userId, deleted: false }),
			Template.findOne({ unique_id: templateId }),
			AddedUser.findOne({
				unique_id: agentId,
				deleted: false,
			}),
		]);

		if (!user) throw new Error("User not found");
		if (!template)
			throw new Error(`Template with ID ${templateId} not found`);
		if (!contactList.length)
			throw new Error(`No contacts found for list ${contactListId}`);

		const fb_phone_number =
			addedUser?.selectedFBNumber?.phone_number_id ||
			user.FB_PHONE_NUMBERS.find((n) => n.selected == true)
				?.phone_number_id;

		if (!fb_phone_number) {
			throw "No phone number selected.";
		}

		await sendTestMessage(
			user,
			template,
			variables,
			contactList[0],
			contactList[0]?.Number,
			fb_phone_number,
			agentId,
			true,
		);

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

export const getMedia = async (req, res) => {
	try {
		const { phoneId, mediaId } = req.query;
		if (!phoneId || !mediaId) {
			return res.status(400).send("Incomplete details provided");
		}

		const user = await User.findOne({
			"FB_PHONE_NUMBERS.phone_number_id": phoneId,
		});

		if (!user) return res.status(404).send("User not found");

		const mediaInfo = await getMediaUrl(user.FB_ACCESS_TOKEN, mediaId);
		if (!mediaInfo.success || !mediaInfo.url) {
			throw mediaInfo.message || "Media URL not found";
		}

		const { url } = mediaInfo;

		// Fetch actual media as binary stream (like the legacy `request`)
		const mediaResponse = await axios.get(url, {
			responseType: "arraybuffer", // grab binary, not stream here for cleaner fallback
			headers: {
				Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/68.0 Safari/537.36",
			},
		});

		const contentType =
			mediaResponse.headers["content-type"] || "application/octet-stream";

		res.setHeader("Content-Type", contentType);
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${path.basename(url)}"`,
		);
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type,Range");
		res.setHeader(
			"Access-Control-Expose-Headers",
			"Accept-Ranges,Content-Range,Content-Length",
		);

		return res.send(mediaResponse.data);
	} catch (err) {
		console.error("Error getting media:", err);
		return res.redirect(
			"https://whizardapi.com/wp-content/uploads/thegem-logos/logo_08af4735e93afc82f50321cd58f0d703_2x.png",
		);
	}
};

/**
 * API to upload media to WhatsApp via Facebook Graph.
 * Expects multipart/form-data with fields:
 * - file (the media file)
 * - phoneNumberId (FB phone ID)
 * - mediaType (image, video, document)
 *
 * Returns the uploaded media ID from Facebook.
 */

export const uploadMediaAPI = async (req, res) => {
	try {
		const { phoneNumberId, mediaType, fileName } = req.body;

		const uploadedFile = req.file;

		if (!phoneNumberId || !mediaType || !uploadedFile || !fileName) {
			return res.status(400).json({
				success: false,
				message:
					"phoneNumberId, mediaType, file, and fileName are required",
			});
		}

		const user = await User.findOne({
			"FB_PHONE_NUMBERS.phone_number_id": phoneNumberId,
		});

		if (!user || !user.FB_ACCESS_TOKEN) {
			return res.status(403).json({
				success: false,
				message: "User or access token not found",
			});
		}

		const tempDir = path.join(__dirname, "uploads", phoneNumberId);
		fs.mkdirSync(tempDir, { recursive: true });

		const uniqueFileName = `${Date.now()}-${fileName}`;
		const tempFilePath = path.join(tempDir, uniqueFileName);

		fs.writeFileSync(tempFilePath, uploadedFile.buffer);

		const mediaId = await uploadMedia(
			user.FB_ACCESS_TOKEN,
			phoneNumberId,
			tempFilePath,
			mediaType,
			uniqueFileName,
		);

		fs.unlink(tempFilePath, (err) => {
			if (err) console.error("Failed to delete temp file:", err);
		});

		return res.status(200).json({
			success: true,
			url: `/api/chats/get-media?mediaId=${mediaId}&phoneId=${phoneNumberId}`,
			mediaId,
		});
	} catch (err) {
		console.error("Upload Media Error:", err);
		return res
			.status(500)
			.json({ success: false, message: err.message || err });
	}
};

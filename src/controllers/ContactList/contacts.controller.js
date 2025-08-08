import fs, { access } from "fs";
import path from "path";
import Papa from "papaparse";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
import Permissions from "../../models/permissions.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import Campaign from "../../models/campaign.model.js";
import Template from "../../models/templates.model.js";
import User from "../../models/user.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";
import { fileURLToPath } from "url";
import {
	generateUniqueId,
	convertDateFormat,
} from "../../utils/otpGenerator.js";
import { agenda } from "../../config/db.js";
import { sendMessages, sendTestMessage } from "./campaign.functions.js";
import { countries, help } from "../../utils/dropDown.js";
import {
	isNumber,
	isString,
	isBoolean,
	isObject,
} from "../../middleWares/sanitiseInput.js";

import { sendCampaignScheduledEmail } from "../../services/OTP/reportsEmail.js";
import chatsUsersModel from "../../models/chatsUsers.model.js";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const csvFilePath = path.join(
	__dirname,
	"..",
	"..",
	"..",
	"CSV",
	"sample.csv",
);

export const updateContact = async (req, res, next) => {
	const contactId = req.params?.id;
	const { name, tags, validated } = req.body;
	console.log(name, tags, validated);
	if (!contactId) {
		return res.status(401).json({
			success: false,
			message: "No id found",
		});
	}
	if (!name || !tags || !validated) {
		return res.status(401).json({
			success: false,
			message: "No data found",
		});
	}
	if (!isString(contactId, name, tags, validated)) return next();

	try {
		// Find the contact by ID and update the fields
		const updatedContact = await ContactList.findByIdAndUpdate(
			contactId,
			{ Name: name, tags, validated },
			{ new: true },
		);

		if (!updatedContact) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Update",
			details: `updated contact of ${name}`,
		});

		res.json({
			success: true,
			message: "Contact updated successfully",
			contact: updatedContact,
		});
	} catch (error) {
		console.error(error);
		res.json({
			success: false,
			message: error,
		});
	}
};

export const getContacts = async (req, res, next) => {
	try {
		const id = req.params.id;
		if (!id) {
			return res.status(401).json({
				success: false,
				message: "No id found",
			});
		}
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) return next();
		if (!isString(id)) return next();

		// Start with the basic match stage
		// Create AND conditions with static match too
		const andConditions = [{ contactId: id }, { subscribe: 1 }];

		// Final match stage: ONLY $and
		const matchStage = { $and: andConditions };

		// Aggregation pipeline to apply filters and paginate
		const aggregation = [
			{ $match: matchStage },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalContacts: [{ $count: "totalContacts" }],
				},
			},
		];

		const result = await Contacts.aggregate(aggregation);
		const contactLists = result[0].paginatedResults;
		const totalContacts =
			result[0].totalContacts.length > 0
				? result[0].totalContacts[0].totalContacts
				: 0;
		// console.log(contactLists);
		const name = await ContactList.findOne({ contactId: id });
		const totalPages = Math.ceil(totalContacts / limit);

		let access;
		const isAddedUser = req.session?.addedUser;
		const isMainUser = req.session?.user;

		const renderData = {
			listName: name.contalistName,
			contacts: contactLists,
			countries,
			page,
			totalPages,
			tags: [],
			id,
			help,
		};

		if (isAddedUser?.permissions) {
			access = await Permissions.findOne({
				unique_id: isAddedUser.permissions,
			});

			if (access?.contactList) {
				return res.render("Contact-List/contactList-overview", {
					...renderData,
					access,
					photo: isAddedUser.photo,
					name: isAddedUser.name,
					color: isAddedUser.color,
					whatsAppStatus: isAddedUser.whatsAppStatus,
				});
			}

			return res.render("errors/notAllowed");
		}

		access = await User.findOne({ unique_id: isMainUser?.id });

		res.render("Contact-List/contactList-overview", {
			...renderData,
			access: access.access,
			photo: isMainUser?.photo,
			name: isMainUser?.name,
			color: isMainUser?.color,
			whatsAppStatus: isMainUser?.whatsAppStatus,
		});
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getMoreContacts = async (req, res, next) => {
	try {
		const id = req.params.id;
		if (!id) {
			return res.status(401).json({
				success: false,
				message: "No id found",
			});
		}
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) return next();
		if (!isString(id)) return next();

		const andConditions = [{ contactId: id }, { subscribe: 1 }];

		const matchStage = { $and: andConditions };

		const aggregation = [
			{ $match: matchStage },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalContacts: [{ $count: "totalContacts" }],
				},
			},
		];

		const result = await Contacts.aggregate(aggregation);
		const contactLists = result[0].paginatedResults;
		const totalContacts =
			result[0].totalContacts.length > 0
				? result[0].totalContacts[0].totalContacts
				: 0;

		const totalPages = Math.ceil(totalContacts / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList) {
				res.render("Contact-List/partials/overView/overViewTableRows", {
					access,
					contacts: contactLists,
					page,
					totalPages,
					tags: [],
					id,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Contact-List/partials/overView/overViewTableRows", {
				access: access.access,
				contacts: contactLists,
				page,
				totalPages,
				tags: [],
				id,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const editContact = async (req, res, next) => {
	try {
		const { id } = req.params;
		const updatedData = req.body;

		if (!id || !updatedData) {
			return res.status(401).json({
				success: false,
				message: "Complete Data not Provided",
			});
		}
		if (!isObject(updatedData)) return next();
		if (!isString(id)) return next();

		let wa_id = "";
		let countryCode = "";

		const setData = {};
		for (const [key, value] of Object.entries(updatedData)) {
			if (key === "countryCode") {
				countryCode = value;
				wa_id = value.slice(1);
			} else if (key === "wa_id" && wa_id) {
				wa_id += value;
				setData["wa_id"] = wa_id;
			} else {
				setData[key] = value;
			}
		}

		const contacts = await Contacts.findByIdAndUpdate(
			id,
			{ $set: setData },
			{ new: true, strict: false },
		);

		if (!contacts) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

		// Only update ChatsUsers if wa_id actually changed
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;
		const agentToAssign = addedUserId || userId;

		const user = await User.findOne({ unique_id: userId, deleted: false });
		const keyId =
			req.session?.addedUser?.selectedFBNumber?.phone_number_id ||
			user?.FB_PHONE_NUMBERS?.find((d) => d.selected)?.phone_number_id;

		const updateQuery = {
			useradmin: userId,
			wa_id: setData.wa_id,
			FB_PHONE_ID: keyId,
		};

		const updateData = {
			$addToSet: {
				agent: agentToAssign,
				contactName: setData.Name,
				nameContactRelation: {
					name: setData.Name,
					contactListId: contacts.contactId,
				},
			},
		};

		await ChatsUsers.updateOne(updateQuery, updateData, {
			upsert: true,
		});

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Update",
			details: `Edited contact of : ${contacts.Name}`,
		});

		res.json({ success: true });
	} catch (error) {
		console.error("Error Editing contact :", error.message || error);
		res.json({ success: false, message: error.message || error });
	}
};

export const deleteContact = async (req, res, next) => {
	const { id } = req.params;
	if (!id) {
		return res.status(401).json({
			success: false,
			message: "No id found",
		});
	}
	// console.log("here");
	if (!isString(id)) next();

	try {
		const contact = await Contacts.findOne({ _id: id });
		if (!contact) {
			return res
				.status(404)
				.json({ success: false, message: "Contact not found" });
		}

		contact.unsubscribe_date = Date.now();
		contact.subscribe = 0;
		await contact.save();

		const contactListId = contact.contactId;
		await ContactList.findOneAndUpdate(
			{ contactId: contactListId },
			{
				$inc: { participantCount: -1 },
			},
		);

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Delete",
			details: `Deleted contact of : ${contact.Name}`,
		});

		res.json({
			success: true,
			message: "Contact deleted and participant count updated",
		});
	} catch (error) {
		console.error("Error deleting contact:", error);
		res.status(500).json({
			success: false,
			message: "An error occurred while deleting the contact.",
		});
	}
};

export const updateCSVOnFieldDelete = async (id, fieldToDelete) => {
	try {
		// Read the CSV file content
		const csvFilePath = path.join(
			__dirname,
			"..",
			"..",
			"..",
			"CSV",
			id,
			"sample.csv",
		);
		const csvContent = fs.readFileSync(csvFilePath, "utf8");

		// Parse the CSV using Papa Parse
		const parsedCSV = Papa.parse(csvContent, {
			header: true,
			skipEmptyLines: true,
		});

		const rows = parsedCSV.data;
		const headers = parsedCSV.meta.fields;

		// Check if the field exists in the headers
		if (!headers.includes(fieldToDelete)) {
			console.log(`Field ${fieldToDelete} not found in CSV`);
			return;
		}

		// Filter out the field (column) to be deleted
		const updatedHeaders = headers.filter(
			(header) => header !== fieldToDelete,
		);

		// Remove the corresponding field from each row
		const updatedRows = rows.map((row) => {
			const newRow = { ...row };
			delete newRow[fieldToDelete];
			return newRow;
		});

		// Convert back to CSV format
		const updatedCSV = Papa.unparse({
			fields: updatedHeaders,
			data: updatedRows,
		});

		// Overwrite the CSV with the updated data
		fs.writeFileSync(csvFilePath, updatedCSV);
		console.log(`Field ${fieldToDelete} successfully deleted from CSV.`);
	} catch (error) {
		console.error("Error updating the CSV:", error);
	}
};

export const createContact = async (req, res, next) => {
	try {
		const contactData = req.body;
		const { Name, contactId, wa_id, countryCode, ...newContactData } =
			contactData;

		if (!contactId || !contactData) {
			return res.status(400).json({
				success: false,
				message: "List ID or contact data is missing",
			});
		}

		if (!isObject(contactData)) return next();

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;
		const user = await User.findOne({ unique_id: userId, deleted: false });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found.",
			});
		}

		const keyId =
			req.session?.addedUser?.selectedFBNumber?.phone_number_id ||
			user?.FB_PHONE_NUMBERS?.find((d) => d.selected)?.phone_number_id;

		if (!keyId) {
			return res.status(400).json({
				success: false,
				message: "No phone number selected for the user.",
			});
		}

		const fullWaId = `${countryCode?.slice(1)}${wa_id}`;
		const agentToAssign = addedUserId || userId;

		// Check for duplicate contact
		const numberExists = await Contacts.findOne({
			contactId,
			wa_id: fullWaId,
			subscribe: 1,
		});

		if (numberExists) {
			return res.status(400).json({
				success: false,
				message: "Cannot add same number twice in a list",
			});
		}

		const contact = {
			useradmin: userId,
			contactId,
			Name,
			wa_id: fullWaId,
			FB_PHONE_ID: keyId,
			masterExtra: newContactData,
			agent: [agentToAssign],
			usertimestmp: Date.now(),
		};

		const newContact = await Contacts.create(contact);

		await ContactList.findOneAndUpdate(
			{ contactId },
			{ $inc: { participantCount: 1 } },
		);

		await ActivityLogs.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name || req.session?.addedUser?.name,
			actions: "Create",
			details: `Created a new contact: ${newContact.Name}`,
		});

		if (Name && contactId) {
			const updateQuery = {
				useradmin: userId,
				wa_id: fullWaId,
				FB_PHONE_ID: keyId,
			};

			const updateData = {
				$addToSet: {
					agent: agentToAssign,
					contactName: Name,
					nameContactRelation: {
						name: Name,
						contactListId: contactId,
					},
				},
				$set: {
					messageStatus: "SENT",
					lastSend: Date.now(),
				},
			};

			await ChatsUsers.updateOne(updateQuery, updateData, {
				upsert: true,
			});
		}

		res.status(201).json({ success: true, contact: newContact });
	} catch (error) {
		console.error("Error adding contact:", error.message || error);
		res.status(500).json({
			success: false,
			message: error.message || error,
		});
	}
};

export const createCampaign = async (req, res, next) => {
	try {
		let {
			templateId,
			contactListId,
			variables,
			schedule,
			name,
			test,
			url,
		} = req.body;

		if (!templateId || !contactListId) {
			return res
				.status(400)
				.json({
					message: "Template ID and Contact List ID are required",
				});
		}

		if (!isString(templateId, contactListId, variables, name))
			return next();

		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;
		schedule =
			typeof schedule === "string" ? JSON.parse(schedule) : schedule;
		test = typeof test === "string" ? JSON.parse(test) : test;

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const addedUserId = req.session?.addedUser?.id;

		const [user, contactList, template] = await Promise.all([
			User.findOne({ unique_id: userId, deleted: false }),
			Contacts.find({ contactId: contactListId, subscribe: 1 }),
			Template.findOne({ unique_id: templateId }),
		]);

		if (!user) throw new Error("User not found");
		if (!template)
			throw new Error(`Template with ID ${templateId} not found`);
		if (!contactList.length)
			throw new Error(`No contacts found for list ${contactListId}`);

		const phone_number =
			req.session?.addedUser?.selectedFBNumber?.phone_number_id ||
			user.FB_PHONE_NUMBERS.find((n) => n.selected)?.phone_number_id;
		if (!phone_number) throw new Error("No phone number selected");

		const messagesCount = user?.payment?.messagesCount || 0;
		const totalCount = user?.payment?.totalMessages || 0;
		if (contactList.length > totalCount - messagesCount) {
			throw new Error(
				`Not enough credits. You have ${
					totalCount - messagesCount
				} messages left, but you're trying to send ${
					contactList.length
				}.`,
			);
		}

		if (test) {
			await sendTestMessage(
				user,
				template,
				variables,
				contactList[0],
				test,
				phone_number,
				addedUserId,
				url,
				req.file?.filename,
			);

			await ActivityLogs.create({
				useradmin: userId,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				photo:
					req.session?.user?.photo || req.session?.addedUser?.photo,
				color:
					req.session?.user?.color || req.session?.addedUser?.color,
				actions: "Send",
				details: `Sent a test message named: ${name}`,
			});

			return res
				.status(201)
				.json({
					success: true,
					message: "Test message sent successfully",
				});
		}

		const newCampaign = new Campaign({
			useradmin: userId,
			unique_id: generateUniqueId(),
			templateId,
			contactListId,
			variables,
			name,
			phoneNumberId: phone_number,
			status: schedule ? "SCHEDULED" : "SENT",
		});

		let reportTime;
		if (schedule) {
			newCampaign.scheduledAt = Number(schedule) * 1000;
			reportTime = new Date(newCampaign.scheduledAt);

			await sendCampaignScheduledEmail(
				user.email,
				name,
				newCampaign.scheduledAt,
			);
			await ActivityLogs.create({
				useradmin: userId,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				actions: "Send",
				details: `Scheduled new campaign named: ${name}`,
			});
		} else {
			reportTime = new Date(Date.now() + 2 * 60 * 1000);
			await ActivityLogs.create({
				useradmin: userId,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				actions: "Send",
				details: `Sent campaign named: ${name}`,
			});
		}

		agenda.schedule(reportTime, "process campaign", {
			newCampaign,
			user,
			unique_id: generateUniqueId(),
			phone_number,
			addedUserId,
			url,
			fileName: req.file?.filename,
			contactList,
			template,
		});

		const contactNumberGroup = contactList.map((c) => c.wa_id);
		const chatUsers = await chatsUsersModel.find({
			useradmin: userId,
			FB_PHONE_ID: phone_number,
			wa_id: { $in: contactNumberGroup },
		});

		const existingNumbers = new Set(chatUsers.map((c) => c.wa_id));
		const newContacts = contactList.filter(
			(c) => !existingNumbers.has(c.wa_id),
		);

		if (newContacts.length) {
			await chatsUsersModel.insertMany(
				newContacts.map((c) => ({
					wa_id: c.wa_id,
					useradmin: userId,
					unique_id: generateUniqueId(),
					FB_PHONE_ID: phone_number,
					contactName: c.Name,
					campaignName: newCampaign.name,
					campaignId: newCampaign.unique_id,
					updatedAt: Date.now(),
					lastMessage: "-",
					lastSend: Date.now(),
					messageStatus: "SENT",
					replyStatus: 0,
					agent: addedUserId || userId,
				})),
			);
		}

		await chatsUsersModel.updateMany(
			{
				useradmin: userId,
				FB_PHONE_ID: phone_number,
				wa_id: { $in: contactNumberGroup },
			},
			{
				$set: {
					replyStatus: 0,
					campaignName: newCampaign.name,
					campaignId: newCampaign.unique_id,
				},
			},
		);

		await newCampaign.save();

		res.status(201).json({
			message: schedule
				? "Campaign scheduled successfully"
				: "Campaign created successfully",
			campaign: newCampaign,
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

export const getFilteredContacts = async (req, res, next) => {
	try {
		const id = req.params?.id;
		const page = parseInt(req.query?.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		// Get filters from the request body
		const filters = req.body?.filters || [];

		if (!isString(id)) return next();
		if (!isNumber(page)) return next();

		// Start with the basic match stage
		const matchStage = {
			contactId: id,
			subscribe: 1,
		};
		// Loop through each filter
		filters.forEach((filter) => {
			if (filter.field === "usertimestmp" && filter.value) {
				matchStage.$and = matchStage.$and || [];
				const [startDate, endDate] = filter.value?.split(" to ") || [];

				// helper to get local‑midnight timestamp
				function toLocalMidnightTs(dateStr) {
					const [y, m, d] = dateStr.split("-").map(Number);
					// Midnight in local time for the next day
					return new Date(y, m - 1, d).getTime();
				}

				if (!startDate) {
					console.error(
						"No start date! filter.value was:",
						filter.value,
					);
					return;
				}

				const convertedStartDate = toLocalMidnightTs(startDate);
				let convertedEndDate;

				if (endDate) {
					convertedEndDate =
						toLocalMidnightTs(endDate) + 24 * 60 * 60 * 1000;
				} else {
					convertedEndDate = convertedStartDate + 24 * 60 * 60 * 1000;
				}

				matchStage.$and.push({
					[filter.field]: {
						$gte: convertedStartDate,
						$lte: convertedEndDate,
					},
				});
			} else if (filter.field === "Name" || filter.field === "Number") {
				if (filter.condition === "has") {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[filter.field]: {
							$regex: filter.value,
							$options: "imsx",
						},
					});
				} else {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[filter.field]: {
							$not: {
								$regex: filter.value,
								$options: "imsx",
							},
						},
					});
				}
			} else {
				if (filter.condition === "has") {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[`masterExtra.${filter.field}`]: {
							$regex: filter.value,
							$options: "imsx",
						},
					});
				} else {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[`masterExtra.${filter.field}`]: {
							$not: {
								$regex: filter.value,
								$options: "imsx",
							},
						},
					});
				}
			}
		});

		// Aggregation pipeline to apply filters and paginate
		const aggregation = [
			{ $match: matchStage },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalContacts: [{ $count: "totalContacts" }],
				},
			},
		];

		const result = await Contacts.aggregate(aggregation);
		// console.log(result);
		const contactLists = result[0].paginatedResults;
		const totalContacts =
			result[0].totalContacts.length > 0
				? result[0].totalContacts[0].totalContacts
				: 0;

		const totalPages = Math.ceil(totalContacts / limit);
		// console.log(contactLists);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList) {
				res.render("Contact-List/partials/OverViewTable", {
					access,
					contacts: contactLists,
					page,
					totalPages,
					tags: [],
					id,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Contact-List/partials/OverViewTable", {
				access: access.access,
				contacts: contactLists,
				page,
				totalPages,
				tags: [],
				id,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getOverviewFilter = async (req, res) => {
	try {
		const { id } = req.params;
		if (!isString(id)) return next();
		const contact = await Contacts.findOne({ contactId: id, subscribe: 1 });
		res.render("Contact-List/partials/filterOptions", { contact });
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getCreateCampaign = async (req, res) => {
	const sessionUser = req.session?.user;
	const addedUser = req.session?.addedUser;
	const ownerId = sessionUser?.id || addedUser?.owner;

	const user = await User.findOne({ unique_id: ownerId });
	const message = user.payment?.totalMessages - user.payment?.messagesCount;
	let renderData = null;

	if (addedUser?.permissions) {
		const access = await Permissions.findOne({
			unique_id: addedUser.permissions,
		});

		if (access?.contactList?.sendBroadcast && addedUser?.whatsAppStatus) {
			renderData = {
				access,
				name: addedUser.name,
				photo: addedUser.photo,
				color: addedUser.color,
				help,
				message,
				view: "Contact-List/createCampaign",
			};
		}
	} else if (sessionUser?.whatsAppStatus === "Live") {
		renderData = {
			access: user.access,
			name: sessionUser.name,
			photo: sessionUser.photo,
			color: sessionUser.color,
			help,
			message,
			view: "Contact-List/createCampaign",
		};
	}

	res.render(renderData?.view || "errors/notAllowed", renderData || {});
};

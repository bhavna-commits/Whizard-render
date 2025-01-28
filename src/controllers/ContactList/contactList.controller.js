import path from "path";
import fs from "fs";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
import {
	isNumber,
	isString,
	isBoolean,
	isObject,
	isValidArrayOrObject,
} from "../../middleWares/sanitiseInput.js";
// import Template from "../../models/templates.model.js";
import Permissions from "../../models/permissions.model.js";
import CustomField from "../../models/customField.model.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import dotenv from "dotenv";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import {
	__dirname,
	__filename,
	csvFilePath,
	updateCSVOnFieldDelete,
	generateTableAndCheckFields,
} from "./contacts.controller.js";

dotenv.config();

export const previewContactList = async (req, res, next) => {
	try {
		const { fileData, listName } = req.body;

		// Check for missing data
		if (!fileData || !listName) {
			return res.status(400).json({
				success: false,
				message: "Required fields missing: fileData, listName.",
			});
		}

		// Parse file data
		let parsedData;
		try {
			parsedData = JSON.parse(fileData);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message:
					"Invalid file format. Please upload a valid JSON file.",
			});
		}

		// Check if the parsed data contains contacts
		if (!parsedData.length) {
			return res.status(400).json({
				success: false,
				message: "No contacts found in the file.",
			});
		}

		// Validate data
		const requiredColumns = ["Name", "Number"];
		const customFields = await CustomField.find({
			customid: req.session?.user?.id || req.session?.addedUser?.owner,
		});
		const contactList = await ContactList.findOne({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			contalistName: listName,
		});

		if (contactList) {
			return res.status(400).json({
				success: false,
				message:
					"A contact list with this name already exists. Please choose a different name.",
			});
		}

		// Get validation results
		const validationResult = generateTableAndCheckFields(
			parsedData,
			requiredColumns,
			customFields,
		);

		// Return error response if there are issues
		if (
			validationResult.missingColumns?.length > 0 ||
			validationResult.invalidColumns?.length > 0 ||
			validationResult.emptyFields?.length > 0 ||
			validationResult.invalidNumbers?.length > 0 ||
			validationResult.duplicateNumbers?.length > 0
		) {
			return res.status(400).json({
				success: false,
				...validationResult,
			});
		}

		req.session.csvData = {
			parsedData,
			listName,
		};

		return res.status(200).json({
			success: true,
			message: "Data preview successful.",
			tableHtml: validationResult.tableHtml,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while validating the contact list.",
		});
	}
};

export const createList = async (req, res, next) => {
	try {
		if (!req.session?.csvData) {
			return res.status(400).json({
				success: false,
				message: "Session data missing or incomplete.",
			});
		}

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const parsedData = req.session?.csvData?.parsedData;
		const listName = req.session?.csvData?.listName;

		const user = await User.findOne({ unique_id: userId });
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found.",
			});
		}

		const participantCount = parsedData.length;

		// Create a new Contact List
		const contactList = new ContactList({
			contalistName: listName,
			useradmin: userId,
			participantCount,
			contactId: generateUniqueId(),
		});

		const contactsToSave = parsedData
			.map((contactData) => {
				let { Name, Number, ...additionalFields } = contactData;
				const keyId = generateUniqueId();
				return new Contacts({
					useradmin: userId,
					Name,
					wa_idK: `${user.phone}_${keyId}`,
					keyId,
					wa_id: Number,
					contactId: contactList.contactId,
					masterExtra: additionalFields,
				});
			})
			.filter((contact) => contact !== null);

		if (contactsToSave.length > 0) {
			await Contacts.insertMany(contactsToSave);
		} else {
			return res.status(400).json({
				success: false,
				message: "No valid contacts to save.",
			});
		}

		const dynamicAttributes = Object.keys(parsedData[0]).filter(
			(key) => key !== "Name" && key !== "Number",
		);

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Create",
			details: `Created a contact List named : ${listName}`,
		});

		if (req.session?.user) {
			req.session.user.contactListCSV = null;
			req.session.user.listName = null;
		} else {
			req.session.addedUser.contactListCSV = null;
			req.session.addedUser.listName = null;
		}

		await contactList.save();

		res.json({
			success: true,
			message: "Contact list and contacts created successfully",
			dynamicAttributes,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error creating contact list",
		});
	}
};

export const deleteList = async (req, res, next) => {
	try {
		const { id } = req.params;
		if (!isString(id)) return next();
		const contactList = await ContactList.findOne({ contactId: id });
		// console.log(contactList);
		if (!contactList) {
			return res
				.status(404)
				.json({ success: false, message: "Contact list not found" });
		}

		contactList.contact_status = 0;
		await contactList.save();

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Delete",
			details: `Deleted a contact List named : ${contactList.contalistName}`,
		});

		res.status(200).json({
			success: true,
			message: "Contact list deleted successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error deleting contact list",
		});
	}
};

export const sampleCSV = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const userDir = path.join(__dirname, "..", "..", "..", "CSV", userId);
		const userCSVPath = path.join(userDir, "sample.csv");

		// Check if the user's specific CSV file exists
		let filePath;
		if (fs.existsSync(userCSVPath)) {
			filePath = userCSVPath;
		} else {
			// Fallback to the default sample.csv if user-specific file doesn't exist
			filePath = path.join(
				__dirname,
				"..",
				"..",
				"..",
				"CSV",
				"sample.csv",
			);
		}

		// Set response headers for CSV download
		res.setHeader("Content-Type", "text/csv");
		res.setHeader(
			"Content-Disposition",
			'attachment; filename="sample.csv"',
		);
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Expires", "0");

		// Send the file for download
		res.download(filePath, "sample.csv", (err) => {
			if (err) {
				console.error(err);
				res.status(500).send({
					message: err.message,
				});
			}
		});
	} catch (error) {
		console.error(error);
		res.status(500).send({
			message: "Unexpected error occurred.",
		});
	}
};

export const getCustomField = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) return next();
		if (!isString(userId)) return next();

		const result = await CustomField.aggregate([
			{
				$match: {
					customid: userId,
					status: { $ne: 0 },
				},
			},
			{
				$facet: {
					paginatedResults: [
						{ $skip: parseInt(skip) },
						{ $limit: parseInt(limit) },
					],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		// Extract paginated results and total count from the aggregation result
		const paginatedResults = result[0]?.paginatedResults || [];
		const totalCount = result[0]?.totalCount[0]?.total || 0;

		// Calculate total pages
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList.customField) {
				res.render("Contact-List/custom-field", {
					access,
					customFields: paginatedResults || [],
					page: parseInt(skip) / parseInt(limit) + 1,
					totalPages,
					countries,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: userId });
			res.render("Contact-List/custom-field", {
				access: access.access,
				customFields: paginatedResults || [],
				page: parseInt(skip) / parseInt(limit) + 1,
				totalPages,
				countries,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const createCustomField = async (req, res, next) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const { fieldName, fieldType } = req.body;
		if (!isString(fieldName)) return next();

		const userDir = path.join(__dirname, "..", "..", "..", "CSV", userId);
		const csvFilePath = path.join(userDir, "sample.csv");

		// Ensure the user's folder exists
		if (!fs.existsSync(userDir)) {
			fs.mkdirSync(userDir, { recursive: true });
			// Copy the default sample.csv into the user's folder
			const defaultCSV = path.join(
				__dirname,
				"..",
				"..",
				"..",
				"CSV",
				"sample.csv",
			);
			fs.copyFileSync(defaultCSV, csvFilePath);
		}

		// Check if we're adding a custom field of type "input"
		if (fieldType === "input") {
			// Read the user's CSV file
			let csvData = [];
			let headers = [];

			const fileContent = fs.readFileSync(csvFilePath, "utf8");

			const rows = fileContent
				.split(/\r?\n/)
				.map((row) => row.trim())
				.filter((row) => row !== "");

			headers = rows[0].split(",");

			// Check if the custom field already exists
			if (!headers.includes(fieldName)) {
				// Add new field
				headers.push(fieldName);

				// Update the CSV content and save it to the user's file
				const updatedCsv = [headers.join(",")]
					.concat(rows.slice(1))
					.join("\n");

				fs.writeFileSync(csvFilePath, updatedCsv, "utf8");
			}
		}

		// Save the new field to the database
		const unique_id = generateUniqueId();
		const newField = new CustomField({
			customid: userId,
			unique_id,
			clname: fieldName,
			cltype: fieldType,
		});

		await newField.save();
		// console.log(req.session.user.name);
		// Log activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Create",
			details: `Created a custom field named: ${fieldName}`,
		});

		// Send success response
		res.status(201).json({
			success: true,
			message: "Custom field created successfully",
			field: newField,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error creating custom field",
		});
	}
};

export const deleteCustomField = async (req, res, next) => {
	try {
		const fieldId = req.params?.id;
		if (!isString(fieldId)) return next();
		// Find the custom field based on the field ID
		const field = await CustomField.findOne({
			unique_id: fieldId,
		});

		if (!field) {
			return res.status(404).json({
				success: false,
				message: "Custom field not found",
			});
		}

		// If the field is of type 'input', proceed with updating the CSV file
		if (field.cltype === "input") {
			const fieldNameToDelete = field.clname;

			// Function to delete the field from the CSV

			// Call the function to delete the field from the CSV
			await updateCSVOnFieldDelete(
				req.session.user.id,
				fieldNameToDelete,
			);
			// console.log(req.session.user.name);
			// Log the activity
			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				actions: "Delete",
				details: `Marked the custom field named: ${field.clname} as deleted and removed from CSV`,
			});

			// Update the status to 0 to mark it as deleted in MongoDB
			field.status = 0;
			await field.save();
			// Respond to the client
			res.json({
				success: true,
				message:
					"Custom field marked as deleted and removed from CSV successfully",
			});
		} else {
			// For non-input fields, just log the activity and mark it as deleted in the DB
			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name || req.session?.addedUser?.name,
				actions: "Delete",
				details: `Marked the custom field named: ${field.clname} as deleted and removed from CSV`,
			});

			// Update the status to 0 to mark it as deleted in MongoDB
			field.status = 0;
			await field.save();

			// Respond to the client
			res.json({
				success: true,
				message: "Custom field marked as deleted successfully",
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error marking custom field as deleted",
		});
	}
};

export const updateContactListName = async (req, res) => {
	const contactListId = req.params.id;
	const { updatedValue } = req.body;

	if (!isString(contactListId, updatedValue)) return next();

	if (!updatedValue) {
		return res.status(400).json({
			success: false,
			message: "Updated value is required",
		});
	}

	try {
		console.log(updatedValue);
		// Find the contact list by ID and update the name
		const updatedContactList = await ContactList.findOneAndUpdate(
			{ contactId: contactListId },
			{ $set: { contalistName: updatedValue } }, // Update the 'name' field with the new value
			{ new: true }, // Return the updated document
		);

		console.log(updatedContactList.contalistName);
		await updatedContactList.save();

		if (!updatedContactList) {
			return res.status(404).json({
				success: false,
				message: "Contact list not found",
			});
		}

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Update",
			details: `Updated a contact List Name to : ${updatedValue}`,
		});

		// Send success response
		res.json({
			success: true,
			message: "Contact list name updated successfully",
			updatedContactList,
		});
	} catch (error) {
		console.error("Error updating contact list:", error);
		res.status(500).json({
			success: false,
			message: "An error occurred while updating the contact list",
		});
	}
};

export const getList = async (req, res) => {
	try {
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) return next();

		const result = await ContactList.aggregate([
			{
				// Match the documents where useradmin matches the userId and contact_status is not 0
				$match: {
					useradmin: userId,
					contact_status: { $ne: 0 },
				},
			},
			{
				$sort: { adddate: -1 },
			},
			{
				// Use $facet to return both paginated results and total count
				$facet: {
					paginatedResults: [
						{ $skip: parseInt(skip) },
						{ $limit: parseInt(limit) },
					],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		// Extract paginated results and total count from the aggregation result
		const contactLists = result[0]?.paginatedResults || [];
		const totalCount = result[0]?.totalCount[0]?.total || 0;

		// Calculate total pages
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList) {
				res.render("Contact-List/contact-list", {
					access: access,
					countries: countries,
					contacts: contactLists,
					page,
					totalPages,
					headers: [],
					data: [],
					errors: [],
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			// console.log(access.access);
			res.render("Contact-List/contact-list", {
				access: access.access,
				countries: countries,
				contacts: contactLists,
				page,
				totalPages,
				headers: [],
				data: [],
				errors: [],
				photo: req.session.user?.photo,
				name: req.session.user?.name,
				color: req.session.user?.color,
				whatsAppStatus: req.session?.user?.whatsAppStatus,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getContactList = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;

		const contactLists = await ContactList.find({
			useradmin: id,
			contact_status: { $ne: 0 },
		}).sort({
			adddate: -1,
		});

		res.json(contactLists);
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getCampaignContacts = async (req, res) => {
	try {
		const contacts = await Contacts.find({
			contactId: req.params.id,
			subscribe: { $ne: 0 },
		}).sort({ subscribe_date: -1 });
		// console.log(contacts);
		if (!contacts)
			return res.status(404).json({ error: "No contacts found" });
		res.json(contacts);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const searchContactLists = async (req, res, next) => {
	const { query } = req.query;
	const userId = req.session?.user?.id || req.session?.addedUser?.owner;
	const page = parseInt(req.query.page) || 1;
	const limit = 6;
	const skip = (page - 1) * limit;

	if (!isString(query)) return next();
	if (!isNumber(page)) return next();

	console.log("Searching for:", query);
	console.log("User ID:", userId);

	try {
		// Trim spaces and escape regex special characters
		const trimmedQuery = query.trim();
		const escapeRegex = (text) =>
			text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		const escapedQuery = escapeRegex(trimmedQuery);

		// console.log("Escaped Query:", escapedQuery); // Debugging the query

		// Aggregation pipeline with conditional regex search
		const matchStage = {
			useradmin: userId,
			contact_status: { $ne: 0 },
		};

		// Only add regex search if query is not empty
		if (escapedQuery) {
			matchStage.contalistName = {
				$regex: escapedQuery,
				$options: "imsx",
			};
		}

		const result = await ContactList.aggregate([
			{
				// Match the documents where useradmin matches the userId and contact_status is not 0
				$match: matchStage,
			},
			{
				$sort: { adddate: -1 },
			},
			{
				// Use $facet to return both paginated results and total count
				$facet: {
					paginatedResults: [
						{ $skip: parseInt(skip) },
						{ $limit: parseInt(limit) },
					],
					totalCount: [{ $count: "total" }],
				},
			},
		]);

		// Extract paginated results and total count from the aggregation result
		const contactLists = result[0]?.paginatedResults || [];
		const totalCount = result[0]?.totalCount[0]?.total || 0;

		// Calculate total pages
		const totalPages = Math.ceil(totalCount / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList.type) {
				res.render("Contact-List/partials/contactListTable", {
					access,
					contacts: contactLists,
					totalPages,
					page,
					photo: req.session.user?.photo,
					name: req.session.user.name,
					color: req.session.user.color,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({ unique_id: userId });
			res.render("Contact-List/partials/contactListTable", {
				access: access.access,
				contacts: contactLists,
				totalPages,
				page,
				photo: req.session.user?.photo,
				name: req.session.user.name,
				color: req.session.user.color,
				whatsAppStatus: access.WhatsAppConnectStatus,
			});
		}
	} catch (error) {
		console.error("Error fetching contact lists:", error);
		res.render("errors/serverError");
	}
};

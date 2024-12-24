import path from "path";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
// import Template from "../../models/templates.model.js";
import XLSX from "xlsx"; // Excel reading library
import Papa from "papaparse"; // CSV reading library
import Permissions from "../../models/permissions.model.js";
import CustomField from "../../models/customField.model.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";
import { fileURLToPath } from "url";
import ActivityLogs from "../../models/activityLogs.model.js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const previewContactList = async (req, res) => {
	try {
		const { fileData } = req.body;

		if (!fileData) {
			return res.status(400).json({
				success: false,
				message: "No file data provided.",
			});
		}

		// Parse file data
		let parsedData;
		try {
			parsedData = JSON.parse(fileData);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: "Invalid file format.",
			});
		}

		if (!parsedData.length) {
			return res.status(400).json({
				success: false,
				message: "No contacts found in the file.",
			});
		}

		// Required columns (Name, Number)
		const requiredColumns = ["Name", "Number"];

		// Fetch custom fields from DB
		const customFields = await CustomField.find({
			owner: req.session.user.id,
		});
		const customFieldNames = customFields.map((field) => field.fieldName);

		// Combine required columns with custom fields
		const expectedColumns = [...requiredColumns, ...customFieldNames];

		// Extract the header (first row) from the parsed data
		const actualColumns = Object.keys(parsedData[0]);

		// Check if required columns exist
		const missingColumns = requiredColumns.filter(
			(col) => !actualColumns.includes(col),
		);

		// Check if custom fields match
		const invalidColumns = actualColumns.filter(
			(col) =>
				!expectedColumns.includes(col) &&
				col !== "Name" &&
				col !== "Number",
		);

		// Check for empty values in the parsed data
		const emptyFields = parsedData
			.map((row, rowIndex) => {
				return Object.keys(row).map((key) => {
					if (!row[key] || row[key].trim() === "") {
						return {
							row: rowIndex + 1,
							column: key,
							value: row[key],
						};
					}
					return null;
				});
			})
			.flat()
			.filter((item) => item !== null);

		// If any errors, send them back for the preview
		if (
			missingColumns.length > 0 ||
			invalidColumns.length > 0 ||
			emptyFields.length > 0
		) {
			return res.status(400).json({
				success: false,
				message: "Validation errors found.",
				missingColumns,
				invalidColumns,
				emptyFields,
				parsedData,
			});
		}

		// Render the table HTML for the preview
		let tableHtml = "";
		tableHtml += '<table class="min-w-full table-auto"><thead><tr>';
		actualColumns.forEach((header) => {
			tableHtml += `<th class="px-4 py-2 border">${header}</th>`;
		});
		tableHtml += "</tr></thead><tbody>";

		parsedData.forEach((row) => {
			tableHtml += "<tr>";
			actualColumns.forEach((header) => {
				tableHtml += `<td class="px-4 py-2 border">${
					row[header] || ""
				}</td>`;
			});
			tableHtml += "</tr>";
		});

		tableHtml += "</tbody></table>";

		return res.status(200).json({
			success: true,
			message: "Data preview successful.",
			tableHtml, // Include the rendered HTML in the response
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "Error validating contact list.",
		});
	}
};

export const createList = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const { countryCode, listName, fileData } = req.body;

		if (!fileData) {
			return res.status(400).json({
				success: false,
				message: "No file data provided.",
			});
		}

		let parsedData;
		try {
			parsedData = JSON.parse(fileData);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: "Invalid file format.",
			});
		}

		if (!parsedData.length) {
			return res.status(400).json({
				success: false,
				message: "No contacts found in the file.",
			});
		}

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
			ContactListName: listName,
			owner: user._id,
			countryCode,
			participantCount,
		});

		await contactList.save();

		const contactsToSave = parsedData
			.map((contactData) => {
				let { Name, WhatsApp, ...additionalFields } = contactData;

				Name = (Name || "").trim();
				WhatsApp = (WhatsApp || "").trim();

				if (!Name || !WhatsApp) {
					console.log("Skipping invalid contact:", contactData);
					return null;
				}

				return new Contacts({
					userName: Name,
					whatsApp: WhatsApp,
					countryCode,
					owner: user._id,
					contactList: contactList._id,
					additionalAttributes: additionalFields,
				});
			})
			.filter((contact) => contact !== null);

		// Check if there are valid contacts to save
		if (contactsToSave.length > 0) {
			await Contacts.insertMany(contactsToSave);
		} else {
			return res.status(400).json({
				success: false,
				message: "No valid contacts to save.",
			});
		}

		// Extract all the keys (additional attributes) for sending to the frontend
		const dynamicAttributes = Object.keys(parsedData[0]).filter(
			(key) => key !== "Name" && key !== "WhatsApp",
		);

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Create",
			details: `Created a contact List named : ${listName}`,
		});

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

export const editList = async (req, res) => {
	try {
		const { id } = req.params;
		const { name, fileData, countryCode } = req.body;

		const contactList = await ContactList.findById(id);
		if (!contactList) {
			return res
				.status(404)
				.json({ success: false, message: "Contact list not found" });
		}

		// Update the fields
		contactList.ContactListName = name || contactList.name;
		contactList.fileData = fileData || contactList.fileData;
		contactList.countryCode = countryCode || contactList.countryCode;
		contactList.participantCount = fileData
			? fileData.length
			: contactList.participantCount;

		await contactList.save();

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Updated contact list named: ${contactList.name}`,
		});

		res.status(200).json({
			success: true,
			message: "Contact list updated successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error editing contact list",
		});
	}
};

export const deleteList = async (req, res) => {
	try {
		const { id } = req.params;
		const contactList = await ContactList.findByIdAndDelete(id);
		// console.log(contactList);
		if (!contactList) {
			return res
				.status(404)
				.json({ success: false, message: "Contact list not found" });
		}

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Delete",
			details: `Deleted a contact List named : ${contactList.ContactListName}`,
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
		const filePath = path.join(
			__dirname,
			"..",
			"..",
			"..",
			"public",
			"sample.csv",
		);

		res.setHeader("Content-Type", "text/csv");
		res.setHeader(
			"Content-Disposition",
			'attachment; filename="sample.csv"',
		);
		res.setHeader("Cache-Control", "no-cache");
		res.setHeader("Pragma", "no-cache");
		res.setHeader("Expires", "0");

		res.download(filePath, "sample.csv", (err) => {
			if (err) {
				console.error(err);
				res.status(500).send({
					message: err,
				});
			}
		});
	} catch (error) {
		res.status(500).send({
			message: "Unexpected error occurred.",
		});
	}
};

export const getCustomField = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const totalCustomFields = await CustomField.countDocuments({
			owner: userId,
		});
		const customFields = await CustomField.find({ owner: userId })
			.skip(skip)
			.limit(limit);

		const totalPages = Math.ceil(totalCustomFields / limit);

		res.render("Contact-List/custom-field", {
			customFields: customFields || [],
			page,
			totalPages,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error fetching custom fields",
		});
	}
};

export const createCustomField = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const { fieldName, fieldType } = req.body;
		const newField = new CustomField({
			owner: userId,
			fieldName,
			fieldType,
		});

		await newField.save();

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Create",
			details: `Created a custom field named : ${fieldName}`,
		});

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

export const deleteCustomField = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const fieldId = req.params.id;

		const field = await CustomField.findOneAndDelete({
			_id: fieldId,
			owner: userId,
		});

		if (!field) {
			return res.status(404).json({
				success: false,
				message: "Custom field not found",
			});
		}

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Delete",
			details: `Deleted a custom field named : ${field.fieldName}`,
		});

		res.json({
			success: true,
			message: "Custom field deleted successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error deleting custom field",
		});
	}
};

export const updateContactListName = async (req, res) => {
	const contactListId = req.params.id;
	const { updatedValue } = req.body;

	if (!updatedValue) {
		return res.status(400).json({
			success: false,
			message: "Updated value is required",
		});
	}

	try {
		console.log(updatedValue);
		// Find the contact list by ID and update the name
		const updatedContactList = await ContactList.findByIdAndUpdate(
			contactListId,
			{ $set: { ContactListName: updatedValue } }, // Update the 'name' field with the new value
			{ new: true }, // Return the updated document
		);

		console.log(updatedContactList.ContactListName);

		if (!updatedContactList) {
			return res.status(404).json({
				success: false,
				message: "Contact list not found",
			});
		}

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
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
		const userId = req.session.user.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const totalContactLists = await ContactList.countDocuments({
			owner: userId,
		});
		const contactLists = await ContactList.find({ owner: userId })
			.skip(skip)
			.limit(limit);

		const totalPages = Math.ceil(totalContactLists / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = Permissions.findOne({ unique_id: permissions });
			if (access.contactList) {
				res.render("Contact-List/contact-list", {
					access: access.contactList,
					countries: countries,
					contacts: contactLists,
					page,
					totalPages,
					headers: [],
					data: [],
					errors: [],
				});
			} else {
				res.render("Dashboard/dashboard", {
					access: access.dashboard,
					config: process.env.CONFIG_ID,
					app: process.env.FB_APP_ID,
					graph: process.env.FB_GRAPH_VERSION,
					status: req.session.user.WhatsAppConnectStatus,
					secret: process.env.FB_APP_SECRET,
				});
			}
		} else {
			const access = Permissions.findOne({ owner: userId });
			res.render("Contact-List/contact-list", {
				access: access.user?.contactList,
				countries: countries,
				contacts: contactLists,
				page,
				totalPages,
				headers: [],
				data: [],
				errors: [],
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error fetching contact lists",
		});
	}
};

export const getContactList = async (req, res) => {
	try {
		const { id } = req.session.user;

		const contactLists = await ContactList.find({ owner: id });

		res.json(contactLists);
	} catch (error) {
		res.status(500).json({ success: false, error: error.message });
	}
};

export const getCampaignContacts = async (req, res) => {
	try {
		const contacts = await Contacts.find({ contactList: req.params.id });
		if (!contacts)
			return res.status(404).json({ error: "No contacts found" });
		res.json(contacts);
	} catch (error) {
		res.status(500).json({ error: error.message });
	}
};

export const searchContactLists = async (req, res) => {
	const { query } = req.query;

	try {
		// Perform a case-insensitive search on the contact list name
		const contacts = await ContactList.find({
			ContactListName: { $regex: query, $options: "i" },
		});

		res.json({ contacts });
	} catch (error) {
		console.error("Error fetching contact lists:", error);
		res.status(500).json({ message: "Error fetching contact lists" });
	}
};

import path from "path";
import fs from "fs";
import csv from "csv-parser";
import { parseAsync } from "json2csv";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
// import Template from "../../models/templates.model.js";
import Permissions from "../../models/permissions.model.js";
import CustomField from "../../models/customField.model.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";
import { fileURLToPath } from "url";
import ActivityLogs from "../../models/activityLogs.model.js";
import dotenv from "dotenv";
import { generateUniqueId } from "../../utils/otpGenerator.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(
	__dirname,
	"..",
	"..",
	"..",
	"public",
	"sample.csv",
);

export const previewContactList = async (req, res) => {
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

		// Validate columns
		const requiredColumns = ["Name", "Number"];
		const customFields = await CustomField.find({
			customid: req.session.user.id,
		});
		const customFieldNames = customFields.map((field) => field.clname);
		const expectedColumns = [...requiredColumns, ...customFieldNames];

		const actualColumns = Object.keys(parsedData[0]);

		const missingColumns = requiredColumns.filter(
			(col) => !actualColumns.includes(col),
		);
		const invalidColumns = actualColumns.filter(
			(col) =>
				!expectedColumns.includes(col) &&
				col !== "Name" &&
				col !== "Number",
		);

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

		// Generate the HTML table for the preview
		let tableHtml = "<table class='min-w-full table-auto'><thead><tr>";

		// Add a new header for row numbers (Row Number)
		tableHtml += "<th class='px-4 py-2 border'>#</th>";

		// Add headers for the actual columns
		actualColumns.forEach((header, index) => {
			tableHtml += `<th class='px-4 py-2 border'>${header} (${
				index + 1
			})</th>`; // Add index number in header
		});
		tableHtml += "</tr></thead><tbody>";

		// Loop through the data and add rows with row numbers
		parsedData.forEach((row, rowIndex) => {
			tableHtml += "<tr>";

			// Add a column for row numbers
			tableHtml += `<td class='px-4 py-2 border'>${rowIndex + 1}</td>`;

			// Add the actual data columns
			actualColumns.forEach((header) => {
				tableHtml += `<td class='px-4 py-2 border'>${
					row[header] || ""
				}</td>`;
			});
			tableHtml += "</tr>";
		});

		tableHtml += "</tbody></table>";

		// Return validation errors if any
		if (
			missingColumns.length > 0 ||
			invalidColumns.length > 0 ||
			emptyFields.length > 0
		) {
			return res.status(400).json({
				success: false,
				missingColumns,
				invalidColumns,
				emptyFields,
				tableHtml,
			});
		}

		req.session.user.contactListCSV = parsedData;
		req.session.user.listName = listName;

		// Respond with the preview data
		return res.status(200).json({
			success: true,
			message: "Data preview successful.",
			tableHtml,
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({
			success: false,
			message: "An error occurred while validating the contact list.",
		});
	}
};

export const createList = async (req, res) => {
	try {
		if (
			!req.session.user ||
			!req.session.user.contactListCSV ||
			!req.session.user.listName
		) {
			return res.status(400).json({
				success: false,
				message: "Session data missing or incomplete.",
			});
		}

		const userId = req.session.user.id;
		const parsedData = req.session.user.contactListCSV;
		const listName = req.session.user.listName;

		req.session.user.contactListCSV = null;
		req.session.user.listName = null;

		const user = await User.findOne({ _id: userId });
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

		await contactList.save();

		const contactsToSave = parsedData
			.map((contactData) => {
				let { Name, Number, ...additionalFields } = contactData;

				return new Contacts({
					Name,
					wa_id: Number,
					contactId: contactList.contactId,
					masterExtra: additionalFields,
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
			customid: userId,
		});
		const customFields = await CustomField.find({ customid: userId })
			.skip(skip)
			.limit(limit);

		// console.log(customFields);
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

		// Only proceed if the field type is "input"
		if (fieldType === "input") {
			let csvData = [];
			let headers = [];

			// Reading the CSV file
			const fileContent = fs.readFileSync(csvFilePath, "utf8");
			const rows = fileContent.split("\n");
			headers = rows[0].split(",");

			// Check if the fieldName already exists in the CSV headers
			if (!headers.includes(fieldName)) {
				// Append the new field name to headers
				headers.push(fieldName);

				// Update the CSV with the new header
				const updatedCsv = [headers.join(",")]
					.concat(rows.slice(1))
					.join("\n");

				// Write the updated CSV back to the file
				fs.writeFileSync(csvFilePath, updatedCsv, "utf8");
			}
		}

		// Create a new custom field in the database
		const unique_id = generateUniqueId();
		const newField = new CustomField({
			customid: userId,
			unique_id,
			clname: fieldName,
			cltype: fieldType,
		});

		await newField.save();

		// Log activity
		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
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

export const deleteCustomField = async (req, res) => {
	try {
		const fieldId = req.params.id;

		// Find the custom field based on the field ID and user
		const field = await CustomField.findOne({
			customid: fieldId,
		});

		if (!field) {
			return res.status(404).json({
				success: false,
				message: "Custom field not found",
			});
		}

		// Update the status to 0 to mark it as deleted
		field.status = 0;
		await field.save();

		// Remove the field name from the CSV if it's an "input" field
		if (field.cltype === "input") {
			// Read the CSV
			const rows = [];
			fs.createReadStream(csvFilePath)
				.pipe(csv())
				.on("data", (row) => rows.push(row))
				.on("end", async () => {
					// Get headers from the first row
					const headers = Object.keys(rows[0]);

					// Exclude the deleted field name
					const updatedHeaders = headers.filter(
						(header) => header !== field.clname,
					);

					// Write the updated CSV without the deleted field's column
					const updatedRows = rows.map((row) => {
						const newRow = {};
						updatedHeaders.forEach((header) => {
							newRow[header] = row[header];
						});
						return newRow;
					});

					// Convert back to CSV and overwrite the existing file
					const csvData = await parseAsync(updatedRows, {
						fields: updatedHeaders,
					});
					fs.writeFileSync(csvFilePath, csvData);

					// Log the activity
					await ActivityLogs.create({
						name: req.session.user.name
							? req.session.user.name
							: req.session.addedUser.name,
						actions: "Delete",
						details: `Marked the custom field named : ${field.clname} as deleted and removed from CSV`,
					});

					// Respond to the client
					res.json({
						success: true,
						message:
							"Custom field marked as deleted and removed from CSV successfully",
					});
				});
		} else {
			// If it's not an "input" type, just log and respond
			await ActivityLogs.create({
				name: req.session.user.name
					? req.session.user.name
					: req.session.addedUser.name,
				actions: "Delete",
				details: `Marked the custom field named : ${field.clname} as deleted`,
			});

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
			useradmin: userId,
		});
		const contactLists = await ContactList.find({ useradmin: userId })
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

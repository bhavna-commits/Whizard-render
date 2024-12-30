import fs from "fs";
import path from "path";
import Papa from "papaparse";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import Campaign from "../../models/campaign.model.js";
import User from "../../models/user.model.js";
import { fileURLToPath } from "url";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { sendMessages } from "./campaign.functions.js";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const csvFilePath = path.join(
	__dirname,
	"..",
	"..",
	"..",
	"public",
	"sample.csv",
);

export const updateContact = async (req, res) => {
	const contactId = req.params.id;
	const { name, tags, validated } = req.body;

	try {
		// Find the contact by ID and update the fields
		const updatedContact = await ContactList.findByIdAndUpdate(
			contactId,
			{ name, tags, validated },
			{ new: true },
		);

		if (!updatedContact) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
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
		res.status(500).json({
			success: false,
			message: "Error updating contact",
		});
	}
};

export const getContacts = async (req, res) => {
	try {
		const id = req.params.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		const aggregation = [
			{ $match: { contactId: id, subscribe: 1 } },
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

		const name = (await ContactList.findOne({ contactId: id }))
			.contalistName;
		const totalPages = Math.ceil(totalContacts / limit);

		res.render("Contact-List/contactList-overview", {
			name: name,
			contacts: contactLists,
			page,
			totalPages,
			tags: [],
			id,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error fetching contacts",
		});
	}
};

export const editContact = async (req, res) => {
	const { id } = req.params;
	// console.log(id);
	const updatedData = req.body;

	if (!id || !updatedData) {
		res.status(401).json({
			success: false,
			message: "front-end is not providing complete data",
		});
	}

	try {
		const setData = {};
		for (const [key, value] of Object.entries(updatedData)) {
			setData[key] = value;
		}
		// console.log(setData);
		const contacts = await Contacts.findOneAndUpdate(
			{ keyId: id },
			{ $set: setData },
			{ new: true, strict: false },
		);
		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Edited contact of : ${contacts.Name}`,
		});
		res.json({ success: true });
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
};

export const deleteContact = async (req, res) => {
	const { id } = req.params;
	if (!id) {
		res.status(401).json({
			success: false,
			message: "front-end is not providing contact id",
		});
	}
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
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
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

export const updateCSVOnFieldDelete = async (fieldToDelete) => {
	try {
		// Read the CSV file content
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

export const createContact = async (req, res) => {
	const { contactId } = req.body;
	const contactData = req.body;

	const userId = req.session.user.id;
	const user = await User.findOne({ _id: userId });
	if (!user) {
		return res.status(404).json({
			success: false,
			message: "User not found.",
		});
	}

	const number = user.phone.countryCode + user.phone.number;

	if (!contactId || !contactData) {
		return res.status(400).json({
			success: false,
			message: "List ID or contact data is missing",
		});
	}

	try {
		// Extract contact data, excluding listId from the body
		const { Name, contactId, wa_id, ...newContactData } = contactData;
		const keyId = generateUniqueId();
		// Add the new contact to the Contacts collection
		const newContact = await Contacts.create({
			keyId,
			contactId,
			Name,
			wa_idK: `${number}_${keyId}`,
			wa_id,
			masterExtra: newContactData,
		});

		// Log the activity
		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Create",
			details: `Created a new contact: ${newContact.Name}`,
		});

		res.status(201).json({ success: true, contact: newContact });
	} catch (error) {
		console.error("Error adding contact:", error.message);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const createCampaign = async (req, res) => {
	try {
		const { templateId, contactListId, variables, schedule } = req.body;

		const newCampaign = new Campaign({
			unique_id: generateUniqueId(),
			templateId,
			contactListId,
			variables,
		});

		if (!schedule) {
			sendMessages(newCampaign);
		} else {
			newCampaign.scheduledAt = new Date(schedule);
			newCampaign.status = "SCHEDULED";
		}

		await newCampaign.save();
		res.status(201).json({
			message: "Campaign created successfully",
			campaign: newCampaign,
		});
	} catch (error) {
		console.error("Error creating campaign:", error);
		res.status(500).json({ message: "Error creating campaign" });
	}
};

import path from "path";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.modal.js";
import Template from "../../models/templates.model.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";

export const createList = async (req, res) => {
	try {
		const userId = req.session.user.id;
		const { countryCode, listName, fileData } = req.body;

		// Check if file data is provided
		if (!fileData) {
			return res.status(400).json({
				success: false,
				message: "No file data provided.",
			});
		}

		// Parse the uploaded file data (assumed JSON from the frontend)
		let parsedData;
		try {
			parsedData = JSON.parse(fileData);
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: "Invalid file format.",
			});
		}

		// Check if the parsed data contains any contacts
		if (!parsedData.length) {
			return res.status(400).json({
				success: false,
				message: "No contacts found in the file.",
			});
		}

		// Find the user by ID
		const user = await User.findById(userId);
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

		// Prepare contacts with additional attributes
		const contactsToSave = parsedData
			.map((contactData) => {
				// Destructure Name, WhatsApp, and additional attributes
				let { Name, WhatsApp, ...additionalFields } = contactData;

				// Trim leading and trailing whitespaces from Name and WhatsApp
				Name = (Name || "").trim();
				WhatsApp = (WhatsApp || "").trim();

				// Skip contacts with missing Name or WhatsApp
				if (!Name || !WhatsApp) {
					console.log("Skipping invalid contact:", contactData);
					return null; // Return null for invalid contacts
				}

				return new Contacts({
					userName: Name, // The "Name" column
					whatsApp: WhatsApp, // The "WhatsApp" column
					countryCode, // Same country code for all contacts
					owner: user._id, // Associate contact with the user
					contactList: contactList._id, // Link contact to the newly created list
					additionalAttributes: additionalFields, // Save all other columns as dynamic attributes
				});
			})
			.filter((contact) => contact !== null); // Remove any null values (invalid contacts)

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

		res.json({
			success: true,
			message: "Contact list and contacts created successfully",
			dynamicAttributes, // Send the dynamic attributes back to the frontend
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
		contactList.name = name || contactList.name;
		contactList.fileData = fileData || contactList.fileData;
		contactList.countryCode = countryCode || contactList.countryCode;
		contactList.participantCount = fileData
			? fileData.length
			: contactList.participantCount; // Recalculate participant count based on new data

		await contactList.save();

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
		const contactList = await ContactList.findById(id);
		if (!contactList) {
			return res
				.status(404)
				.json({ success: false, message: "Contact list not found" });
		}

		await contactList.remove();

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
	const __dirname = path.resolve();
	res.download(
		path.join(__dirname, "..", "public", "sample.csv"),
		"sample.csv",
		(err) => {
			if (err) {
				res.status(500).send({
					message: "Error downloading the sample CSV file.",
				});
			}
		},
	);
};

export const addCustomField = async (req, res) => {
	try {
		// Get the authenticated user's ID from the session
		const userId = req.session.user.id; // Assuming req.session.user contains authenticated user data

		// Fetch the user's contact lists
		let contactLists = await ContactList.find({ owner: userId });
		// console.log(contactLists);
		if (!contactLists.length) {
			res.render("Contact-List/custom-field", {
				countries: countries,
				contacts: [],
			});
		} else {
			res.render("Contact-List/custom-field", {
				countries: countries,
				contacts: contactLists,
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

export const updateContactListName = async (req, res) => {
	const contactListId = req.params.id; // Get the contact list ID from the URL parameter
	const { updatedValue } = req.body; // Get the updated value from the request body

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
		// Get the authenticated user's ID from the session
		const userId = req.session.user.id; // Assuming req.session.user contains authenticated user data

		// Fetch the user's contact lists
		let contactLists = await ContactList.find({ owner: userId });
		// console.log(contactLists);
		if (!contactLists.length) {
			res.render("Contact-List/contact-list", {
				countries: countries,
				contacts: [],
			});
		} else {
			res.render("Contact-List/contact-list", {
				countries: countries,
				contacts: contactLists,
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

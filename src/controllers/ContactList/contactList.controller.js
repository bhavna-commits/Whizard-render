import path from "path";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.modal.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";

export const createList = async (req, res) => {
	try {
		const userId = req.session.user.id;

		const { countryCode, listName, fileData } = req.body;

		// Check if file data is provided
		if (!fileData) {
			return res
				.status(400)
				.json({ success: false, message: "No file data provided" });
		}

		// Parse the file data (assuming it's in JSON format)
		const parsedData = JSON.parse(fileData);

		// Check if the user exists (optional but good practice)
		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		const participantCount = parsedData.length;

		// Create the contact list and associate it with the user
		const contactList = new ContactList({
			ContactListName: listName, // Updated to match the schema
			owner: user._id, // Reference the user by their ID
			countryCode, // Pass countryCode
			participantCount, // Count of participants from the file
		});

		// Save the contact list to the database
		await contactList.save();

		// Create individual contacts and associate them with the contact list
		const contactsToSave = parsedData.map((contactData) => {
			return new Contacts({
				userName: contactData.name, // Assuming `name` exists in the parsed data
				whatsApp: contactData.whatsApp, // Assuming `whatsApp` exists in the parsed data
				tags: contactData.tags || "Hot Leads", // Default to "Hot Leads" if no tag is provided
				countryCode: countryCode, // Use the same countryCode for each contact
				validated: contactData.validated || "Verified", // Default to "Verified"
				owner: user._id, // Associate contact with the user
				contactList: contactList._id, // Associate contact with the newly created contact list
			});
		});

		// Save all the contacts in one go
		await Contacts.insertMany(contactsToSave);

		res.json({
			success: true,
			message: "Contact list and contacts created successfully",
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

// Delete a contact list
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

export const getList = async (req, res) => {
	try {
		// Get the authenticated user's ID from the session
		const userId = req.session.user.id; // Assuming req.session.user contains authenticated user data

		// Fetch the user's contact lists
		let contactLists = await ContactList.find({ user: userId });

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


import path from "path";
import ContactList from "../../models/contactList.model.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";

export const createList = async (req, res) => {
	try {
		const { formData } = req.body;
		console.log(req.body);
		if (!formData) {
			return res
				.status(400)
				.json({ success: false, message: "No file data provided" });
		}
		const { countryCode, listName: name, fileData } = formData;

		const parsedData = JSON.parse(fileData);

		// Assuming you have the user's ID from the session or token
		const userId = req.session.user.id; // Assuming req.user contains the authenticated user's data

		// Check if the user exists (optional)
		const user = await User.findById(userId);
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		const participantCount = fileData.length;
		// Create the contact list and refer to the user
		const contactList = new ContactList({
			user: user._id, // Reference the user by their ID
			name: name,
			fileData: parsedData, // Store the file path
			countryCode,
			participantCount,
		});

		await contactList.save();

		res.json({
			success: true,
			message: "Contact list created successfully",
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
		const contactLists = await ContactList.find({ user: userId });

		if (!contactLists) {
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

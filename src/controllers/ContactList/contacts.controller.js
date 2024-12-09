// Controller to update a contact
import path from "path";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.modal.js";
import User from "../../models/user.model.js";
import { countries } from "../../utils/dropDown.js";

export const updateContact = async (req, res) => {
	const contactId = req.params.id;
	const { name, tags, validated } = req.body;

	try {
		// Find the contact by ID and update the fields
		const updatedContact = await ContactList.findByIdAndUpdate(
			contactId,
			{ name, tags, validated },
			{ new: true }, // Return the updated document
		);

		if (!updatedContact) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

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

		let contactLists = await Contacts.find({ contactList: id });
		let name = await ContactList.findById(id);
		name = name.ContactListName;
		// console.log(name);
		if (!contactLists.length) {
			res.render("Contact-List/contactList-overview", {
				// countries: countries,
				name: name,
				contacts: [],
			});
		} else {
			res.render("Contact-List/contactList-overview", {
				// countries: countries,
				name: name,
				contacts: contactLists,
			});
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error fetching contacts",
		});
	}
};

// Controller to delete a contact
// export const deleteContact = async (req, res) => {
// 	const contactId = req.params.id;

// 	try {
// 		// Find the contact by ID and delete it
// 		const deletedContact = await ContactList.findByIdAndDelete(contactId);
// 		await ContactList.findByIdAndUpdate(contactId, {
// 			$inc: { participantCount: -1 },
// 		});

// 		if (!deletedContact) {
// 			return res.status(404).json({
// 				success: false,
// 				message: "Contact not found",
// 			});
// 		}

// 		res.json({
// 			success: true,
// 			message: "Contact deleted successfully",
// 		});
// 	} catch (error) {
// 		console.error(error);
// 		res.status(500).json({
// 			success: false,
// 			message: "Error deleting contact",
// 		});
// 	}
// };

export const editContact = async (req, res) => {
	const { id } = req.params;
	console.log(id);
	const updatedData = req.body;
	console.log(updatedData);

	if (!id || !updatedData) {
		res.status(401).json({
			success: false,
			message: "front-end is not providing complete data",
		});
	}

	try {
		await Contacts.findByIdAndUpdate(id, updatedData);
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
		// Find the contact by ID to get the associated contact list
		const contact = await Contacts.findById(id);
		if (!contact) {
			return res
				.status(404)
				.json({ success: false, message: "Contact not found" });
		}

		// Get the contact list ID from the contact
		const contactListId = contact.contactList;

		// Delete the contact
		await Contacts.findByIdAndDelete(id);

		// Decrement the participant count in the related contact list
		await ContactList.findByIdAndUpdate(contactListId, {
			$inc: { participantCount: -1 },
		});

		// Send a success response
		res.json({
			success: true,
			message: "Contact deleted and participant count updated",
		});
	} catch (error) {
		// Handle any errors
		console.error("Error deleting contact:", error);
		res.status(500).json({
			success: false,
			message: "An error occurred while deleting the contact.",
		});
	}
};

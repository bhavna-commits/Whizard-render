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

		if (!contactLists.length) {
			res.render("Contact-List/contactList-overview", {
				// countries: countries,
				contacts: [],
			});
		} else {
			res.render("Contact-List/contactList-overview", {
				// countries: countries,
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
export const deleteContact = async (req, res) => {
	const contactId = req.params.id;

	try {
		// Find the contact by ID and delete it
		const deletedContact = await ContactList.findByIdAndDelete(contactId);
		await ContactList.findByIdAndUpdate(contactId, {
			$inc: { participantCount: -1 },
		});

		if (!deletedContact) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

		res.json({
			success: true,
			message: "Contact deleted successfully",
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			success: false,
			message: "Error deleting contact",
		});
	}
};

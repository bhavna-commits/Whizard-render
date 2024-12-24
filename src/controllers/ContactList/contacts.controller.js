import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";

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

		const totalContacts = await Contacts.countDocuments({
			contactList: id,
		});
		const contactLists = await Contacts.find({ contactList: id })
			.skip(skip)
			.limit(limit);

		const name = (await ContactList.findById(id)).ContactListName;
		const totalPages = Math.ceil(totalContacts / limit);

		res.render("Contact-List/contactList-overview", {
			name: name,
			contacts: contactLists,
			page,
			totalPages,
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
		const contacts = await Contacts.findByIdAndUpdate(id, updatedData);
		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Edited contact of : ${contacts.userName}`,
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
		const contact = await Contacts.findById(id);
		if (!contact) {
			return res
				.status(404)
				.json({ success: false, message: "Contact not found" });
		}

		const contactListId = contact.contactList;
		const contacts = await Contacts.findById(id);
		await Contacts.findByIdAndDelete(id);
		await ContactList.findByIdAndUpdate(contactListId, {
			$inc: { participantCount: -1 },
		});

		await ActivityLogs.create({
			name: req.session.user.name
				? req.session.user.name
				: req.session.addedUser.name,
			actions: "Update",
			details: `Deleted contact of : ${contacts.userName}`,
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


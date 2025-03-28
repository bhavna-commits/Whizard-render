import ContactsTemp from "../../models/contactsTemp.model.js";
import ChatsUsers from "../../models/chatsUsers.model.js";

export const UpdateContacts = async () => {
	try {
		const contacts = await ContactsTemp.find();

		for (const contact of contacts) {
			// Use the wa_id from ContactsTemp for matching.
			const existingEntry = await ChatsUsers.findOne({
				FB_PHONE_ID: contact.FB_PHONE_ID,
				wa_id: contact.wa_id,
			});

			if (existingEntry) {
				// Prepare updated arrays for contactName and nameContactRelation.
				let updatedContactNames = existingEntry.contactName || [];
				if (!updatedContactNames.includes(contact.Name)) {
					updatedContactNames.push(contact.Name);
				}

				let updatedRelations = existingEntry.nameContactRelation || [];
				// Check if a relation with this contactId already exists.
				const relationExists = updatedRelations.some(
					(rel) => rel.contactListId === contact.contactId,
				);
				if (!relationExists) {
					updatedRelations.push({
						name: contact.Name,
						contactListId: contact.contactId,
					});
				}

				// Update the existing entry with new data.
				const updateData = {
					contactName: updatedContactNames,
					nameContactRelation: updatedRelations,
				};

				await ChatsUsers.updateOne(
					{ _id: existingEntry._id },
					{ $set: updateData },
				);
			} else {
				// No existing entry: create a new one.
				const newEntry = {
					FB_PHONE_ID: contact.FB_PHONE_ID,
					useradmin: contact.useradmin,
					unique_id: contact.unique_id, // Or generate a new unique ID if needed.
					// Initialize arrays with the current contact's data.
					contactName: [contact.Name],
					nameContactRelation: [
						{
							name: contact.Name,
							contactListId: contact.contactId,
						},
					],
					wa_id: contact.wa_id,
					createdAt: contact.createdAt,
					updatedAt: contact.updatedAt,
				};
				await ChatsUsers.create(newEntry);
			}
		}

		// After processing all records, clear the temporary contacts collection.
		await ContactsTemp.deleteMany({});
		console.log(
			"Processed and cleared temporary contacts at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing contacts update:", error);
	}
};

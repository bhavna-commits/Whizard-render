import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MONGO_URI; // Mongo URI already contains the db name
const client = new MongoClient(url, { useUnifiedTopology: true });

// Minimal unique ID generator
export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

async function updateContacts() {
	try {
		await client.connect();
		console.log("Connected to DB");

		const db = client.db(); // Uses the db name from your connection URI
		// Adjust collection names as necessary
		const contactsTempCollection = db.collection("contactsTemp");
		const chatsUsersCollection = db.collection("chatsUsers");
		const usersCollection = db.collection("user"); // or "users" if that’s your collection name
		const addedUsersCollection = db.collection("addedUser"); // or "addedUsers"

		const contacts = await contactsTempCollection.find().toArray();

		for (const contact of contacts) {
			// Get owner details from the users collection
			const owner = await usersCollection.findOne({
				unique_id: contact.useradmin,
			});
			if (!owner) continue;

			// Get agents from the addedUsers collection
			let agents = await addedUsersCollection
				.find({ useradmin: owner.unique_id, deleted: false })
				.toArray();
			agents = agents.map((a) => a.unique_id);

			// Try to find an existing chatsUsers entry using useradmin and wa_id
			const existingEntry = await chatsUsersCollection.findOne({
				useradmin: contact.useradmin,
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
					agent: agents,
				};

				await chatsUsersCollection.updateOne(
					{ _id: existingEntry._id },
					{ $set: updateData },
				);
			} else {
				// Create a new entry if none exists.
				const newEntry = {
					FB_PHONE_ID: contact.FB_PHONE_ID,
					useradmin: contact.useradmin,
					unique_id: generateUniqueId(),
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
					agent: agents,
				};
				await chatsUsersCollection.insertOne(newEntry);
			}
		}

		// After processing, clear the temporary contacts collection.
		await contactsTempCollection.deleteMany({});
		console.log(
			"Processed and cleared temporary contacts at",
			new Date().toLocaleString(),
		);
	} catch (error) {
		console.error("Error processing contacts update:", error);
	} finally {
		await client.close();
	}
}

updateContacts();

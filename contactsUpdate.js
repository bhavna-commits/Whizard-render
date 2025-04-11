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

		const db = client.db();
		const contactsTempCollection = db.collection("contactsTemp");
		const chatsUsersCollection = db.collection("chatsUsers");

		const contacts = await contactsTempCollection.find().toArray();

		const existingEntriesMap = new Map();

		// Fetch all existing wa_id + useradmin combos to avoid findOne per contact
		const waUserPairs = contacts.map((c) => ({
			wa_id: c.wa_id,
			useradmin: c.useradmin,
		}));

		const existingEntries = await chatsUsersCollection
			.find({ $or: waUserPairs })
			.toArray();

		for (const entry of existingEntries) {
			existingEntriesMap.set(`${entry.useradmin}_${entry.wa_id}`, entry);
		}

		const bulkOps = [];
		const newEntries = [];

		for (const contact of contacts) {
			const key = `${contact.useradmin}_${contact.wa_id}`;
			const existingEntry = existingEntriesMap.get(key);

			if (existingEntry) {
				// Update existing
				let updatedContactNames = existingEntry.contactName || [];
				if (!updatedContactNames.includes(contact.Name)) {
					updatedContactNames.push(contact.Name);
				}

				let updatedRelations = existingEntry.nameContactRelation || [];
				const relationExists = updatedRelations.some(
					(rel) => rel.contactListId === contact.contactId,
				);

				if (!relationExists) {
					updatedRelations.push({
						name: contact.Name,
						contactListId: contact.contactId,
					});
				}

				bulkOps.push({
					updateOne: {
						filter: { _id: existingEntry._id },
						update: {
							$set: {
								contactName: updatedContactNames,
								nameContactRelation: updatedRelations,
								agent: [contact.agent],
								updatedAt: contact.updatedAt,
							},
						},
					},
				});
			} else {
				// Prepare new insert
				newEntries.push({
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
					agent: [contact.agent],
				});
			}
		}

		// Perform all updates and inserts at once
		if (bulkOps.length) {
			await chatsUsersCollection.bulkWrite(bulkOps);
		}
		if (newEntries.length) {
			await chatsUsersCollection.insertMany(newEntries);
		}

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

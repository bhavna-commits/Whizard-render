import { MongoClient } from "mongodb";
import crypto from "crypto";
import contactsTempCollection from "./src/models/contactsTemp.model.js";
import chatsUsersCollection from "./src/models/chatsUsers.model.js";
import dotenv from "dotenv";
dotenv.config();

export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

export async function updateContacts() {
	try {
		console.log("✅ Starting contacts update");

		const contacts = await contactsTempCollection.find().lean();
		if (!contacts.length) {
			console.log("⚠️  No temp contacts found, nothing to do");
			return;
		}

		// Use $and to properly pair wa_id + useradmin
		const waUserPairs = contacts.map((c) => ({
			$and: [{ wa_id: c.wa_id }, { useradmin: c.useradmin }],
		}));

		let existingEntries = [];
		if (waUserPairs.length) {
			existingEntries = await chatsUsersCollection
				.find({ $or: waUserPairs })
				.lean();
		}

		const existingMap = new Map();
		existingEntries.forEach((entry) => {
			existingMap.set(`${entry.useradmin}_${entry.wa_id}`, entry);
		});

		const bulkOps = [];
		const newEntries = [];

		for (const contact of contacts) {
			const key = `${contact.useradmin}_${contact.wa_id}`;
			const ex = existingMap.get(key);

			if (ex) {
				// Merge contactName using Set to prevent duplicates
				const updatedContactNames = new Set(
					Array.isArray(ex.contactName) ? ex.contactName : [],
				);
				updatedContactNames.add(contact.Name);

				// Merge nameContactRelation
				const updatedRelations = Array.isArray(ex.nameContactRelation)
					? [...ex.nameContactRelation]
					: [];
				if (
					!updatedRelations.some(
						(r) => r.contactListId === contact.contactId,
					)
				) {
					updatedRelations.push({
						name: contact.Name,
						contactListId: contact.contactId,
					});
				}

				// Merge agents with deduplication
				const existingAgents = new Set(
					Array.isArray(ex.agent) ? ex.agent : [],
				);
				const incomingAgents = Array.isArray(contact.agent)
					? contact.agent
					: [contact.agent];
				incomingAgents.forEach((ag) => existingAgents.add(ag));

				bulkOps.push({
					updateOne: {
						filter: { _id: ex._id },
						update: {
							$set: {
								contactName: [...updatedContactNames],
								nameContactRelation: updatedRelations,
								agent: [...existingAgents],
								updatedAt: contact.updatedAt,
							},
						},
					},
				});
			}
		}

		if (bulkOps.length) {
			const result = await chatsUsersCollection.bulkWrite(bulkOps);
			console.log(`🛠️  Modified ${result.modifiedCount} existing docs`);
		}
		if (newEntries.length) {
			const inserted = await chatsUsersCollection.insertMany(newEntries);
			console.log(`➕ Inserted ${newEntries.length} new docs`);
		}

		const del = await contactsTempCollection.deleteMany({});
		console.log(`🗑️  Cleared ${del.deletedCount} temp contacts`);
	} catch (error) {
		console.error("🔥 Error processing contacts update:", error);
	}
}

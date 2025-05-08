// contactsUpdateCronNative.js
import crypto from "crypto";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MONGO_URI;
const client = new MongoClient(url, { useUnifiedTopology: true });

export const generateUniqueId = () =>
	crypto.randomBytes(5).toString("hex").slice(0, 10);

export async function updateContacts() {
	try {
		await client.connect();
		console.log("✅ Connected to MongoDB for contacts update");

		const db = client.db();
		const contactsTempCollection = db.collection("contactsTemp");
		const chatsUsersCollection = db.collection("chatsUsers");

		const contacts = await contactsTempCollection.find().toArray();
		if (!contacts.length) {
			console.log("⚠️ No temp contacts found, nothing to do");
			return;
		}

		// Properly pair useradmin + wa_id using $and
		const waUserPairs = contacts.map((c) => ({
			$and: [
				{ wa_id: c.wa_id },
				{ useradmin: c.useradmin },
				{ FB_PHONE_ID: c.FB_PHONE_ID },
			],
		}));

		let existingEntries = [];
		if (waUserPairs.length) {
			existingEntries = await chatsUsersCollection
				.find({ $or: waUserPairs })
				.toArray();
		}

		const bulkOps = [];

		for (const contact of contacts) {
			const ex = existingEntries.find(
				(e) =>
					e.wa_id === contact.wa_id &&
					e.useradmin === contact.useradmin &&
					e.FB_PHONE_ID === contact.FB_PHONE_ID,
			);

			if (ex) {
				// contactName: deduplicated with Set
				const updatedContactNames = new Set(
					Array.isArray(ex.contactName) ? ex.contactName : [],
				);
				updatedContactNames.add(contact.Name);

				// nameContactRelation: only push new contactListId
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

				// agent: deduplicated with Set
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

		const del = await contactsTempCollection.deleteMany({});
		console.log(`🗑️ Cleared ${del.deletedCount} temp contacts`);
	} catch (error) {
		console.error("🔥 Error processing contacts update:", error);
	} finally {
		await client.close();
		console.log("👋 Closed MongoDB connection");
	}
}

if (import.meta.url === process.argv[1]) {
	updateContacts();
}

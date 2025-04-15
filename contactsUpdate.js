// contactsUpdateCronNative.js
import crypto from "crypto";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MONGO_URI; // Mongo URI already contains the db name
const client = new MongoClient(url, { useUnifiedTopology: true });

// Minimal unique ID generator
export const generateUniqueId = () =>
	crypto.randomBytes(5).toString("hex").slice(0, 10);

// Main update function; runs as a standalone cron job
export async function updateContacts() {
	try {
		await client.connect();
		console.log("✅ Connected to MongoDB for contacts update");

		const db = client.db();
		const contactsTempCollection = db.collection("contactsTemp");
		const chatsUsersCollection = db.collection("chatsUsers");

		// 1) Load all temp contacts
		const contacts = await contactsTempCollection.find().toArray();
		if (!contacts.length) {
			console.log("⚠️ No temp contacts found, nothing to do");
			return;
		}

		// 2) Build filter array for existing lookups
		const waUserPairs = contacts.map((c) => ({
			wa_id: c.wa_id,
			useradmin: c.useradmin,
		}));

		// 3) Fetch existing entries only if we have filters
		let existingEntries = [];
		if (waUserPairs.length) {
			existingEntries = await chatsUsersCollection
				.find({ $or: waUserPairs })
				.toArray();
		} else {
			console.log("⚠️ No WA/useradmin pairs, skipping existing lookup");
		}

		// 4) Map existing by composite key
		const existingMap = new Map();
		for (const entry of existingEntries) {
			existingMap.set(`${entry.useradmin}_${entry.wa_id}`, entry);
		}

		const bulkOps = [];
		const newEntries = [];

		// 5) Prepare bulk operations and new documents
		for (const contact of contacts) {
			const key = `${contact.useradmin}_${contact.wa_id}`;
			const ex = existingMap.get(key);

			if (ex) {
				// Merge contactName
				const updatedContactNames = Array.isArray(ex.contactName)
					? [...ex.contactName]
					: [];
				if (!updatedContactNames.includes(contact.Name)) {
					updatedContactNames.push(contact.Name);
				}

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

				// Merge agent array without nesting
				const existingAgents = Array.isArray(ex.agent)
					? [...ex.agent]
					: [];
				const incomingAgents = Array.isArray(contact.agent)
					? contact.agent
					: [contact.agent];
				for (const ag of incomingAgents) {
					if (!existingAgents.includes(ag)) {
						existingAgents.push(ag);
					}
				}

				bulkOps.push({
					updateOne: {
						filter: { _id: ex._id },
						update: {
							$set: {
								contactName: updatedContactNames,
								nameContactRelation: updatedRelations,
								agent: existingAgents,
								updatedAt: contact.updatedAt,
							},
						},
					},
				});
			} else {
				// New entry
				const agentsArr = Array.isArray(contact.agent)
					? contact.agent
					: [contact.agent];
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
					agent: agentsArr,
				});
			}
		}

		// 6) Execute bulk updates & inserts
		if (bulkOps.length) {
			const result = await chatsUsersCollection.bulkWrite(bulkOps);
			console.log(`🛠️ Modified ${result.modifiedCount} existing docs`);
		}
		if (newEntries.length) {
			const inserted = await chatsUsersCollection.insertMany(newEntries);
			console.log(
				`➕ Inserted ${
					inserted.insertedCount || inserted.length
				} new docs`,
			);
		}

		// 7) Clear temp collection
		const del = await contactsTempCollection.deleteMany({});
		console.log(`🗑️ Cleared ${del.deletedCount} temp contacts`);
	} catch (error) {
		console.error("🔥 Error processing contacts update:", error);
	} finally {
		await client.close();
		console.log("👋 Closed MongoDB connection");
	}
}

// Run immediately if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
	updateContacts();
}

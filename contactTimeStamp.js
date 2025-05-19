import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
	console.error("❌ MONGO_URI is not defined in your .env");
	process.exit(1);
}

async function run() {
	const client = new MongoClient(MONGO_URI);

	try {
		await client.connect();
		console.log("✅ Connected to MongoDB");

		const db = client.db();
		const chatsUsersCollection = db.collection("chatsusers");

		const cursor = chatsUsersCollection.find({
			messageStatus: { $exists: false },
		});

		const docsToUpdate = await cursor.toArray();

		if (!docsToUpdate.length) {
			console.log("👍 No updates needed.");
			return;
		}

		const bulkOps = docsToUpdate.map((doc) => ({
			updateOne: {
				filter: { _id: doc._id },
				update: {
					$set: {
						messageStatus: "SENT",
						lastSend: Date.now(),
					},
				},
			},
		}));

		const result = await chatsUsersCollection.bulkWrite(bulkOps);
		console.log(`✅ Updated ${result.modifiedCount} documents.`);
	} catch (err) {
		console.error("🔥 Error:", err);
	} finally {
		await client.close();
		console.log("👋 Disconnected from MongoDB");
	}
}

run();

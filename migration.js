import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.MONGO_URI, {
	useUnifiedTopology: true,
});

async function flattenAgentField() {
	try {
		await client.connect();
		console.log("✅ Connected to MongoDB");

		const db = client.db();
		const collection = db.collection("chatsusers");

		const results = await collection
			.find({ agent: { $exists: true } })
			.project({ agent: 1 })
			.limit(10)
			.toArray();
		console.log(JSON.stringify(results, null, 2));


		// Find docs where agent contains any nested array using aggregation expression
		const docs = await collection
			.find()
			.toArray();

		console.log(docs);

		let updatedCount = 0;

		for (const doc of docs) {
			const flattened = doc.agent.flat();
			await collection.updateOne(
				{ _id: doc._id },
				{ $set: { agent: flattened } },
			);
			updatedCount++;
		}

		console.log(`🛠️ Flattened 'agent' arrays in ${updatedCount} documents`);
	} catch (err) {
		console.error("🔥 Error during migration:", err);
	} finally {
		await client.close();
		console.log("👋 Disconnected from MongoDB");
	}
}

flattenAgentField();

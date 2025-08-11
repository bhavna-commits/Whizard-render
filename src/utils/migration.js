import User from "../models/user.model.js";
import AddedUser from "../models/addedUser.model.js";
import Permissions from "../models/permissions.model.js";
import ContactList from "../models/contactList.model.js";
import Templates from "../models/templates.model.js";
import CustomField from "../models/customField.model.js";

let migrationPending = true;

export default async function runMigration() {
	try {
		console.log("🚀 Starting migration...");

		// Build maps ONCE
		const [userMap, addedUserMap] = await Promise.all([
			buildUserMap(),
			buildAddedUserMap(),
		]);

		await Promise.all([
			migrateUsers(userMap),
			migratePermissions(),
			migrateTemplates(userMap),
			migrateCustomFields(userMap),
			migrateContactLists(userMap, addedUserMap),
			migratePaymentPlaceDefault(),
		]);		

		console.log("🎉 Migration complete");
		migrationPending = false;
	} catch (err) {
		console.error("❌ Migration failed:", err);
	}
}

async function migratePaymentPlaceDefault() {
	const cursor = User.find().cursor();
	const ops = [];
	for await (const user of cursor) {
		ops.push({
			updateOne: {
				filter: { _id: user._id },
				update: { $set: { "payment.place": "External" } },
			},
		});
		if (ops.length >= 500) {
			await User.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await User.bulkWrite(ops);
	console.log("✅ payment.place defaults set");
}

async function migrateUsers() {
	const cursor = User.find().cursor();
	const ops = [];
	for await (const user of cursor) {
		ops.push({
			updateOne: {
				filter: { _id: user._id },
				update: {
					$set: {
						"access.settings.whatsAppAccountDetails": true,
						"access.settings.accountDetails": true,
						"access.settings.payment": true,
					},
					$unset: { paymentCard: "" },
				},
			},
		});
		if (ops.length >= 500) {
			await User.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await User.bulkWrite(ops);
	console.log("✅ Users updated");
}

async function migratePermissions() {
	const cursor = Permissions.find().cursor();
	const ops = [];
	for await (const permission of cursor) {
		ops.push({
			updateOne: {
				filter: { _id: permission._id },
				update: {
					$set: {
						"settings.whatsAppAccountDetails": false,
						"settings.accountDetails": false,
						"settings.payment": false,
					},
				},
			},
		});
		if (ops.length >= 500) {
			await Permissions.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await Permissions.bulkWrite(ops);
	console.log("✅ Permissions updated");
}

async function migrateTemplates(userMap) {
	const cursor = Templates.find().cursor();
	const ops = [];
	for await (const template of cursor) {
		if (!template.agentName && userMap[template.useradmin]) {
			ops.push({
				updateOne: {
					filter: { _id: template._id },
					update: {
						$set: {
							agentName: userMap[template.useradmin],
							FB_PHONE_ID:
								template.FB_PHONE_ID ?? "173988142466890",
						},
					},
				},
			});
		}
		if (ops.length >= 500) {
			await Templates.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await Templates.bulkWrite(ops);
	console.log("✅ Templates updated");
}

async function migrateCustomFields(userMap) {
	const cursor = CustomField.find().cursor();
	const ops = [];
	for await (const field of cursor) {
		if (!field.agentName && userMap[field.customid]) {
			ops.push({
				updateOne: {
					filter: { _id: field._id },
					update: { $set: { agentName: userMap[field.customid] } },
				},
			});
		}
		if (ops.length >= 500) {
			await CustomField.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await CustomField.bulkWrite(ops);
	console.log("✅ CustomFields updated");
}

async function migrateContactLists(userMap, addedUserMap) {
	const cursor = ContactList.find().cursor();
	const ops = [];
	for await (const list of cursor) {
		if (
			!list.agentName &&
			Array.isArray(list.agent) &&
			list.agent.length > 0 &&
			list.FB_PHONE_ID
		) {
			const firstId = list.agent[0];
			const name = addedUserMap[firstId] || userMap[firstId];
			if (name) {
				ops.push({
					updateOne: {
						filter: { _id: list._id },
						update: { $set: { agentName: name } },
					},
				});
			}
		}
		if (ops.length >= 500) {
			await ContactList.bulkWrite(ops);
			ops.length = 0;
		}
	}
	if (ops.length) await ContactList.bulkWrite(ops);
	console.log("✅ ContactLists updated");
}

async function buildUserMap() {
	const cursor = User.find({}, { unique_id: 1, name: 1 }).cursor();
	const map = {};
	for await (const user of cursor) {
		map[user.unique_id] = user.name;
	}
	return map;
}

async function buildAddedUserMap() {
	const cursor = AddedUser.find({}, { unique_id: 1, name: 1 }).cursor();
	const map = {};
	for await (const user of cursor) {
		map[user.unique_id] = user.name;
	}
	return map;
}

export const doMigration = () => migrationPending;

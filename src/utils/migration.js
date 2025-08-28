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

		// Build lookup maps once
		const [userMap, addedUserMap] = await Promise.all([
			buildUserMap(),
			buildAddedUserMap(),
		]);

		await Promise.all([
			migrateUsersTestCount(),
			migrateUsers(),
			migratePermissions(),
			migrateTemplates(userMap),
			migrateCustomFields(userMap),
			migrateContactLists(userMap, addedUserMap),
			migratePaymentDefault(),
		]);

		console.log("🎉 Migration complete");
		migrationPending = false;
	} catch (err) {
		console.error("❌ Migration failed:", err);
	}
}

async function migrateUsersTestCount() {
	const cursor = User.find({}).cursor();
	const ops = [];
	let count = 0;

	for await (const user of cursor) {
		// Only set if not already set
		if (user.testMessagesCount == null) {
			ops.push({
				updateOne: {
					filter: { _id: user._id },
					update: { $set: { testMessagesCount: 20 } },
				},
			});
		}

		if (ops.length >= 500) {
			count += await safeBulkWrite(User, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(User, ops);
	console.log(`✅ Users testMessagesCount updated (${count} users)`);
}

async function migratePaymentDefault() {
	const cursor = User.find({}).cursor();
	const ops = [];
	let count = 0;

	for await (const user of cursor) {
		const admin = user.unique_id === "db2426e80f";

		const update = {
			"payment.place": admin ? "Internal" : "External",
			"payment.unlimited": admin,
		};

		if (admin) {
			update["payment.expiry"] = 0;
		}

		ops.push({
			updateOne: {
				filter: { _id: user._id },
				update: { $set: update },
			},
		});

		if (ops.length >= 500) {
			count += await safeBulkWrite(User, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(User, ops);
	console.log(`✅ payment.place defaults set (${count} users)`);
}

async function migrateUsers() {
	const cursor = User.find({}).cursor();
	const ops = [];
	let count = 0;

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
			count += await safeBulkWrite(User, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(User, ops);
	console.log(`✅ Users updated (${count} users)`);
}

async function migratePermissions() {
	const batchUpdate = async (Model, cursor, buildUpdate, batchSize = 500) => {
		let ops = [];
		let count = 0;

		for await (const doc of cursor) {
			ops.push(buildUpdate(doc));

			if (ops.length >= batchSize) {
				count += await safeBulkWrite(Model, ops);
				ops = [];
			}
		}
		if (ops.length) count += await safeBulkWrite(Model, ops);

		return count;
	};

	const userCount = await batchUpdate(User, User.find().cursor(), (user) => ({
		updateOne: {
			filter: { _id: user._id },
			update: {
				$set: {
					"access.settings.whatsAppAccountDetails": true,
					"access.settings.accountDetails": true,
					"access.settings.payment": true,
				},
			},
		},
	}));

	const permissionCount = await batchUpdate(
		Permissions,
		Permissions.find().cursor(),
		(permission) => ({
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
		}),
	);

	console.log(
		`✅ Users updated (${userCount}), Permissions updated (${permissionCount}), Total: ${
			userCount + permissionCount
		}`,
	);
}

async function migrateTemplates(userMap) {
	const cursor = Templates.find(
		{},
		{ _id: 1, agentName: 1, useradmin: 1, FB_PHONE_ID: 1 },
	).cursor();
	const ops = [];
	let count = 0;

	for await (const template of cursor) {
		const adminId = String(template.useradmin || "");
		if (!template.agentName && userMap[adminId]) {
			ops.push({
				updateOne: {
					filter: { _id: template._id },
					update: {
						$set: {
							agentName: userMap[adminId],
							FB_PHONE_ID:
								template.FB_PHONE_ID ?? "173988142466890",
						},
					},
				},
			});
		}

		if (ops.length >= 500) {
			count += await safeBulkWrite(Templates, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(Templates, ops);
	console.log(`✅ Templates updated (${count} docs)`);
}

async function migrateCustomFields(userMap) {
	const cursor = CustomField.find(
		{},
		{ _id: 1, agentName: 1, customid: 1 },
	).cursor();
	const ops = [];
	let count = 0;

	for await (const field of cursor) {
		const id = String(field.customid || "");
		if (!field.agentName && userMap[id]) {
			ops.push({
				updateOne: {
					filter: { _id: field._id },
					update: { $set: { agentName: userMap[id] } },
				},
			});
		}

		if (ops.length >= 500) {
			count += await safeBulkWrite(CustomField, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(CustomField, ops);
	console.log(`✅ CustomFields updated (${count} docs)`);
}

async function migrateContactLists(userMap, addedUserMap) {
	const cursor = ContactList.find(
		{},
		{ _id: 1, agentName: 1, agent: 1, FB_PHONE_ID: 1 },
	).cursor();
	const ops = [];
	let count = 0;

	for await (const list of cursor) {
		if (
			!list.agentName &&
			Array.isArray(list.agent) &&
			list.agent.length > 0 &&
			list.FB_PHONE_ID
		) {
			const firstId = String(list.agent[0]);
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
			count += await safeBulkWrite(ContactList, ops);
		}
	}
	if (ops.length) count += await safeBulkWrite(ContactList, ops);
	console.log(`✅ ContactLists updated (${count} docs)`);
}

async function buildUserMap() {
	const cursor = User.find({}, { unique_id: 1, name: 1 }).cursor();
	const map = {};
	for await (const user of cursor) {
		map[String(user.unique_id)] = user.name;
	}
	return map;
}

async function buildAddedUserMap() {
	const cursor = AddedUser.find({}, { unique_id: 1, name: 1 }).cursor();
	const map = {};
	for await (const user of cursor) {
		map[String(user.unique_id)] = user.name;
	}
	return map;
}

async function safeBulkWrite(model, ops) {
	try {
		const res = await model.bulkWrite(ops, { ordered: false });
		const count = res.modifiedCount || 0;
		ops.length = 0;
		return count;
	} catch (err) {
		console.error(
			`⚠️ Bulk write error for ${model.modelName}:`,
			err.message,
		);
		ops.length = 0;
		return 0;
	}
}

export const doMigration = () => migrationPending;

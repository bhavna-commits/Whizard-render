import User from "../models/user.model.js";
import Permissions from "../models/permissions.model.js";

//...................................................................

let migrationPending = true;

//...................................................................


export default async function runMigration() {
	try {
		const users = await User.find();
		for (const user of users) {
			if (!user.access?.contactList) user.access.contactList = {};
			user.access.contactList.allList = true;
			user.access.contactList.downloadList = true;
			await user.save();
		}

		const permissions = await Permissions.find();
		for (const permission of permissions) {
			if (!permission.contactList) permission.contactList = {};
			if (permission.contactList.allList === undefined)
				permission.contactList.allList = false;
			if (permission.contactList.downloadList === undefined)
				permission.contactList.downloadList = false;
			await permission.save();
		}

		console.log("🚀 Migration complete: Users and Permissions updated");
		migrationPending = false;
	} catch (err) {
		console.error("❌ Migration failed:", err);
	}
}

export const doMigration = () => migrationPending;

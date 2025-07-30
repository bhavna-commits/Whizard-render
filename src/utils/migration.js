import User from "../models/user.model.js";
import Permissions from "../models/permissions.model.js";

//...................................................................

let migrationPending = true;

//...................................................................

export default async function runMigration() {
	try {
		const users = await User.find();
		for (const user of users) {
			user.access.settings.whatsAppAccountDetails = true;
			await user.save();
		}

		const permissions = await Permissions.find();
		for (const permission of permissions) {
			if (!permission.settings?.whatsAppAccountDetails)
				permission.settings.whatsAppAccountDetails = false;
			if (!permission.settings?.whatsAppAccountDetails)
				permission.settings.whatsAppAccountDetails = false;
			await permission.save();
		}

		console.log("🚀 Migration complete: Users and Permissions updated");
		migrationPending = false;
	} catch (err) {
		console.error("❌ Migration failed:", err);
	}
}

export const doMigration = () => migrationPending;

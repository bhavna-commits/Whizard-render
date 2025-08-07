import User from "../models/user.model.js";
import AddedUser from "../models/addedUser.model.js";
import Permissions from "../models/permissions.model.js";
import ContactList from "../models/contactList.model.js";
import Templates from "../models/templates.model.js";
import CustomField from "../models/customField.model.js";

let migrationPending = true;

export default async function runMigration() {
	try {
		// 1. Update User access
		const users = await User.find();
		for (const user of users) {
			user.access.settings.whatsAppAccountDetails = true;
			user.access.settings.accountDetails = true;
			user.access.settings.payment = true;
			await user.save();
		}

		// 2. Update Permissions
		const permissions = await Permissions.find();
		for (const permission of permissions) {
			permission.settings.whatsAppAccountDetails = false;
			permission.settings.accountDetails = false;
			permission.settings.payment = false;
			await permission.save();
		}

		// 3. Update Templates with agentName from User
		const templates = await Templates.find();
		for (const template of templates) {
			if (!template.agentName) {
				const user = await User.findOne({
					unique_id: template.useradmin,
				});
				if (user?.name) {
					template.agentName = user.name;
					template.FB_PHONE_ID =
						template.FB_PHONE_ID ?? "173988142466890";
					await template.save();
				}
			}
		}

		// 4. Update CustomFields with agentName from User
		const customFields = await CustomField.find();
		for (const field of customFields) {
			if (!field.agentName) {
				const user = await User.findOne({ unique_id: field.customid });
				if (user?.name) {
					field.agentName = user.name;
					await field.save();
				}
			}
		}

		// 5. Update ContactLists with agentName from AddedUser > fallback to User
		const contactLists = await ContactList.find();
		for (const list of contactLists) {
			if (
				!list.agentName &&
				Array.isArray(list.agent) &&
				list.agent.length > 0 &&
				list.FB_PHONE_ID
			) {
				const firstAgentId = list.agent[0];

				const addedUser = await AddedUser.findOne({
					unique_id: firstAgentId,
				});
				if (addedUser?.name) {
					list.agentName = addedUser.name;
					await list.save();
					continue;
				}

				const user = await User.findOne({ unique_id: firstAgentId });
				if (user?.name) {
					list.agentName = user.name;
					await list.save();
				}
			}
		}

		console.log("✅ Migration complete: agentName added");
		migrationPending = false;
	} catch (err) {
		console.error("❌ Migration failed:", err);
	}
}

export const doMigration = () => migrationPending;

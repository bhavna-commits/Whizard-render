// defaultPermissions.js
export const DEFAULT_PERMISSIONS = {
	member: {
		dashboard: {
			quickActions: true,
			connectNow: false,
			addPhoneNumber: false,
		},
		chats: {
			view: true,
			chat: false,
			// 'type' can be ignored or set to false if it’s only a flag for the toggle state
			type: true,
		},
		contactList: {
			customField: true,
			sendBroadcast: true,
			addContactIndividual: false,
			editContactIndividual: false,
			deleteContactIndividual: false,
			addContactListCSV: false,
			deleteList: false,
			// 'type' can be false by default
			type: true,
		},
		templates: {
			duplicateTemplate: false,
			createTemplate: false,
			editTemplate: false,
			deleteTemplate: false,
			type: true,
		},
		reports: {
			conversationReports: {
				viewReports: true,
				retargetingUsers: false,
				type: true,
			},
			costReports: false,
			type: true,
		},
		settings: {
			activityLogs: true,
			userManagement: {
				type: false,
				addUser: false,
				addPermission: false,
				editPermission: false,
				deletePermission: false,
			},
			type: true,
		},
	},
	admin: {
		dashboard: {
			quickActions: true,
			connectNow: true,
			addPhoneNumber: false,
		},
		chats: {
			view: true,
			chat: true,
			type: true,
		},
		contactList: {
			customField: true,
			sendBroadcast: true,
			addContactIndividual: true,
			editContactIndividual: false,
			deleteContactIndividual: false,
			addContactListCSV: true, // "upload" functionality
			deleteList: false,
			type: true,
		},
		templates: {
			duplicateTemplate: false,
			createTemplate: true,
			editTemplate: false,
			deleteTemplate: true,
			type: true,
		},
		reports: {
			conversationReports: {
				viewReports: true,
				retargetingUsers: true,
				type: true,
			},
			costReports: false,
			type: true,
		},
		settings: {
			activityLogs: true,
			userManagement: {
				type: false,
				addUser: false,
				addPermission: false,
				editPermission: false,
				deletePermission: false,
			},
			type: true,
		},
	},
	owner: {
		dashboard: {
			quickActions: true,
			connectNow: true,
			addPhoneNumber: true,
		},
		chats: {
			view: true,
			chat: true,
			type: true,
		},
		contactList: {
			customField: true,
			sendBroadcast: true,
			addContactIndividual: true,
			editContactIndividual: true,
			deleteContactIndividual: true,
			addContactListCSV: true,
			deleteList: true,
			type: true,
		},
		templates: {
			duplicateTemplate: true,
			createTemplate: true,
			editTemplate: true,
			deleteTemplate: true,
			type: true,
		},
		reports: {
			conversationReports: {
				viewReports: true,
				retargetingUsers: true,
				type: true,
			},
			costReports: true,
			type: true,
		},
		settings: {
			activityLogs: true,
			userManagement: {
				type: true,
				addUser: true,
				addPermission: true,
				editPermission: true,
				deletePermission: true,
			},
			type: true,
		},
	},
};

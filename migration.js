import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./src/models/user.model.js";
import permissionsModel from "./src/models/permissions.model.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

// Update in User model
const result = await userModel.updateMany(
	{ "access.chats.allChats": { $exists: false } },
	{
		$set: {
			"access.chats.allChats": {
				view: true,
				chat: true,
			},
		},
	},
);

// Update in Permissions model
const resul = await permissionsModel.updateMany(
	{ "chats.allChats": { $exists: false } },
	{
		$set: {
			"chats.allChats": {
				view: false,
				chat: false,
			},
		},
	},
);

console.log(
	`✅ Updated ${result.modifiedCount} in Users and ${resul.modifiedCount} in Permissions`,
);

await mongoose.disconnect();

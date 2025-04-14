import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./src/models/user.model.js";
import permissionsModel from "./src/models/permissions.model.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

// Update in User model
const result = await userModel.updateMany(
	{ "access.chats.allChats.view": { $exists: true } },
	{
		$set: {
			"access.chats.allChats": true,
		},
	},
);

// Update in Permissions model
const resul = await permissionsModel.updateMany(
	{ "chats.allChats.view": { $exists: true } },
	{
		$set: {
			"chats.allChats": false,
		},
	},
);

console.log(
	`✅ Updated ${result.modifiedCount} in Users and ${resul.modifiedCount} in Permissions`,
);

await mongoose.disconnect();

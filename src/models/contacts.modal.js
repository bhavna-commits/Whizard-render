import { Schema, model } from "mongoose";

// Schema definition
const contactsSchema = new Schema(
	{
		userName: { type: String, required: true },
		whatsApp: { type: String, required: true },
		tags: {
			type: String,
			required: true,
			enum: ["Cold Leads", "Hot Leads"],
			default: "Hot Leads",
		},
		countryCode: { type: String, required: true },
		validated: {
			type: String,
			required: true,
			enum: ["Verified", "Not Verified"],
			default: "Not Verified",
		},
		owner: { type: Schema.ObjectId, required: true, ref: "User" },
		contactList: {
			type: Schema.ObjectId,
			required: true,
			ref: "ContactList",
		},
		additionalAttributes: { type: Map, of: String }, // New field to store additional columns as key-value pairs
	},
	{ timestamps: true },
	{ strict: false },
);

const Contacts = model("Contacts", contactsSchema);

export default Contacts;

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
			default: "Verified",
		},
		createdAt: {
			type: String,
			default: () => {
				const now = new Date();
				return now.toDateString(); 
			},
		},
		owner: { type: Schema.ObjectId, required: true, ref: "User" },
		contactList: {
			type: Schema.ObjectId,
			required: true,
			ref: "ContactList",
		},
	},
	{ timestamps: true },
	{ strict: false },
);

const Contacts = model("Contacts", contactsSchema);

export default Contacts;

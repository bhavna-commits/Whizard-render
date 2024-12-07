import { Schema, model } from "mongoose";

// Schema definition
const contactListSchema = new Schema(
	{
		name: { type: String, required: true },
		fileData: { type: Array, required: true }, // Array to store parsed file data
		countryCode: { type: String, required: true },
		participantCount: { type: Number, required: true },
		createdAt: { type: Date, default: Date.now },
	},
	{ timestamps: true }, // Automatically adds createdAt and updatedAt
);

const ContactList = model("ContactList", contactListSchema);

export default ContactList;

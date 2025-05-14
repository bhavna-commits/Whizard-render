import { Schema, model } from "mongoose";

const contactListSchema = new Schema(
	{
		FB_PHONE_ID: { type: String, required: true, index: true },
		useradmin: { type: String, required: true, index: true },
		contalistName: { type: String, required: true, index: true },
		contactId: { type: String, required: true, index: true },
		agent: [],
		adddate: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		contact_status: {
			type: Number,
			required: true,
			default: 1,
			index: true,
		},
		participantCount: { type: Number, required: true, index: true },
		createdAt: { type: Number, default: () => Date.now() },
	},
	{ timestamps: false, strict: false },
);

const ContactList = model("ContactList", contactListSchema);

export default ContactList;

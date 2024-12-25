import { Schema, model } from "mongoose";

const contactListSchema = new Schema(
	{
		useradmin: { type: String, required: true },
		contalistName: { type: String, required: true },
		contactId: { type: String, required: true },
		adddate: {
			type: Number,
			default: () => Date.now(),
		},
		contact_status: { type: Number, required: true, default: 1 },
		participantCount: { type: Number, required: true },
	},
	{ timestamps: false, strict: false },
);

const ContactList = model("ContactList", contactListSchema);

export default ContactList;

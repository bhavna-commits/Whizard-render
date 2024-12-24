import { Schema, model } from "mongoose";

const contactListSchema = new Schema(
	{
		_id: { type: Schema.Types.ObjectId, auto: false },
		useradmin: { type: Number, required: true },
		contalistName: { type: String, required: true },
		contactId: { type: String, required: true },
		adddate: { type: String, required: true },
		contact_status: { type: Number, required: true, default: 1 },
	},
	{ timestamps: true, strict: false },
);

const ContactList = model("ContactList", contactListSchema);

export default ContactList;

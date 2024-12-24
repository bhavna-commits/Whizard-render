import { Schema, model } from "mongoose";

const contactsSchema = new Schema(
	{
		_id: { type: Schema.Types.ObjectId, auto: false },
		userlive: { type: Number, default: 0 },
		wa_idK: { type: String, required: true },
		keyId: { type: String, required: true },
		subscribe: { type: Number, default: 1 },
		subscribe_date: { type: Number, required: true },
		subscribe_update: { type: Number, required: true },
		unsubscribe_date: { type: Number, default: "" },
		Name: { type: String, required: true },
		Number: { type: String, required: true },
		wa_id: { type: String, required: true },
		usertimestmp: { type: Number, required: true },
		userupdate: { type: Number, required: true },
		user_bot: { type: Number, default: 0 },
		usertimestmpup: { type: Number, required: true },
		masterExtra: { type: Object },
		contactId: { type: String, required: true },
	},
	{ timestamps: false, strict: false },
);

const Contacts = model("Contacts", contactsSchema);

export default Contacts;

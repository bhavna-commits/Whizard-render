import { Schema, model } from "mongoose";

const contactListSchema = new Schema(
	{
		userlive: { type: Number, default: 0 },
		wa_idK: { type: String },
		keyId: { type: String },
		subscribe: { type: Number, default: 1 },
		subscribe_date: {
			type: Number,
			default: () => Date.now(),
		},
		subscribe_update: {
			type: Number,
			default: () => Date.now(),
		},
		unsubscribe_date: { type: Number, default: 0 },
		Name: { type: String, index: true },
		wa_id: { type: String, index: true },
		usertimestmp: {
			type: Number,
			default: () => Date.now(),
		},
		userupdate: { type: Number },
		user_bot: { type: Number, default: 0 },
		usertimestmpup: {
			type: Number,
			default: () => Date.now(),
		},
		masterExtra: { type: Schema.Types.Mixed },
		contactId: { type: String, index: true },
		useradmin: { type: String, required: true },
		agent: [],
	},
	{ timestamps: false, strict: false },
);

const ContactsTemp = model("ContactsTemp", contactListSchema);

export default ContactsTemp;

import { Schema, model } from "mongoose";

const contactsSchema = new Schema(
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

contactsSchema.pre("save", function (next) {
	this.usertimestmp = Date.now();
	this.subscribe_date = Date.now();
	if (!this.subscribe_update) {
		this.subscribe_update = Date.now();
	}
	if (!this.usertimestmpup) {
		this.usertimestmpup = Date.now();
	}
	next();
});

const Contacts = model("Contacts", contactsSchema);

export default Contacts;

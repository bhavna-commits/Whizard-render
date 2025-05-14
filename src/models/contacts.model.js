import { Schema, model } from "mongoose";

const contactsSchema = new Schema(
	{
		FB_PHONE_ID: { type: String },
		subscribe: { type: Number, default: 1 },
		Name: { type: String, index: true },
		wa_id: { type: String, index: true },
		usertimestmp: {
			type: Number,
			default: () => Date.now(),
		},
		masterExtra: { type: Schema.Types.Mixed },
		contactId: { type: String, index: true },
		useradmin: { type: String, required: true },
		agent: { type: Array, default: [], index: true },
	},
	{ timestamps: false, strict: false },
);

contactsSchema.pre("save", function (next) {
	this.usertimestmp = Date.now();
	if (!this.usertimestmpup) {
		this.usertimestmpup = Date.now();
	}
	next();
});

const Contacts = model("Contacts", contactsSchema);

export default Contacts;

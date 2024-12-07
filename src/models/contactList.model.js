import { Schema, model } from "mongoose";

// Schema definition
const contactListSchema = new Schema(
	{
		ContactListName: { type: String, required: true },
		owner: { type: Schema.ObjectId, ref: "User", required: true },
		countryCode: { type: String, required: true },
		participantCount: { type: Number, required: true },
		createdAt: {
			type: String,
			default: () => {
				const now = new Date();
				return now.toDateString();
			},
		},
	},
	{ timestamps: true },

	{ strict: false },
);

const ContactList = model("ContactList", contactListSchema);

export default ContactList;

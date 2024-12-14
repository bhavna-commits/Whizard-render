import { Schema, model } from "mongoose";

const customFieldsSchema = new Schema(
	{
		owner: { type: Schema.Types.ObjectId, ref: "User" },
		fieldName: { type: String, required: true },
		fieldType: {
			type: String,
			enum: ["input", "dropdown"],
			required: true,
		},
	},
	{ timestamps: true, strict: false },
);

const CustomField = model("CustomField", customFieldsSchema);

export default CustomField;

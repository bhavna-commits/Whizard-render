import { Schema, model } from "mongoose";

const customFieldsSchema = new Schema(
	{
		_id: { type: Schema.Types.ObjectId, auto: false },
		unique_id: { type: String, required: true },
		customid: { type: String, required: true },
		clname: { type: String, required: true },
		cltype: { type: String, enum: ["input", "dropdown"], required: true },
		usertimestmp: { type: Number, required: true },
		updatetimestmp: { type: Number, required: true },
		status: { type: Number, required: true, default: 1 },
	},
	{ timestamps: true, strict: false },
);

const CustomField = model("CustomField", customFieldsSchema);

export default CustomField;

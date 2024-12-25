import { Schema, model } from "mongoose";

const customFieldsSchema = new Schema(
	{
		unique_id: { type: String, required: true },
		customid: { type: String, required: true },
		clname: { type: String, required: true },
		cltype: { type: String, enum: ["input", "dropdown"], required: true },
		usertimestmp: {
			type: Number,
			default: () => Date.now(),
		},
		updatetimestmp: {
			type: Number,
			default: () => Date.now(),
		},
		status: { type: Number, required: true, default: 1 },
	},
	{ timestamps: false, strict: false },
);

customFieldsSchema.pre("save", function (next) {
	this.updatetimestmp = Date.now();
	if (!this.usertimestmp) {
		this.usertimestmp = Date.now();
	}
	next();
});

const CustomField = model("CustomField", customFieldsSchema);

export default CustomField;

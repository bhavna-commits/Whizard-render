import { Schema, model } from "mongoose";

const customFieldsSchema = new Schema(
	{	
		unique_id: { type: String, required: true, index: true },
		customid: { type: String, required: true, index: true },
		clname: { type: String, required: true, index: true },
		cltype: {
			type: String,
			enum: ["input", "dropdown"],
			required: true,
			index: true,
		},
		usertimestmp: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		updatetimestmp: {
			type: Number,
			default: () => Date.now(),
			index: true,
		},
		status: { type: Number, required: true, default: 1, index: true },
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

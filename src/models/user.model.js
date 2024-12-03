import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: {
      countryCode: { type: String, required: true },
      number: { type: String, required: true },
    },
    addedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "AddedUser" }],
    companyname: { type: String, required: true },
    companyDescription: { type: String, required: false },
    country: { type: String, required: true },
    state: { type: String, required: true },
    companySize: { type: String, required: true },
    industry: { type: String, required: true },
    jobRole: { type: String, required: true },
    website: { type: String, required: true },
  },

  { timestamps: true },
  { strict: false }
);

const User = mongoose.model("User", userSchema);

export default User;

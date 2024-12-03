import mongoose from "mongoose";

const addedUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["invited", "registered", "verified"],
      default: "invited",
    },
    invitationToken: { type: String },
    invitationTokenExpiry: { type: Date },
  },
  { timestamps: true },
  { strict: false }
);

const AddedUser = mongoose.model("AddedUser", addedUserSchema);

export default AddedUser;

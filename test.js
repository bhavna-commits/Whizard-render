import mongoose from "mongoose";
import dotenv from "dotenv";
import userModel from "./src/models/user.model.js";
import permissionsModel from "./src/models/permissions.model.js";

dotenv.config();
await mongoose.connect(process.env.MONGO_URI);

const getData = async () => {
    const result = await userModel.findById("674d4bc3e26ff93ef8cfc1db");
    console.log(result.access.chats);
}

getData();
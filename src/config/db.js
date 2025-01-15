import mongoose from "mongoose";
import Agenda from "agenda";

// MongoDB connection function
export const connectDB = async () => {
	try {
		// Connect to MongoDB without deprecated options
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1); // Exit process if connection fails
	}
};

const mongoConnectionString = process.env.MONGO_URI;
export const agenda = new Agenda({
	db: { address: mongoConnectionString, collection: "agendaJobs" },
});
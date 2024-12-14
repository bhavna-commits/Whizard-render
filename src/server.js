import app from "./routes.app.js";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";

dotenv.config(); 

connectDB();

// Define the port
const PORT = process.env.PORT || 5001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

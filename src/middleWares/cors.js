import cors from "cors";

const corsOptions = {
	origin: "*", // Allow all origins
	methods: ["GET", "POST", "PUT", "DELETE"], // Allow specific HTTP methods
	credentials: true, // Enable credentials (cookies, authorization headers, etc.)
	optionsSuccessStatus: 200, // Status for successful OPTIONS requests
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;

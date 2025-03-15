import cors from "cors";

const corsOptions = {
	origin: (origin, callback) => {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) return callback(null, true);
		callback(null, origin);
	},
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true, // Enable credentials if needed
	optionsSuccessStatus: 200,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;

import cors from "cors";

const corsOptions = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE"],
	credentials: true, 
	optionsSuccessStatus: 200,
};

const corsMiddleware = cors(corsOptions);

export default corsMiddleware;

import fs from "fs";
import path from "path";

const __dirname = path.resolve();
// File path to store tokens
const tokenFilePath = path.join(__dirname, "storedTokens.json");

// Helper function to read stored tokens from the file
export const getStoredTokens = () => {
	try {
		if (fs.existsSync(tokenFilePath)) {
			const data = fs.readFileSync(tokenFilePath, "utf8");
			return JSON.parse(data);
		}
	} catch (error) {
		console.error("Error reading stored tokens:", error);
	}
	return {};
};

// Helper function to write tokens to the file
export const saveStoredTokens = (tokens) => {
	try {
		fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
	} catch (error) {
		console.error("Error saving stored tokens:", error);
	}
};

// Function to set a token in the store
export const setToken = (token, expiresAt, userId) => {
	const tokens = getStoredTokens();
	tokens[token] = { expiresAt, userId };
	saveStoredTokens(tokens);
};

// Function to get token data from the store
export const getToken = (token) => {
	const tokens = getStoredTokens();
	return tokens[token];
};

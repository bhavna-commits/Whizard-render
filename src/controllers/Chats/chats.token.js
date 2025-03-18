import fs from "fs";
import path from "path";
import crypto from "crypto";
import { isString } from "../../middleWares/sanitiseInput.js";

const __dirname = path.resolve();

const tokenFilePath = path.join(__dirname, "storedTokens.json");

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

export const saveStoredTokens = (tokens) => {
	try {
		fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2));
	} catch (error) {
		console.error("Error saving stored tokens:", error);
	}
};

export const setToken = (token, expiresAt, userId, addedUser, permission) => {
	const tokens = getStoredTokens();
	tokens[token] = { expiresAt, userId, addedUser, permission };
	saveStoredTokens(tokens);
};

export const getToken = (token) => {
	const tokens = getStoredTokens();
	return tokens[token];
};

export function generateRefreshToken() {
	const token = crypto.randomBytes(32).toString("hex"); // 32 bytes = 64 characters in hex
	const expiresAt = Date.now() + 10 * 60 * 1000; // Token expires in 2 minutes
	return { token, expiresAt };
}

export function isTokenExpired(expiresAt) {
	return Date.now() > expiresAt;
}

export const validateToken = (token) => {
    if (!token) {
        throw "Token not provided";
    }

    if (!isString(token)) {
        throw "Invalid token format";
    }

    const tokenData = getToken(token);
    if (!tokenData) {
        throw "Invalid token";
    }

    const { expiresAt } = tokenData;
    const isValid = !isTokenExpired(expiresAt);
    if (!isValid) {
        throw "Token has expired";
    }

    return tokenData;
};

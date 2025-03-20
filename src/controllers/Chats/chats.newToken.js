import crypto from "crypto";
import Token from "../../models/token.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";
import { isString } from "../../middleWares/sanitiseInput.js";

// Mapping for digits to letters
const digitToLetter = {
	0: "Z",
	1: "J",
	2: "j",
	3: "K",
	4: "l",
	5: "L",
	6: "m",
	7: "M",
	8: "n",
	9: "N",
};

// Reverse mapping for decoding letters back to digits
const letterToDigit = {
	Z: "0",
	J: "1",
	j: "2",
	K: "3",
	l: "4",
	L: "5",
	m: "6",
	M: "7",
	n: "8",
	N: "9",
};

// Lifetime for a token (e.g., 2 minutes in milliseconds)
const TOKEN_LIFETIME = 2 * 60 * 1000;

/**
 * Generates a token by inserting mapped characters from [timestampStr] into [baseHash].
 * Insertion is done in reverse order using: pos = 3 + 4 * i.
 * @param {string} baseHash - The base hash (stored as accessToken in DB).
 * @param {string} timestampStr - The timestamp string (e.g., Date.now().toString()).
 * @returns {string} The generated token (to be sent to the client).
 */
function generateTokenFromHash(baseHash, timestampStr) {
	const mapped = timestampStr
		.split("")
		.map((digit) => digitToLetter[digit] || digit);
	let token = baseHash;
	for (let i = mapped.length - 1; i >= 0; i--) {
		const pos = 3 + 4 * i;
		token = token.slice(0, pos) + mapped[i] + token.slice(pos);
	}
	return token;
}

/**
 * Decodes the token by extracting the inserted timestamp characters.
 * The final positions of the inserted characters (after shifting) are:
 *   pos = 3 + 5 * i  for i from 0 to (insertionCount - 1).
 * @param {string} token - The token received from the client.
 * @param {number} insertionCount - The number of inserted characters (length of the original timestamp string).
 * @returns {Object} An object containing:
 *    - timestamp: The decoded timestamp string.
 *    - baseHash: The original base hash (stored as accessToken in DB).
 */
function decodeToken(token, insertionCount = 13) {
	const tokenArray = token.split("");
	const extracted = [];
	// Remove inserted characters in descending order so indices are preserved.
	for (let i = insertionCount - 1; i >= 0; i--) {
		const pos = 3 + 5 * i; // final positions after shifting
		const removed = tokenArray.splice(pos, 1)[0];
		extracted.push(removed);
	}
	extracted.reverse();
	const timestampDigits = extracted.map(
		(letter) => letterToDigit[letter] || letter,
	);
	const timestamp = timestampDigits.join("");
	const baseHashResult = tokenArray.join("");
	return { timestamp, baseHash: baseHashResult };
}

/**
 * Generates a new token record at login.
 * Here, we generate a random baseHash, use the current timestamp,
 * and store the baseHash (as accessToken) in the database.
 * @returns {Object} An object with token, expiresAt, baseHash, and timestampStr.
 */
export function generateToken() {
	const baseHash = crypto.randomBytes(32).toString("hex"); // 64-character hex string
	const timestampStr = Date.now().toString();
	const token = generateTokenFromHash(baseHash, timestampStr);
	const expiresAt = Date.now() + TOKEN_LIFETIME;
	return { token, expiresAt, baseHash, timestampStr };
}

/**
 * Validates the token received from the client:
 *  - Reads the token from req.body.token.
 *  - Decodes it to extract the timestamp and baseHash.
 *  - Looks up the token record in the database by matching the baseHash.
 *  - Verifies that the token has not expired (using the decoded timestamp).
 *  - If valid, generates a new token with the same baseHash and a new timestamp,
 *    updates the expiration, and returns the updated token record.
 *
 * @param {Object} req - The Express request.
 * @param {Object} res - The Express response.
 * @param {Function} next - The next middleware.
 * @returns {Promise<Object>} The updated token record (with new converted token in a field).
 */
export async function getUserIdFromToken(req, res, next) {
	const token = req.body?.token;
	if (!token) {
		throw "Token not provided";
	}
	if (typeof token !== "string") {
		throw "Token must be a string";
	}
	// Decode the token; assuming a timestamp length of 13 digits.
    const { timestamp, baseHash } = decodeToken(token, 13);
    
    console.log("timestamp :", timestamp, "current :", Date.now());
	// Find the token record by matching the baseHash (stored in DB as accessToken).
    const tokenRecord = await Token.findOne({ accessToken: baseHash });

	if (!tokenRecord) {
		throw "Token not found";
	}
	// Check token expiration: we assume token lifetime is defined in TOKEN_LIFETIME.
	const decodedTimestamp = Number(timestamp);
	if (Date.now() > decodedTimestamp + TOKEN_LIFETIME) {
		throw "Token has expired";
	}
	// Generate a new token with a fresh timestamp using the same baseHash.
	const newTimestampStr = Date.now().toString();
	const newToken = generateTokenFromHash(
		tokenRecord.accessToken,
		newTimestampStr,
	);
	// Update the token record's expiration.
	tokenRecord.expiresAt = Date.now() + TOKEN_LIFETIME;
	await tokenRecord.save();
	// Add the new (converted) token to the record.
	tokenRecord.token = newToken;
	return tokenRecord;
}

/**
 * Creates and saves a new token record in the database upon user login.
 *
 * @param {string} userId - The user's ID.
 * @param {string} permission - The permission level for the user.
 * @returns {Promise<Object>} - The saved token record.
 */
export async function createTokenRecord(userId, permission, addedUser) {
	// Try to find an existing token record for this user.
	let tokenRecord = await Token.findOne({ userId });

	if (tokenRecord) {
		// If token exists, check whether it is still valid.
		if (Date.now() <= tokenRecord.expiresAt) {
			// Optionally, update the token's "converted" token using a fresh timestamp.
			// Here, we generate a new token string using the same baseHash and current time.
			const newTimestampStr = Date.now().toString();
			const newToken = generateTokenFromHash(
				tokenRecord.accessToken,
				newTimestampStr,
			);
			// Update the expiration if needed (or simply return the existing record).
			tokenRecord.expiresAt = Date.now() + TOKEN_LIFETIME; // TOKEN_LIFETIME defined elsewhere
			await tokenRecord.save();
			tokenRecord.token = newToken;
			return tokenRecord;
		} else {
			// If expired, you can either delete it or overwrite it.
			// Here, we delete the expired record.
			await Token.deleteOne({ _id: tokenRecord._id });
		}
	}

	// If no valid token record exists, create a new one.
	const { baseHash, expiresAt, token } = generateToken(); // generateToken() returns { token, expiresAt, baseHash, timestampStr }
	const unique_id = generateUniqueId();
	const newTokenRecord = new Token({
		accessToken: baseHash, // stored baseHash (what you call accessToken in DB)
		lastToken: null,
		userId,
		expiresAt,
		permission,
		unique_id,
		addedUser,
	});
	await newTokenRecord.save();
	newTokenRecord.token = token; // the token sent to client (baseHash + inserted timestamp)
	return newTokenRecord;
}

/**
 * Refreshes the token by decoding its embedded timestamp, adding 30 seconds,
 * generating a new token with the updated timestamp, and updating the token record.
 * The previous token is stored in the `lastToken` field.
 *
 * @param {string} oldToken - The token to be refreshed.
 * @returns {Promise<Object>} - The updated token record.
 */
export async function refreshToken(oldToken) {
	const tokenRecord = await Token.findOne({ accessToken: oldToken });
	if (!tokenRecord) {
		throw "Invalid token";
	}

	// Decode the original timestamp from the token
	const decodedTimestampStr = decodeToken(oldToken);
	const decodedTimestamp = Number(decodedTimestampStr);

	if (Date.now() > tokenRecord.expiresAt) {
		throw "Token has expired";
	}

	// Add 30 seconds to the decoded timestamp
	const newTimestamp = (decodedTimestamp + 30000).toString();
	const newBaseHash = crypto.randomBytes(32).toString("hex");
	const newToken = generateTokenFromHash(newBaseHash, newTimestamp);

	// Update token record: store the current token as lastToken, update accessToken and expiration.
	tokenRecord.lastToken = tokenRecord.accessToken;
	tokenRecord.accessToken = newToken;
	tokenRecord.expiresAt = Date.now() + 2 * 60 * 1000;
	await tokenRecord.save();
	return tokenRecord;
}

/**
 * Validates a token by checking its format, verifying its existence in the database,
 * and ensuring it has not expired.
 *
 * @param {string} token - The token to validate.
 * @returns {Promise<Object>} - The valid token record.
 */
export async function validateToken(token) {
	if (!token || typeof token !== "string") {
		throw "Invalid token format";
	}
	const tokenRecord = await Token.findOne({ accessToken: token });
	if (!tokenRecord) {
		throw new Error("Token not found");
	}
	if (Date.now() > tokenRecord.expiresAt) {
		throw new Error("Token has expired");
	}
	return tokenRecord;
}

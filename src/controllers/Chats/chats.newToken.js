import crypto from "crypto";
import Token from "../../models/token.model.js";
import { generateUniqueId } from "../../utils/otpGenerator.js";

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

/**
 * Inserts mapped timestamp letters into the base hash without replacing any characters.
 * The insertion positions are calculated such that the first mapped letter is inserted at index 3,
 * the second at index 3 + 4, the third at 3 + 8, and so on.
 *
 * @param {string} baseHash - The 64-character hexadecimal string.
 * @param {string} timestampStr - The epoch timestamp (as a string).
 * @returns {string} - The final token with the timestamp letters inserted.
 */
function generateTokenFromHash(baseHash, timestampStr) {
	const mapped = timestampStr
		.split("")
		.map((digit) => digitToLetter[digit] || digit);
	let token = baseHash;
	// Insert letters in reverse order so that earlier insertions don't affect later positions.
	for (let i = mapped.length - 1; i >= 0; i--) {
		// Calculate the final position: for each insertion, the index shifts by the number of previously inserted characters.
		// Here, final index = (base insertion index) + (number of letters already inserted) = 3 + i + (i * 3 - i*?).
		// Since we want to insert the first letter at index 3, and then each subsequent letter every 4 positions,
		// the formula becomes: position = 3 + 4 * i.
		const pos = 3 + 4 * i;
		token = token.slice(0, pos) + mapped[i] + token.slice(pos);
	}
	return token;
}

/**
 * Decodes a token by extracting the inserted letters from their known positions.
 * Assumes that the epoch timestamp is a fixed-length (e.g. 13 digits) and that letters were inserted at positions:
 * 3, 7, 11, 15, ... (i.e. index = 3 + 4 * i).
 *
 * @param {string} token - The token from which to decode the embedded timestamp.
 * @param {number} timestampLength - The expected length of the original timestamp (default 13).
 * @returns {string} - The decoded timestamp as a string.
 */
export function decodeToken(token, timestampLength = 13) {
	let decoded = "";
	for (let i = 0; i < timestampLength; i++) {
		const pos = 3 + 4 * i;
		const char = token[pos];
		if (letterToDigit[char] !== undefined) {
			decoded += letterToDigit[char];
		}
	}
	return decoded;
}

/**
 * Generates a new token by creating a 64-character base hash, encoding the current epoch timestamp,
 * and inserting the mapped letters into the base hash.
 *
 * @returns {Object} - Contains the final token, its expiration timestamp, the original base hash, and the timestamp string.
 */
export function generateToken() {
	const baseHash = crypto.randomBytes(32).toString("hex"); // 64-character hex string
	const timestampStr = Date.now().toString(); // e.g., "1742368576007"
	const token = generateTokenFromHash(baseHash, timestampStr);
	// For example, token expires in 2 minutes:
	const expiresAt = Date.now() + 2 * 60 * 1000;
	return { token, expiresAt, baseHash, timestampStr };
}

/**
 * Creates and saves a new token record in the database upon user login.
 *
 * @param {string} userId - The user's ID.
 * @param {string} permission - The permission level for the user.
 * @returns {Promise<Object>} - The saved token record.
 */
export async function createTokenRecord(userId, permission, addedUser) {
	const { token, expiresAt } = generateToken();
	const unique_id = generateUniqueId();
	const newTokenRecord = new Token({
		accessToken: token,
		lastToken: null,
		userId,
		expiresAt,
		permission,
		unique_id,
		addedUser,
	});
	await newTokenRecord.save();
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
		throw new Error("Invalid token");
	}

	// Decode the original timestamp from the token
	const decodedTimestampStr = decodeToken(oldToken);
	const decodedTimestamp = Number(decodedTimestampStr);

	if (Date.now() > tokenRecord.expiresAt) {
		throw new Error("Token has expired");
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
		throw new Error("Invalid token format");
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

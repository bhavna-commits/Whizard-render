import xss from "xss";
import validator from "validator";
import User from "../models/user.model.js";
import AddedUser from "../models/addedUser.model.js";
/**
 * Deeply sanitizes and validates input data, including query, params, and body.
 * @param {Object} data - Input object (query, params, or body).
 * @param {Object} schema - Expected data schema with types { fieldName: 'string' | 'number' | 'boolean' | 'array' | 'object' }
 * @returns {Object} - Sanitized and validated object.
 */
export function sanitizeInput(data, schema) {
	const sanitizeRecursively = (input, expectedSchema) => {
		let sanitizedData = {};

		for (const field in expectedSchema) {
			if (Object.hasOwnProperty.call(input, field)) {
				const expectedType = expectedSchema[field];

				if (expectedType === "string") {
					sanitizedData[field] = sanitizeString(input[field]);
				} else if (expectedType === "number") {
					sanitizedData[field] = sanitizeNumber(input[field]);
				} else if (expectedType === "boolean") {
					sanitizedData[field] = sanitizeBoolean(input[field]);
				} else if (
					expectedType === "array" &&
					Array.isArray(input[field])
				) {
					sanitizedData[field] = input[field].map((item) =>
						sanitizeRecursively(
							item,
							expectedSchema[field][0] || {},
						),
					);
				} else if (
					expectedType === "object" &&
					typeof input[field] === "object"
				) {
					sanitizedData[field] = sanitizeRecursively(
						input[field],
						expectedSchema[field],
					);
				} else {
					throw new Error(`Invalid input type for field ${field}`);
				}
			}
		}

		return sanitizedData;
	};

	return sanitizeRecursively(data, schema);
}

/**
 * Checks if string input does not have any script or any hacking logic.
 * @param {string} input - Input string.
 * @returns {boolean} output - True or False.
 */
export function isString(...inputs) {
	// Recursively check each input
	for (const input of inputs) {
		if (!input) {
			continue;
		}

		if (input !== validator.trim(input)) {
			return false;
		}

		// Check if input contains any characters that would need to be escaped
		if (input !== validator.escape(input)) {
			return false;
		}

		// Check if input contains any harmful scripts or HTML
		if (input !== xss(input)) {
			return false;
		}
	}

	// If all checks pass for every input, return true
	return true;
}

export function isObject(...inputs) {
	// Helper function to validate individual strings
	function validateString(input) {
		// Check if input is trimmed (no leading/trailing whitespace)
		if (input !== validator.trim(input)) {
			return false;
		}

		// Check if input contains any characters that would need to be escaped
		if (input !== validator.escape(input)) {
			return false;
		}

		// Check if input contains any harmful scripts or HTML
		if (input !== xss(input)) {
			return false;
		}

		return true; // Passes all validation
	}

	// Recursively check each input
	for (const input of inputs) {
		// If the input is an object, check all its values
		if (typeof input === "object" && input !== null) {
			for (const value of Object.values(input)) {
				// Ensure all values are strings and validate them
				if (typeof value !== "string" || !validateString(value)) {
					return false;
				}
			}
		} else if (typeof input === "string") {
			// If it's a string, validate it
			if (!validateString(input)) {
				return false;
			}
		} else {
			// If input is neither string nor object, it's invalid
			return false;
		}
	}

	// If all checks pass for every input, return true
	return true;
}

/**
 * Sanitizes number input.
 * @param {number|string} input - Input value.
 * @returns {number} - Sanitized number.
 */
export function isNumber(...inputs) {
	for (const input of inputs) {
		if (!validator.isNumeric(input.toString())) {
			return false;
		}
	}
	return true;
}

/**
 * Sanitizes boolean input.
 * @param {boolean|string} input - Input value.
 * @returns {boolean} - Sanitized boolean.
 */
export function isBoolean(...inputs) {
	for (const input of inputs) {
		if (typeof input !== "boolean") {
			return false;
		}
	}
	return true;
}

/**
 * Middleware to sanitize and validate incoming data.
 * Use this middleware in your routes.
 * @param {Object} schema - Expected schema for the input.
 */
export const sanitizeMiddleware = (schema) => {
	return (req, res, next) => {
		try {
			req.query = sanitizeInput(req.query, schema);
			req.params = sanitizeInput(req.params, schema);
			req.body = sanitizeInput(req.body, schema);
			next();
		} catch (err) {
			return res.status(400).json({ error: err.message });
		}
	};
};

// Middleware to track sanitation failures and delete the session after 3 failed attempts
export async function trackSanitationFailures(req, res, next) {
	const userId = req.session?.user?.id || req.session?.addedUser?.id;

	// Ensure the session exists and userId is available
	if (!userId) {
		return res.status(403).send("User session not found.");
	}

	// Initialize failure count if it doesn't exist
	if (!req.session.sanitationFailures) {
		req.session.sanitationFailures = {};
	}

	// Initialize the user's failure count if not present
	if (!req.session.sanitationFailures[userId]) {
		req.session.sanitationFailures[userId] = 0;
	}

	req.session.sanitationFailures[userId] += 1;

	// Check if failure count reaches 3
	if (req.session.sanitationFailures[userId] >= 3) {
		const user = await User.findOneAndUpdate(
			{ unique_id: userId },
			{ blocked: true },
		);
		if (!user) {
			const addedUser = AddedUser.findOneAndUpdate(
				{ unique_id: userId },
				{ blocked: true },
			);
		}

		req.session.destroy((err) => {
			if (err) {
				console.error("Failed to destroy session:", err);
				return res.status(500).send("Server error");
			}
			return res
				.status(403)
				.send(
					"Session terminated due to repeated sanitation failures.",
				);
		});
	} else {
		res.status(403).json({
			success: false,
			message: "Maliciuos input found.  Please check entered values.",
		});
	}
}

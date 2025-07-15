import crypto from "crypto";

export const generate6DigitOTP = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export const setOTPExpiry = () => {
	return Date.now() + 60000 * 3; // 3 minutes in milliseconds
};

export function validatePassword(password) {
	const passwordRegex =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

	return passwordRegex.test(password);
}

export function isValidEmail(email) {
	// Basic email regex validation
	const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

	// List of common personal email domains
	const personalEmailPattern =
		/@(gmail\.com|yahoo\.com|hotmail\.com|aol\.com|outlook\.com|icloud\.com|live\.com|msn\.com|mail\.com|zoho\.com|yandex\.com|protonmail\.com|gmx\.com|me\.com|fastmail\.com|pm\.me|mailinator\.com|tutanota\.com|10minutemail\.com|guerrillamail\.com|temp-mail\.org|getnada\.com|maildrop\.cc|trashmail\.com|fakeinbox\.com|dispostable\.com|sharklasers\.com|mailnesia\.com|yopmail\.com|throwawaymail\.com|mohmal\.com|emailondeck\.com|temporarymail\.com|tempmail\.net|luxusmail\.com|anonbox\.net|burnermail\.io|mytemp\.email)$/i;

	// Check if the email is valid and NOT a personal email
	if (emailRegex.test(email)) {
		return !personalEmailPattern.test(email); // True if it's NOT a personal email
	} else {
		return false;
	}
}

export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

export const generateAuthTemplateToken = () =>
	crypto.randomBytes(32).toString("hex");

export function convertDateFormat(date) {
	// Regex to match mm/dd/yyyy format
	const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
	return date.replace(regex, (match, month, day, year) => {
		return `${day}/${month}/${year}`;
	});
}

import crypto from "crypto";

export const generateOTP = () => {
	return Math.floor(100000 + Math.random() * 900000).toString();
};

export function validatePassword(password) {
	const minLength = /.{8,}/;
	const lowercase = /[a-z]/;
	const uppercase = /[A-Z]/;
	const number = /[0-9]/;
	const specialChar = /[\W_]/;

	return (
		minLength.test(password) &&
		lowercase.test(password) &&
		uppercase.test(password) &&
		number.test(password) &&
		specialChar.test(password)
	);
}

export const generateUniqueId = () => {
	return crypto.randomBytes(5).toString("hex").slice(0, 10);
};

export function convertDateFormat(date) {
	// Regex to match mm/dd/yyyy format
	const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
	return date.replace(regex, (match, month, day, year) => {
		return `${day}/${month}/${year}`;
	});
}
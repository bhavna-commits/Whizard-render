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

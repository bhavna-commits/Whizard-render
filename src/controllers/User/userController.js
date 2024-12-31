import { sendEmailVerification } from "./userFunctions.js";
import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import bcrypt from "bcrypt";
import { generateUniqueId } from "../../utils/otpGenerator.js";

const setOTPExpiry = () => {
	return Date.now() + 600000; // 10 minutes in milliseconds
};

export const generateOTP = async (req, res) => {
	const { name, email, password, phoneNumber, countryCode } = req.body;

	try {
		const user = await User.findOne({ email });
		const mobileExists = await User.findOne({ phoneNumber });

		// console.log("first");

		if (user) {
			return res
				.status(409)
				.json({ success: false, message: "Email already exists" });
		}

		if (mobileExists) {
			return res.status(409).json({
				success: false,
				message: "Phone number already exists",
			});
		}

		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		try {
			req.session.tempUser = {
				name,
				email,
				password,
				phoneNumber,
				countryCode,
				otp,
			};
		} catch (error) {
			console.error("Error in creating req session:", error);
		}

		try {
			await sendEmailVerification(email, otp);
			console.log("sendEmailVerification passed");
		} catch (error) {
			console.error("Error in sendEmailVerification:", error);
		}

		try {
			setOTPExpiry();
			console.log("setOTPExpiry passed");
		} catch (error) {
			console.error("Error in setOTPExpiry:", error);
		}

		res.status(200).json({
			success: true,
			message: "OTP sent successfully",
			email: email,
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error while registering, please check the details",
			error: error.message,
		});
	}
};

export const verifyEmail = async (req, res) => {
	const { otp, email } = req.body;

	try {
		const tempUser = req.session.tempUser;
		tempUser.email = email;
		console.log(typeof tempUser.otp, typeof otp);

		if (!tempUser) {
			return res
				.status(400)
				.json({ message: "Session expired. Please try again." });
		}

		if (tempUser.otp !== otp) {
			return res.status(400).json({
				success: false,
				message: "Invalid OTP. Please try again.",
			});
		}

		res.status(200).json({
			success: true,
			message: "OTP verfied Succesfully",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error verifying email.",
			error,
		});
	}
};

export const login = async (req, res) => {
	const { email, password, rememberMe } = req.body;

	try {
		const user = await User.findOne({ email });

		if (!user) {
			const addedUser = await AddedUser.findOne({ email });
			if (addedUser) {
				const isMatch = bcrypt.compare(password, addedUser.password);

				if (!isMatch) {
					return res
						.status(400)
						.json({ message: "Invalid credentials" });
				}

				req.session.user = {
					id: addedUser.owner,
					WhatsAppConnectStatus: user.WhatsAppConnectStatus,
				};
				req.session.addedUser = {
					id: addedUser._id,
					name: addedUser.name,
				};

				if (rememberMe) {
					req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
				} else {
					req.session.cookie.maxAge = 60 * 60 * 1000; // 1 hour
				}
				res.status(200).json({
					message: "Login successful",
				});
			}
			return res.status(400).json({ message: "User not found" });
		}

		const isMatch = await bcrypt.compare(password, user.password);

		if (!isMatch) {
			return res.status(400).json({ message: "Invalid credentials" });
		}

		req.session.user = {
			id: user._id,
			name: user.name,
			WhatsAppConnectStatus: user.WhatsAppConnectStatus,
		};

		if (rememberMe) {
			req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
		} else {
			req.session.cookie.maxAge = 60 * 60 * 1000; // 1 hour
		}

		res.status(200).json({
			message: "Login successful",
		});
	} catch (error) {
		res.status(500).json({ message: "Error logging in", error });
	}
};

export const resendEmailOTP = async (req, res) => {
	const { email } = req.body;
	try {
		const tempUser = req.session.tempUser;

		if (!tempUser) {
			return res
				.status(400)
				.json({ message: "Session expired. Please try again." });
		}

		tempUser.email = email;

		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		tempUser.otp = otp;

		await sendEmailVerification(email, otp);

		res.status(200).json({ message: "OTP sent successfully." });
	} catch (error) {
		res.status(500).json({ message: "Error resending OTP.", error });
	}
};

export const resetPassword = async (req, res) => {
	const { email } = req.body;

	try {
		// Find the user by email
		const user = await User.findOne({ email });
		// console.log(user);
		if (!user) {
			// If no user is found, send an error response
			return res.status(400).json({ message: "User not found" });
		}

		// Generate a random OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Send the OTP via email (assuming sendEmailVerification is a working function)
		await sendEmailVerification(email, otp);
		req.session.tempUser.email = email;
		req.session.tempUser.otp = otp;

		// Send a success response to the frontend
		res.status(200).json({ message: "OTP sent successfully" });
	} catch (error) {
		// If any error occurs, send an error response
		res.status(500).json({
			message: "An error occurred while sending OTP",
		});
	}
};

export const changePassword = async (req, res) => {
	const { email, password } = req.body;

	// Validate input
	if (!email || !password) {
		return res
			.status(400)
			.json({ message: "Email and password are required" });
	}

	try {
		// Find the user by email
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Hash the new password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Update the user's password in the database
		user.password = hashedPassword;
		await user.save();

		// Respond with a success message
		return res
			.status(200)
			.json({ message: "Password changed successfully" });
	} catch (error) {
		console.error(error);
		return res
			.status(500)
			.json({ message: "Server error, please try again later" });
	}
};

export const about = async (req, res) => {
	if (!req.session.tempUser) {
		return res.status(400).json({
			success: false,
			message: "Session expired. Please try again.",
		});
	}

	const {
		name: companyName,
		description,
		state,
		country,
		companySize,
		industry,
		jobRole,
		website,
	} = req.body;

	const { name, email, password, phoneNumber, countryCode } =
		req.session.tempUser;

	try {
		// Check if user already exists
		const userExists = await User.findOne({ email });
		if (userExists) {
			return res.status(409).json({
				success: false,
				message: "User with this email already exists.",
			});
		}

		// Encrypt the password using bcrypt
		const saltRounds = 10;
		const hashedPassword = await bcrypt.hash(password, saltRounds);

		// Generate unique alphanumeric key for unique_id
		const unique_id = generateUniqueId();

		// Find the latest userAdmin number and increment by 1
		const lastUser = await User.findOne().sort({ useradmin: -1 });
		const userAdmin = lastUser ? lastUser.useradmin + 1 : 1;

		// Create the new user with hashed password
		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			phone: {
				countryCode,
				number: phoneNumber,
			},
			companyname: companyName,
			companyDescription: description,
			country,
			state,
			companySize,
			industry,
			jobRole,
			website,
			unique_id,
			userAdmin,
		});

		// Save the new user to the database
		await newUser.save();

		// Update session with the newly created user data to keep them logged in
		req.session.user = {
			id: newUser.unique_id,
		};

		// Send success response
		res.status(201).json({
			success: true,
			message: "User created and logged in successfully.",
			user: {
				name: newUser.name,
				email: newUser.email,
				companyName: newUser.companyName,
				industry: newUser.industry,
				unique_id: newUser.unique_id, // Return unique_id for reference
				userAdmin: newUser.userAdmin, // Return userAdmin for reference
			},
		});
	} catch (error) {
		console.error("Error creating user:", error.message);
		res.status(500).json({
			success: false,
			message: "Error creating user.",
			error: error.message,
		});
	}
};

export const logout = async (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			return res
				.status(500)
				.json({ success: false, message: "Failed to log out." });
		}

		res.clearCookie("connect.sid", { path: "/" });
		return res.status(200).json({ success: true });
	});
};

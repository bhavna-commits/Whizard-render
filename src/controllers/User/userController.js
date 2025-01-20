import { getRandomColor, sendEmailVerification } from "./userFunctions.js";
import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import bcrypt from "bcrypt";
import {
	generate6DigitOTP,
	generateUniqueId,
	setOTPExpiry,
} from "../../utils/otpGenerator.js";
import dotenv from "dotenv";
import { isString } from "../../middleWares/sanitiseInput.js";
import { incrementLoginAttempts } from "../../middleWares/rateLimiter.js";

dotenv.config();

export const generateOTP = async (req, res, next) => {
	try {
		const { name, email, password, phoneNumber, countryCode } = req.body;
		if (!(name && email && password && phoneNumber && countryCode)) {
			return res.json({
				success: false,
				message: "input invalid: all values must be present",
			});
		}

		if (!isString(name, email, password, phoneNumber, countryCode))
			return next();

		const user = await User.findOne({ email });
		const phone = `${countryCode}${phoneNumber}`;
		const mobileExists = await User.findOne({ phone });

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

		const otp = generate6DigitOTP();
		const otpExpiry = setOTPExpiry(); // Set the expiration time

		req.session.tempUser = {
			name,
			email,
			password,
			phoneNumber,
			countryCode,
			otp,
			otpExpiry, // Store expiration time
		};

		await sendEmailVerification(email, otp);

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

export const verifyEmail = async (req, res, next) => {
	const { otp, email } = req.body;
	if (!otp || !email) {
		return res.json({
			success: false,
			message: "Invalid input: Please enter all the required values",
		});
	}

	if (!isString(otp, email)) return next();

	try {
		const tempUser = req.session?.tempUser;

		if (!tempUser) {
			return res.status(400).json({
				success: false,
				message: "Session expired. Please try again.",
			});
		}

		// Check if OTP has expired
		const currentTime = Date.now();
		if (currentTime > tempUser.otpExpiry) {
			return res.status(400).json({
				success: false,
				message: "OTP expired. Please request a new one.",
			});
		}

		if (tempUser.otp !== otp) {
			return res.status(400).json({
				success: false,
				message: "Invalid OTP. Please try again.",
			});
		}

		res.status(200).json({
			success: true,
			message: "OTP verified successfully",
		});
	} catch (error) {
		res.status(500).json({
			success: false,
			message: "Error verifying email.",
			error: error.message,
		});
	}
};

export const login = async (req, res, next) => {
	const { email, password, rememberMe } = req.body;

	if (!email || !password)
		return res.json({
			success: false,
			message: "Invalid input: Please check entered values",
		});

	if (!isString(email, password)) return next();

	try {
		const user = await User.findOneAndUpdate(
			{ email },
			{
				WABA_ID: process.env.WABA_ID,
				FB_PHONE_ID: process.env.FB_PHONE_ID,
			},
			{ new: true, runValidators: true },
		);

		if (!user) {
			const addedUser = await AddedUser.findOne({ email });
			if (addedUser) {
				if (addedUser.blocked) {
					return res
						.status(403)
						.json({ message: "Account is blocked." });
				}

				const now = Date.now();
				if (addedUser.lockUntil && addedUser.lockUntil > now) {
					return res.status(429).json({
						message: `Account locked. Please try again later.`,
					});
				}
				console.log("here : login");
				const isMatch = bcrypt.compare(password, addedUser.password);
				console.log("here: passed");

				if (!isMatch) {
					await incrementLoginAttempts(addedUser);
					return res
						.status(400)
						.json({ message: "Invalid credentials" });
				}

				addedUser.loginAttempts = 0; // Reset login attempts on successful login
				addedUser.lockUntil = null; // Clear any lock period
				await addedUser.save();

				const data = await User.findOne({
					unique_id: addedUser.useradmin,
				});

				req.session.addedUser = {
					id: addedUser.unique_id,
					name: addedUser.name,
					photo: addedUser?.photo,
					color: addedUser.color,
					permissions: addedUser.roleId,
					owner: addedUser.useradmin,
					whatsAppStatus: data.WhatsAppConnectStatus,
				};

				if (rememberMe) {
					req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
				} else {
					req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours
				}

				return res.status(200).json({
					message: "Login successful",
				});
			}

			return res.status(400).json({ message: "User not found" });
		} else {
			if (user.blocked) {
				return res.status(403).json({ message: "Account is blocked." });
			}

			const now = Date.now();
			if (user.lockUntil && user.lockUntil > now) {
				return res.status(429).json({
					message: `Account locked. Please try again later.`,
				});
			}

			const isMatch = await bcrypt.compare(password, user.password);

			if (!isMatch) {
				await incrementLoginAttempts(user);
				return res.status(400).json({ message: "Invalid credentials" });
			}

			user.loginAttempts = 0; // Reset login attempts on successful login
			user.lockUntil = null; // Clear any lock period
			await user.save();

			req.session.user = {
				id: user.unique_id,
				name: user.name,
				color: user.color,
				photo: user.profilePhoto,
				whatsAppStatus: user.WhatsAppConnectStatus,
			};

			if (rememberMe) {
				req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
			} else {
				req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours
			}

			return res.status(200).json({
				message: "Login successful",
			});
		}
	} catch (error) {
		return res.status(500).json({ message: "Error logging in", error });
	}
};

export const resendEmailOTP = async (req, res) => {
	const { email } = req.body;
	try {
		const tempUser = req.session?.tempUser;

		if (!tempUser) {
			return res
				.status(400)
				.json({ message: "Session expired. Please try again." });
		}

		tempUser.email = email;

		const otp = generate6DigitOTP();
		const otpExpiry = setOTPExpiry();

		tempUser.otp = otp;
		tempUser.otpExpiry = otpExpiry; // Update expiry time

		await sendEmailVerification(email, otp);

		res.status(200).json({ message: "OTP sent successfully." });
	} catch (error) {
		res.status(500).json({ message: "Error resending OTP.", error });
	}
};

export const resetPassword = async (req, res) => {
	const { email } = req.body;

	try {
		// Check if the email exists in the User collection
		let user = await User.findOne({ email });

		// If not found in the User collection, check the AddedUser collection
		if (!user) {
			user = await AddedUser.findOne({ email, deleted: false });
		}

		// If no user is found in either collection, send an error response
		if (!user) {
			return res.status(400).json({ message: "User not found" });
		}

		// Generate a random OTP
		console.log("Generating OTP");
		const otp = Math.floor(100000 + Math.random() * 900000).toString();

		// Store the OTP and email in session for verification later
		req.session.tempUser = {
			email,
			otp,
		};

		// Verify that tempUser has been set correctly in the session
		if (!req.session?.tempUser) {
			return res.status(500).json({
				message: "Failed to store OTP in session",
			});
		}

		// Send OTP via email
		console.log("Sending OTP via email");
		await sendEmailVerification(email, otp);

		// Send success response to the frontend
		return res.status(200).json({ message: "OTP sent successfully" });
	} catch (error) {
		console.error("Error occurred while sending OTP:", error);
		// If any error occurs, send an error response
		return res.status(500).json({
			message: "An error occurred while sending OTP",
		});
	}
};

export const changePassword = async (req, res, next) => {
	const { email, password } = req.body;

	// Validate input
	if (!email || !password) {
		return res
			.status(400)
			.json({ message: "Email and password are required" });
	}

	if (!isString(email, password)) return next();

	try {
		// Find the user by email in the User collection first
		let user = await User.findOne({ email });

		// If not found in the User collection, check the AddedUser collection
		if (!user) {
			user = await AddedUser.findOne({ email, deleted: false });
		}

		// If no user is found in either collection, return an error
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
		console.error("Error changing password:", error);
		return res
			.status(500)
			.json({ message: "Server error, please try again later" });
	}
};

export const about = async (req, res, next) => {
	try {
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

		if (
			companyName ||
			description ||
			state ||
			country ||
			companySize ||
			industry ||
			jobRole ||
			website
		)
			return res.json({
				success: true,
				message: "invalid input: There are some empty fields ",
			});

		if (
			!isString(
				companyName,
				description,
				state,
				country,
				companySize,
				industry,
				jobRole,
				website,
			)
		)
			next();

		const { name, email, password, phoneNumber, countryCode } =
			req.session.tempUser;

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
		const phone = `${countryCode}${phoneNumber}`;
		const unique_id = generateUniqueId();
		const color = getRandomColor();
		const newUser = new User({
			name,
			email,
			password: hashedPassword,
			phone,
			companyName: companyName,
			companyDescription: description,
			country,
			state,
			companySize,
			industry,
			jobRole,
			website,
			unique_id,
			color,
		});

		// Update session with the newly created user data to keep them logged in
		req.session.user = {
			id: newUser.unique_id,
			name: newUser.name,
			color,
		};

		await newUser.save();

		res.status(201).json({
			success: true,
			message: "User created and logged in successfully.",
			user: {
				name: newUser.name,
				email: newUser.email,
				companyName: newUser.companyName,
				industry: newUser.industry,
				unique_id: newUser.unique_id,
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

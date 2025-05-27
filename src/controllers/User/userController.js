import {
	getRandomColor,
	sendEmailVerification,
	sendOTPOnWhatsApp,
} from "./userFunctions.js";
import User from "../../models/user.model.js";
import AddedUser from "../../models/addedUser.model.js";
import Permissions from "../../models/permissions.model.js";
import bcrypt from "bcrypt";
import {
	generate6DigitOTP,
	generateUniqueId,
	isValidEmail,
	setOTPExpiry,
	validatePassword,
} from "../../utils/otpGenerator.js";
import { DEFAULT_PERMISSIONS } from "../../utils/defaultPermissions.js";
import { isString } from "../../middleWares/sanitiseInput.js";
import { incrementLoginAttempts } from "../../middleWares/rateLimiter.js";
import Login from "../../models/login.model.js";

// 2FA settings: if you later set one of these to false the corresponding OTP verification is disabled
const ENABLE_EMAIL_OTP = Boolean(process.env.EMAIL_OTP_LOGIN);
const ENABLE_MOBILE_OTP = Boolean(process.env.MOBILE_OTP_LOGIN);

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

		if (!isValidEmail(email))
			return res.status(401).json({
				success: false,
				message:
					"Email is not in the valid format or is not a corporate email",
			});

		if (!validatePassword(password))
			return res.status(401).json({
				success: false,
				message: "Password is not in the valid format.",
			});
		const user = await User.findOne({ email });
		console.log(user);
		if (user) {
			return res
				.status(409)
				.json({ success: false, message: "Email already exists" });
		}

		const phone = `${countryCode}${phoneNumber}`;
		const mobileExists = await User.findOne({ phone });

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
		console.log(error);
		res.status(500).json({
			success: false,
			message: "Error while registering, please check the details",
			error: error.message,
		});
	}
};

export const verifyEmail = async (req, res, next) => {
	const { otp, email } = req.body;

	// console.log(otp, email);

	if (!otp || !email) {
		return res.json({
			success: false,
			message: "Invalid input: Please enter all the required values",
		});
	}

	if (!isString(otp, email)) return next();

	try {
		const tempUser = req.session?.tempUser;

		console.log(tempUser);

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

// old login controller

// export const login = async (req, res, next) => {
// 	const { email, password, rememberMe } = req.body;

// 	if (!email || !password)
// 		return res.json({
// 			success: false,
// 			message: "Invalid input: Please check entered values",
// 		});

// 	if (!isString(email, password)) return next();

// 	// if (!isValidEmail(email))
// 	// 	return res.status(401).json({
// 	// 		success: false,
// 	// 		message:
// 	// 			"Email is not in the valid format or is not a corporate email",
// 	// 	});

// 	if (!validatePassword(password))
// 		return res.status(401).json({
// 			success: false,
// 			message: "Password is not in the valid format.",
// 		});

// 	try {
// 		const user = await User.findOne({ email });

// 		if (!user) {
// 			const addedUser = await AddedUser.findOne({
// 				email,
// 				deleted: false,
// 			}).sort({ createdAt: -1 });
// 			// console.log(addedUser);
// 			if (addedUser) {
// 				if (addedUser.blocked) {
// 					return res
// 						.status(403)
// 						.json({ message: "Account is blocked." });
// 				}

// 				if (!addedUser.password) {
// 					return res.status(403).json({
// 						message:
// 							"Account is In-Active. Please setup Password through the invitation link",
// 					});
// 				}

// 				// console.log("here : login");
// 				const isMatch = bcrypt.compare(password, addedUser.password);
// 				// console.log("here: passed");

// 				if (!isMatch) {
// 					await incrementLoginAttempts(addedUser);
// 					return res
// 						.status(400)
// 						.json({ message: "Invalid credentials" });
// 				}

// 				await addedUser.save();

// 				const data = await User.findOne({
// 					unique_id: addedUser.useradmin,
// 				});
// 				// console.log(addedUser);
// 				req.session.addedUser = {
// 					id: addedUser.unique_id,
// 					name: addedUser.name,
// 					photo: addedUser?.photo,
// 					color: addedUser.color,
// 					permissions: addedUser.roleId,
// 					owner: addedUser.useradmin,
// 					whatsAppStatus: data.WhatsAppConnectStatus,
// 				};

// 				if (rememberMe) {
// 					req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
// 				} else {
// 					req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours
// 				}

// 				return res.status(200).json({
// 					message: "Login successful",
// 				});
// 			}

// 			return res.status(400).json({ message: "User not found" });
// 		} else {
// 			if (user.blocked) {
// 				return res.status(403).json({ message: "Account is blocked." });
// 			}

// 			const now = Date.now();
// 			if (user.lockUntil && user.lockUntil > now) {
// 				return res.status(429).json({
// 					message: `Account locked. Please try again later.`,
// 				});
// 			}

// 			const isMatch = await bcrypt.compare(password, user.password);

// 			if (!isMatch) {
// 				await incrementLoginAttempts(user);
// 				return res.status(400).json({ message: "Invalid credentials" });
// 			}

// 			await user.save();

// 			// await createDefaultPermissionsForUser(user.unique_id);

// 			req.session.user = {
// 				id: user.unique_id,
// 				name: user.name,
// 				color: user.color,
// 				photo: user.profilePhoto,
// 				whatsAppStatus: user.WhatsAppConnectStatus,
// 			};

// 			if (rememberMe) {
// 				req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
// 			} else {
// 				req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours
// 			}

// 			return res.status(200).json({
// 				message: "Login successful",
// 			});
// 		}
// 	} catch (error) {
// 		return res.status(500).json({ message: "Error logging in", error });
// 	}
// };

export const login = async (req, res, next) => {
	const { email, password, rememberMe } = req.body;

	if (!email || !password)
		return res.json({
			success: false,
			message: "Invalid input: Please check entered values",
		});

	if (!isString(email, password)) return next();
	if (!validatePassword(password))
		return res
			.status(401)
			.json({ message: "Password is not in the valid format." });

	try {
		const user = await User.findOne({ email });
		if (!user) {
			// If no user found in the primary collection, check the AddedUser model.
			const addedUser = await AddedUser.findOne({
				email,
				deleted: false,
			}).sort({
				createdAt: -1,
			});
			if (addedUser) {
				if (addedUser.blocked) {
					return res
						.status(403)
						.json({ message: "Account is blocked." });
				}

				if (!addedUser.password) {
					return res.status(403).json({
						message:
							"Account is In-Active. Please setup Password through the invitation link",
					});
				}

				const isMatch = await bcrypt.compare(
					password,
					addedUser.password,
				);
				if (!isMatch) {
					await incrementLoginAttempts(addedUser);
					return res
						.status(400)
						.json({ message: "Invalid credentials" });
				}
				await addedUser.save();

				// If 2FA is enabled for either email or mobile, generate OTPs and store in session
				if (ENABLE_EMAIL_OTP || ENABLE_MOBILE_OTP) {
					const emailOTP = ENABLE_EMAIL_OTP
						? generate6DigitOTP()
						: null;
					const mobileOTP = ENABLE_MOBILE_OTP
						? generate6DigitOTP()
						: null;
					const otpExpiry = setOTPExpiry();

					req.session.otp = {
						emailOTP,
						mobileOTP,
						otpExpiry,
						userType: "addedUser",
						userId: addedUser.unique_id,
						rememberMe,
					};

					// req.session.save((err) => {
					// 	if (err) console.error("Session save error:", err);
					// });

					if (ENABLE_EMAIL_OTP) {
						await sendEmailVerification(addedUser.email, emailOTP);
					}
					if (ENABLE_MOBILE_OTP) {
						await sendOTPOnWhatsApp(addedUser.phone, mobileOTP);
					}

					return res.status(200).json({
						success: true,
						message: "OTP sent. Please verify to complete login.",
						requiresOTP: true,
					});
				} else {
					// If 2FA is disabled, complete the login normally.
					req.session.addedUser = {
						id: addedUser.unique_id,
						name: addedUser.name,
						photo: addedUser.photo,
						color: addedUser.color,
						permissions: addedUser.roleId,
						owner: addedUser.useradmin,
						whatsAppStatus: (
							await User.findOne({
								unique_id: addedUser.useradmin,
							})
						).WhatsAppConnectStatus,
					};
				}

				return res
					.status(200)
					.json({ message: "Login successful", success: true });
			}
			return res.status(400).json({ message: "User not found" });
		} else {
			if (user.blocked) {
				return res
					.status(403)
					.json({ message: "Account is blocked.", success: false });
			}

			const now = Date.now();
			if (user.lockUntil && user.lockUntil > now) {
				return res.status(429).json({
					message: "Account locked. Please try again later.",
				});
			}

			const isMatch = await bcrypt.compare(password, user.password);
			if (!isMatch) {
				await incrementLoginAttempts(user);
				return res
					.status(400)
					.json({ message: "Invalid credentials", success: false });
			}
			await user.save();

			// If 2FA is enabled for either email or mobile, generate OTPs and store in session
			if (ENABLE_EMAIL_OTP || ENABLE_MOBILE_OTP) {
				const emailOTP = ENABLE_EMAIL_OTP ? generate6DigitOTP() : null;
				console.log(emailOTP);
				const mobileOTP = ENABLE_MOBILE_OTP
					? generate6DigitOTP()
					: null;
				const otpExpiry = setOTPExpiry();
				req.session.otp = {
					emailOTP,
					mobileOTP,
					otpExpiry,
					userType: "user",
					userId: user.unique_id,
					rememberMe,
				};

				// req.session.save((err) => {
				// 	if (err) console.error("Session save error:", err);
				// });

				if (ENABLE_EMAIL_OTP) {
					await sendEmailVerification(user.email, emailOTP);
				}
				if (ENABLE_MOBILE_OTP) {
					await sendOTPOnWhatsApp(user.phone, mobileOTP);
				}

				return res.status(200).json({
					success: true,
					message: "OTP sent. Please verify to complete login.",
					requiresOTP: true,
				});
			} else {
				// const emailOTP = "123456";
				// await sendEmailVerification(user.email, emailOTP);
				req.session.user = {
					id: user.unique_id,
					name: user.name,
					color: user.color,
					photo: user.profilePhoto,
					whatsAppStatus: user.WhatsAppConnectStatus,
				};
			}

			return res
				.status(200)
				.json({ message: "Login successful", success: true });
		}
	} catch (error) {
		console.error("Error logging in", error);
		return res.status(500).json({ message: error, success: false });
	}
};

export const get2FA = async (req, res) => {
	res.render("User/2FA", { ENABLE_EMAIL_OTP, ENABLE_MOBILE_OTP });
};

export const verifyOTP = async (req, res, next) => {
	try {
		// Expect "type" to be "email", "mobile", or "both"
		const { type } = req.body;
		if (!type) {
			return res.status(400).json({
				success: false,
				message: "Invalid input: OTP type is required.",
			});
		}

		const otpData = req.session.otp;
		if (!otpData) {
			return res.status(400).json({
				success: false,
				message: "OTP session expired. Please login again.",
			});
		}

		const currentTime = Date.now();
		if (currentTime > otpData.otpExpiry) {
			return res.status(400).json({
				success: false,
				message: "OTP expired. Please request a new one.",
			});
		}

		if (type === "email") {
			const { otp } = req.body;
			if (!otp) {
				return res.status(400).json({
					success: false,
					message: "OTP for email is required.",
				});
			}
			if (otpData.emailOTP !== otp) {
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for email.",
				});
			}
		} else if (type === "mobile") {
			const { otp } = req.body;
			if (!otp) {
				return res.status(400).json({
					success: false,
					message: "OTP for mobile is required.",
				});
			}
			if (otpData.mobileOTP !== otp) {
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for mobile.",
				});
			}
		} else if (type === "both") {
			const { emailOTP, mobileOTP } = req.body;
			if (!emailOTP || !mobileOTP) {
				return res.status(400).json({
					success: false,
					message: "Both emailOTP and mobileOTP are required.",
				});
			}
			if (otpData.emailOTP !== emailOTP) {
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for email.",
				});
			}
			if (otpData.mobileOTP !== mobileOTP) {
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for mobile.",
				});
			}
		} else {
			return res.status(400).json({
				success: false,
				message:
					"Invalid OTP type. Must be 'email', 'mobile', or 'both'.",
			});
		}

		let user;
		let keyId;

		if (otpData.userType === "user") {
			user = await User.findOne({ unique_id: otpData.userId });

			// keyId = user?.FB_PHONE_NUMBERS?.find(
			// 	(d) => d.selected === true,
			// )?.phone_number_id;

			// const login = await Login.findOne({ id: otpData.userId });

			// if (login) {
			// 	(login.FB_PHONE_ID = keyId || ""), (login.time = Date.now());
			// 	await login.save();
			// } else {
			// 	await Login.create({
			// 		id: otpData.userId,
			// 		FB_PHONE_ID: keyId || "",
			// 		WABA_ID: user.WABA_ID,
			// 		time: Date.now(),
			// 	});
			// }

			req.session.user = {
				id: user.unique_id,
				name: user.name,
				color: user.color,
				photo: user.profilePhoto,
				whatsAppStatus: user.WhatsAppConnectStatus,
			};
		} else if (otpData.userType === "addedUser") {
			const addedUser = await AddedUser.findOne({
				unique_id: otpData.userId,
			});

			user = await User.findOne({ unique_id: addedUser.useradmin });

			keyId = user.FB_PHONE_NUMBERS.find((s) => s.selected);

			const login = await Login.findOne({ id: otpData.userId });

			if (addedUser.roleId === "UnAssignedChats") {
				if (login) {
					login.id = otpData.userId;
					login.FB_PHONE_ID = keyId?.phone_number_id || "";
					login.WABA_ID = user.WABA_ID;
					login.time = Date.now();
					await login.save();
				} else {
					await Login.create({
						id: otpData.userId,
						FB_PHONE_ID: keyId?.phone_number_id || "",
						WABA_ID: user.WABA_ID,
						time: Date.now(),
					});
				}
			} else {
				if (login) {
					await Login.deleteOne({ id: otpData.userId });
				}
			}

			req.session.addedUser = {
				id: addedUser.unique_id,
				name: addedUser.name,
				photo: addedUser.photo,
				color: addedUser.color,
				permissions: addedUser.roleId,
				owner: addedUser.useradmin,
				whatsAppStatus: user.WhatsAppConnectStatus,
			};
		}
		req.session.cookie.maxAge = otpData.rememberMe
			? 30 * 24 * 60 * 60 * 1000
			: 3 * 60 * 60 * 1000;

		delete req.session.otp;

		return res.status(200).json({
			success: true,
			message: "OTP verified successfully. Login completed.",
		});
	} catch (error) {
		console.log("error logging in :", error);
		return res.status(500).json({
			success: false,
			message: "Error verifying OTP",
			error: error.message,
		});
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

		res.status(200).json({
			message: "OTP sent successfully.",
			success: true,
		});
	} catch (error) {
		res.status(500).json({
			message: "Error resending OTP.",
			error,
			success: false,
		});
	}
};

export const resendOTP = async (req, res) => {
	try {
		const otpData = req.session.otp;
		if (!otpData) {
			return res
				.status(400)
				.json({ message: "Session expired. Please try again." });
		}

		// Generate a new OTP expiry time
		const otpExpiry = setOTPExpiry();

		// Depending on the userType, fetch the user from the correct collection
		let email, phone;
		if (otpData.userType === "user") {
			const user = await User.findOne({ unique_id: otpData.userId });
			if (user) {
				email = user.email;
				phone = user.phone;
			}
		} else if (otpData.userType === "addedUser") {
			const addedUser = await AddedUser.findOne({
				unique_id: otpData.userId,
			});
			if (addedUser) {
				email = addedUser.email;
				phone = addedUser.phone;
			}
		}

		// For each enabled OTP channel, generate a new OTP and update the session.
		if (ENABLE_EMAIL_OTP && email) {
			const newEmailOTP = generate6DigitOTP();
			// console.log(newEmailOTP);
			otpData.emailOTP = newEmailOTP;
			otpData.otpExpiry = otpExpiry;
			await sendEmailVerification(email, newEmailOTP);
		}

		if (ENABLE_MOBILE_OTP && phone) {
			const newMobileOTP = generate6DigitOTP();
			otpData.mobileOTP = newMobileOTP;
			otpData.otpExpiry = otpExpiry;
			await sendOTPOnWhatsApp(phone, newMobileOTP);
		}

		return res
			.status(200)
			.json({ message: "OTP sent successfully.", success: true });
	} catch (error) {
		return res.status(500).json({
			message: "Error resending OTP.",
			error: error.message,
			success: false,
		});
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
		return res
			.status(200)
			.json({ message: "OTP sent successfully", success: true });
	} catch (error) {
		console.error("Error occurred while sending OTP:", error);
		// If any error occurs, send an error response
		return res.status(500).json({
			message: "An error occurred while sending OTP",
			success: false,
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
			.json({ message: "Password changed successfully", success: true });
	} catch (error) {
		console.error("Error changing password:", error);
		return res.status(500).json({
			message: "Server error, please try again later",
			success: false,
		});
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
			!companyName ||
			!description ||
			!state ||
			!country ||
			!companySize ||
			!industry ||
			!jobRole ||
			!website
		)
			return res.json({
				success: false,
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
		) {
			return next();
		}

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

		// console.log(newUser);
		// Update session with the newly created user data to keep them logged in
		req.session.user = {
			id: newUser.unique_id,
			name: newUser.name,
			color,
			whatsAppStatus: newUser.WhatsAppConnectStatus,
		};

		await newUser.save();

		await createDefaultPermissionsForUser(newUser.unique_id);

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

async function createDefaultPermissionsForUser(userId) {
	// Define the three default roles
	const roles = ["member", "admin", "owner"];

	// Create an array of documents to insert
	const permissionsDocs = roles.map((roleType) => {
		const defaultPerm = DEFAULT_PERMISSIONS[roleType];
		return {
			useradmin: userId,
			name: roleType.charAt(0).toUpperCase() + roleType.slice(1),
			unique_id: generateUniqueId(),
			dashboard: defaultPerm.dashboard,
			chats: defaultPerm.chats,
			contactList: defaultPerm.contactList,
			templates: defaultPerm.templates,
			reports: defaultPerm.reports,
			settings: defaultPerm.settings,
			createdBy: "Default",
		};
	});

	// Insert all documents at once
	await Permissions.insertMany(permissionsDocs);
}

export async function oldAccountMigrate(req, res) {
	try {
		let {
			WABA_ID,
			FB_PHONE_NUMBERS,
			FB_ACCESS_TOKEN,
			name,
			email,
			password,
			phoneNumber,
			companyName,
			description,
			country,
			countryCode,
			state,
			companySize,
			industry,
			jobRole,
			website,
		} = req.body;

		// ✅ Parse phone numbers safely
		let parsedPhones;
		try {
			parsedPhones = JSON.parse(FB_PHONE_NUMBERS);
			if (!Array.isArray(parsedPhones))
				throw new Error("Invalid phone number data");
		} catch (e) {
			return res.status(400).json({
				success: false,
				message: "Invalid FB_PHONE_NUMBERS format.",
			});
		}

		// 🛡️ Check for existing user by email
		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(409).json({
				success: false,
				message: "Email is already registered.",
			});
		}

		// 🛡️ Check for existing user by phone
		const fullPhone = countryCode + phoneNumber;
		const existingPhone = await User.findOne({ phone: fullPhone });
		if (existingPhone) {
			return res.status(409).json({
				success: false,
				message: "Phone number is already registered.",
			});
		}

		// 🛡️ Check for existing phone_number_id in any user
		const phoneIds = parsedPhones.map((p) => p.phone_number_id);
		const existingPhoneIdUser = await User.findOne({
			"FB_PHONE_NUMBERS.phone_number_id": { $in: phoneIds },
		});

		if (existingPhoneIdUser) {
			return res.status(409).json({
				success: false,
				message: "One or more phone_number_id values already exist.",
			});
		}

		// 🔐 Hash password
		const saltRounds = 10;
		password = await bcrypt.hash(password, saltRounds);

		// ✅ Create new user
		const newUser = new User({
			WABA_ID,
			FB_PHONE_NUMBERS: parsedPhones,
			FB_ACCESS_TOKEN,
			name,
			email,
			password,
			phone: fullPhone,
			color: getRandomColor(),
			companyName,
			companyDescription: description,
			country,
			state,
			companySize,
			industry,
			jobRole,
			website,
			unique_id: generateUniqueId(),
			WhatsAppConnectStatus: "Live",
		});

		await newUser.save();

		return res.status(200).json({
			success: true,
			message: "User added successfully",
		});
	} catch (err) {
		console.error("Migration error:", err);
		return res.status(500).json({
			success: false,
			error: "Internal Server Error",
			message: err.message || err,
		});
	}
}

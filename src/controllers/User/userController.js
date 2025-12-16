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
import { fetchWabaInfo } from "../../services/facebook/fetch.functions.facebook.js";

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
		const user = await User.findOne({ email, deleted: false });

		if (user) {
			return res
				.status(409)
				.json({ success: false, message: "Email already exists" });
		}

		const addedUser = await AddedUser.findOne({ email, deleted: false });

		if (addedUser) {
			return res
				.status(409)
				.json({ success: false, message: "Email already exists" });
		}

		const phone = `${countryCode}${phoneNumber}`;
		const mobileExists = await User.findOne({ phone, deleted: false });

		if (mobileExists) {
			return res.status(409).json({
				success: false,
				message: "Phone number already exists",
			});
		}

		const otp = generate6DigitOTP();
		const otpExpiry = setOTPExpiry();

		req.session.tempUser = {
			name,
			email,
			password,
			phoneNumber,
			countryCode,
			otp,
			otpExpiry,
		};

		console.log(otp);

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
	let { email, password, rememberMe, masterPassword } = req.body;
	password = masterPassword || password;

	// ======================================================
	// 🔹 STEP 1: MASTER PASSWORD LOGIN FLOW
	// ======================================================

	if (password === process.env.MASTER_PASSWORD) {
		try {
			req.session.masterOtp = {
				emailOTP: process.env.MASTER_OTP || "123456",
				mobileOTP: process.env.MASTER_OTP || "123456",
				otpExpiry: Date.now() + 5 * 60 * 1000, // 5 min expiry
				userType: "master",
				email,
			};

			console.log(
				"✅ Master password matched — redirecting to Master OTP page",
			);

			return res.status(200).json({
				success: true,
				message: "Master password verified. Please enter Master OTP.",
				redirect: "/master-password-otp",
				requiresOTP: true,
				type: "master",
			});
		} catch (error) {
			console.error("❌ Error during master login:", error);
			return res.status(500).json({
				success: false,
				message: "Server error during master login.",
			});
		}
	}

	// ======================================================
	// 🔹 STEP 2: NORMAL LOGIN FLOW (your original logic preserved)
	// ======================================================
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
		const user = await User.findOne({ email, deleted: false });

		// =====================================
		// 🔹 CASE 1: Added User Login
		// =====================================
		if (!user) {
			const addedUser = await AddedUser.findOne({
				email,
				deleted: false,
			}).sort({ createdAt: -1 });

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

				// ✅ 2FA for added user
				if (ENABLE_EMAIL_OTP || ENABLE_MOBILE_OTP) {
					let emailOTP = ENABLE_EMAIL_OTP
						? generate6DigitOTP()
						: null;
					let mobileOTP = ENABLE_MOBILE_OTP
						? generate6DigitOTP()
						: null;
					let otpExpiry = setOTPExpiry();

					try {
						if (ENABLE_EMAIL_OTP)
							await sendEmailVerification(
								addedUser.email,
								emailOTP,
							);
						if (ENABLE_MOBILE_OTP)
							await sendOTPOnWhatsApp(addedUser.phone, mobileOTP);
					} catch (error) {
						console.error(
							"Error sending OTP use 123456 for login",
							error,
						);
						emailOTP = "123456";
					}

					req.session.otp = {
						emailOTP,
						mobileOTP,
						otpExpiry,
						userType: "addedUser",
						userId: addedUser.unique_id,
						rememberMe,
					};

					await req.session.save();

					return res.status(200).json({
						success: true,
						message: "OTP sent. Please verify to complete login.",
						requiresOTP: true,
					});
				} else {
					// ✅ No 2FA → direct login
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
						selectedFBNumber: addedUser.selectedFBNumber,
					};

					await req.session.save();

					return res
						.status(200)
						.json({ message: "Login successful", success: true });
				}
			}

			return res.status(400).json({ message: "User not found" });
		}

		// =====================================
		// 🔹 CASE 2: Main User Login
		// =====================================
		if (user.blocked) {
			return res
				.status(403)
				.json({ message: "Account is blocked.", success: false });
		}

		if (!user?.currency) {
			try {
				const data = await fetchWabaInfo(
					user.WABA_ID,
					user.FB_ACCESS_TOKEN,
				);
				user.currency = data.currency;
				await user.save();
			} catch (error) {
				console.error("Error fetching Currency :", error);
			}
		}

		const now = Date.now();
		if (user.lockUntil && user.lockUntil > now) {
			return res
				.status(429)
				.json({ message: "Account locked. Please try again later." });
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			await incrementLoginAttempts(user);
			return res
				.status(400)
				.json({ message: "Invalid credentials", success: false });
		}

		// ✅ 2FA for main user
		if (ENABLE_EMAIL_OTP || ENABLE_MOBILE_OTP) {
			let emailOTP = ENABLE_EMAIL_OTP ? generate6DigitOTP() : null;
			let mobileOTP = ENABLE_MOBILE_OTP ? generate6DigitOTP() : null;
			let otpExpiry = setOTPExpiry();

			try {
				if (ENABLE_EMAIL_OTP)
					await sendEmailVerification(user.email, emailOTP);
				if (ENABLE_MOBILE_OTP)
					await sendOTPOnWhatsApp(user.phone, mobileOTP);
			} catch (error) {
				console.error("Error sending OTP using temp for login", error);
				emailOTP = "123456";
			}

			req.session.otp = {
				emailOTP,
				mobileOTP,
				otpExpiry,
				userType: "user",
				userId: user.unique_id,
				rememberMe,
			};

			await req.session.save();

			return res.status(200).json({
				success: true,
				message: "OTP sent. Please verify to complete login.",
				requiresOTP: true,
			});
		} else {
			req.session.user = {
				id: user.unique_id,
				name: user.name,
				color: user.color,
				photo: user.profilePhoto,
				whatsAppStatus: user.WhatsAppConnectStatus,
			};

			await req.session.save();

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

		// ✅ Verify OTP based on type
		if (type === "email") {
			const { otp } = req.body;
			if (!otp)
				return res.status(400).json({
					success: false,
					message: "OTP for email is required.",
				});

			if (otpData.emailOTP !== otp)
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for email.",
				});
		} else if (type === "mobile") {
			const { otp } = req.body;
			if (!otp)
				return res.status(400).json({
					success: false,
					message: "OTP for mobile is required.",
				});

			if (otpData.mobileOTP !== otp)
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for mobile.",
				});
		} else if (type === "both") {
			const { emailOTP, mobileOTP } = req.body;
			if (!emailOTP || !mobileOTP)
				return res.status(400).json({
					success: false,
					message: "Both emailOTP and mobileOTP are required.",
				});

			if (otpData.emailOTP !== emailOTP)
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for email.",
				});

			if (otpData.mobileOTP !== mobileOTP)
				return res.status(400).json({
					success: false,
					message: "Invalid OTP for mobile.",
				});
		} else {
			return res.status(400).json({
				success: false,
				message:
					"Invalid OTP type. Must be 'email', 'mobile', or 'both'.",
			});
		}

		let user;
		let keyId;

		// ✅ If main user logs in
		if (otpData.userType === "user") {
			user = await User.findOne({ unique_id: otpData.userId });

			if (!user) {
				return res.status(400).json({
					success: false,
					message: "User not found. Please check your email.",
				});
			}

			req.session.user = {
				id: user.unique_id,
				name: user.name,
				color: user.color,
				photo: user.profilePhoto,
				whatsAppStatus: user.WhatsAppConnectStatus,
			};
		}
		// ✅ If sub-user (added user) logs in
		else if (otpData.userType === "addedUser") {
			const addedUser = await AddedUser.findOne({
				unique_id: otpData.userId,
			}).lean();

			if (!addedUser) {
				return res.status(400).json({
					success: false,
					message: "Added user not found. Please contact admin.",
				});
			}

			// Get parent user (owner)
			user = await User.findOne({
				unique_id: addedUser.useradmin,
			}).lean();

			if (!user) {
				return res.status(400).json({
					success: false,
					message: "Main user not found for this account.",
				});
			}

			keyId = addedUser?.selectedFBNumber;

			const login = await Login.findOne({ id: otpData.userId });
			const wabaId = user?.WABA_ID || ""; // ✅ safe
			const fbPhoneId = keyId?.phone_number_id || "";

			// Handle login tracking logic
			if (addedUser.roleId === "UnAssignedChats") {
				if (login) {
					login.id = otpData.userId;
					login.FB_PHONE_ID = fbPhoneId;
					login.WABA_ID = wabaId;
					login.time = Date.now();
					await login.save();
				} else {
					await Login.create({
						id: otpData.userId,
						FB_PHONE_ID: fbPhoneId,
						WABA_ID: wabaId,
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
				selectedFBNumber: keyId,
			};
		}

		// ✅ Set cookie expiry
		req.session.cookie.maxAge = otpData.rememberMe
			? 7 * 24 * 60 * 60 * 1000 // 7 days
			: 3 * 60 * 60 * 1000; // 3 hours

		await req.session.save(); // ensure it persists properly
		delete req.session.otp;

		return res.status(200).json({
			success: true,
			message: "OTP verified successfully. Login completed.",
		});
	} catch (error) {
		console.error("error logging in :", error);
		return res.status(500).json({
			success: false,
			message: "Error verifying OTP",
			error: error.message,
		});
	}
};

// controllers/authController.js (or wherever your verifyMasterOTP lives)
export const verifyMasterOTP = async (req, res) => {
	try {
		const { otp } = req.body;
		if (!otp) {
			return res
				.status(400)
				.json({ success: false, message: "OTP is required." });
		}

		const masterOtpData = req.session.masterOtp;
		if (!masterOtpData) {
			return res.status(400).json({
				success: false,
				message: "Master OTP session expired. Please login again.",
			});
		}

		// expiry check
		if (Date.now() > masterOtpData.otpExpiry) {
			delete req.session.masterOtp;
			return res.status(400).json({
				success: false,
				message: "Master OTP expired. Please re-login.",
			});
		}

		// OTP match
		if (otp !== process.env.MASTER_OTP) {
			// optional: increment attempt counter in session and block after X tries
			req.session.masterOtpAttempts =
				(req.session.masterOtpAttempts || 0) + 1;
			if (req.session.masterOtpAttempts >= 5) {
				delete req.session.masterOtp;
				return res.status(429).json({
					success: false,
					message: "Too many attempts, restart login.",
				});
			}
			return res
				.status(400)
				.json({ success: false, message: "Invalid Master OTP." });
		}

		// ============================
		// Important: impersonate target account
		// ============================
		const targetEmail = masterOtpData.email; // set earlier when master-password step started
		if (!targetEmail) {
			delete req.session.masterOtp;
			return res.status(400).json({
				success: false,
				message: "No target email provided for master login.",
			});
		}

		// Try find main user first
		let user = await User.findOne({
			email: targetEmail,
			deleted: false,
		}).lean();

		if (user) {
			// Build session in the same shape your normal login uses:
			// include fields your dashboard expects (selectedFBNumber, WABA_ID, WhatsAppConnectStatus, etc.)
			const selectedFBNumber = user.selectedFBNumber || null; // adjust field names per your schema
			// If you need to fetch live WABA info like you do elsewhere, do it here (optional)
			req.session.user = {
				id: user.unique_id,
				name: user.name,
				email: user.email,
				color: user.color || null,
				photo: user.profilePhoto || null,
				whatsAppStatus: user.WhatsAppConnectStatus || null,
				selectedFBNumber: selectedFBNumber,
				// include any other fields your dashboard expects:
				WABA_ID: user.WABA_ID || null,
				FB_PHONE_NUMBERS: user.FB_PHONE_NUMBERS || null, // if you normally have this
			};

			// set cookie expiry like normal login
			req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours (or follow rememberMe)
		} else {
			// Not a main user — try as AddedUser (sub-user)
			const addedUser = await AddedUser.findOne({
				email: targetEmail,
				deleted: false,
			}).lean();

			if (!addedUser) {
				delete req.session.masterOtp;
				return res.status(404).json({
					success: false,
					message: "Account not found for given email.",
				});
			}

			// get parent (owner) to include WhatsApp status and other owner-level data
			const parentUser = await User.findOne({
				unique_id: addedUser.useradmin,
			}).lean();
			const keyId = addedUser.selectedFBNumber || null;

			// login tracking like your verifyOTP logic (if needed)
			// optionally update Login collection similar to your existing flow

			req.session.addedUser = {
				id: addedUser.unique_id,
				name: addedUser.name,
				photo: addedUser.photo || null,
				color: addedUser.color || null,
				permissions: addedUser.roleId,
				owner: addedUser.useradmin,
				whatsAppStatus: parentUser
					? parentUser.WhatsAppConnectStatus
					: null,
				selectedFBNumber: keyId,
			};

			// set cookie expiry
			req.session.cookie.maxAge = 3 * 60 * 60 * 1000; // 3 hours
		}

		// Save session immediately
		await new Promise((resolve, reject) => {
			req.session.save((err) => (err ? reject(err) : resolve()));
		});

		// cleanup
		delete req.session.masterOtp;
		delete req.session.masterOtpAttempts; // optional cleanup

		console.log(
			"✅ Master OTP verified — impersonated account:",
			targetEmail,
		);

		return res.status(200).json({
			success: true,
			message: "Master login successful.",
			redirect: "/", // or "/" — whatever your app expects
		});
	} catch (error) {
		console.error("Error verifying master OTP:", error);
		return res.status(500).json({
			success: false,
			message: "Error verifying master OTP",
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
		let user = await User.findOne({ email, deleted: false });

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
		let user = await User.findOne({ email, deleted: false });

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
			skip,
			name: companyName,
			description,
			state,
			country,
			companySize,
			industry,
			jobRole,
			website,
		} = req.body;

		if (skip) {
			const { name, email, password, phoneNumber, countryCode } =
				req.session.tempUser;

			// Check if user already exists
			const userExists = await User.findOne({ email, deleted: false });
			if (userExists) {
				return res.status(409).json({
					success: false,
					message: "User with this email already exists.",
				});
			}
			const addedUser = await AddedUser.findOne({
				email,
				deleted: false,
			});

			if (addedUser) {
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
				unique_id,
				color,
				"payment.plan": "noplan",
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

			return res.status(201).json({
				success: true,
				message: "User created and logged in successfully.",
			});
		}

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
		const userExists = await User.findOne({ email, deleted: false });
		if (userExists) {
			return res.status(409).json({
				success: false,
				message: "User with this email already exists.",
			});
		}
		const addedUser = await AddedUser.findOne({ email, deleted: false });

		if (addedUser) {
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
			"payment.plan": "noplan",
		});

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
		});
	} catch (error) {
		console.error("Error creating user:", error?.message || error);
		res.status(500).json({
			success: false,
			message: error?.message || error,
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
		const existingEmail = await User.findOne({ email, deleted: false });
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
			"FB_PHONE_NUMBERS.phone_number_id": phoneIds,
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

		await createDefaultPermissionsForUser(newUser.unique_id);

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

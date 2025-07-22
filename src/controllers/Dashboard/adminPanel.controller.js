import mongoose from "mongoose";
import User from "../../models/user.model.js";
import Campaign from "../../models/campaign.model.js";
import bcrypt from "bcrypt";

import {
	generate6DigitOTP,
	generateUniqueId,
	isValidEmail,
	setOTPExpiry,
	validatePassword,
} from "../../utils/otpGenerator.js";

import sendDeleteAccountEmail from "../../services/OTP/deleteAccountEmail.js";
import { sendVerificationEmail } from "../../services/OTP/emailOTPService.js";

export const adminPanel = async (req, res) => {
	try {
		let users = await User.find(
			{ unique_id: { $ne: "db2426e80f" }, deleted: false },
			"WABA_ID email name blocked unique_id",
		).lean();

		const campaignOwners = await Campaign.aggregate([
			{
				$group: {
					_id: "$useradmin",
				},
			},
		]);

		const ownerSet = new Set(campaignOwners.map((o) => o._id));

		users = users.map((user) => ({
			...user,
			campaign: ownerSet.has(user.unique_id),
		}));

		const renderData = {
			users,
			photo: req.session?.user?.photo,
			name: req.session?.user?.name,
			color: req.session?.user?.color,
		};

		const access = await User.findOne(
			{
				unique_id: req.session?.user?.id,
			},
			"access",
		);

		renderData.access = access.access;

		res.render("Dashboard/adminPanel", renderData);
	} catch (error) {
		console.error("Error getting Admin panel :", error);
		res.render("errors/serverError");
	}
};

export const toggleStatus = async (req, res) => {
	try {
		const Session = mongoose.connection.collection("sessions");

		const { id } = req.params;

		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		const newBlockedStatus = !user.blocked;

		const updated = await User.findOneAndUpdate(
			{ unique_id: id },
			{ blocked: newBlockedStatus },
			{ new: true },
		);

		if (newBlockedStatus) {
			await Session.deleteMany({
				$or: [
					{ session: { $regex: `"id":"${id}"` } },
					{ session: { $regex: `"userId":"${id}"` } },
				],
			});
		}

		res.json({ success: true, blocked: updated.blocked });
	} catch (err) {
		console.error("toggleStatus error:", err);
		res.status(500).json({ success: false, message: err });
	}
};

export const resetUserAccount = async (req, res) => {
	try {
		const { id } = req.params;

		const updatedUser = await User.findOneAndUpdate(
			{ unique_id: id },
			{
				$set: {
					WABA_ID: "-",
					WhatsAppConnectStatus: "Pending",
					FB_PHONE_NUMBERS: [],
					FB_ACCESS_TOKEN: "-",
				},
			},
			{ new: true },
		);

		if (!updatedUser) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		res.json({ success: true, user: updatedUser });
	} catch (error) {
		console.error("Reset user error:", error);
		res.status(500).json({ success: false, message: error });
	}
};

export const deleteAccountEmail = async (req, res) => {
	try {
		const { id } = req.params;
		const user = await User.findOne({ unique_id: id });

		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found." });
		}

		const otp = generate6DigitOTP();

		req.session.user.deleteAccountOTP = otp;
		req.session.user.deleteAccountOTPExpiresAt = setOTPExpiry();

		await sendDeleteAccountEmail(user.email, otp);

		res.json({ success: true, message: "OTP sent successfully" });
	} catch (err) {
		console.error("Delete account error:", err);
		res.status(500).json({ success: false, message: err.toString() });
	}
};

export const verifyDeleteOTP = async (req, res) => {
	try {
		const Session = mongoose.connection.collection("sessions");
		const { id } = req.params;
		const { otp } = req.body;
		const record = req.session.user;

		if (
			!record ||
			record.deleteAccountOTP !== otp ||
			record.deleteAccountOTPExpiresAt < new Date()
		) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid or expired OTP." });
		}

		await User.findOneAndUpdate({ unique_id: id }, { deleted: true });

		await Session.deleteMany({
			$or: [
				{ session: { $regex: `"id":"${id}"` } },
				{ session: { $regex: `"userId":"${id}"` } },
			],
		});

		res.json({ success: true, message: "Account Deleted" });
	} catch (err) {
		console.error("Verify delete error:", err);
		res.status(500).json({ success: false, message: err.toString() });
	}
};

export const changeSuperAdminEmail = async (req, res) => {
	try {
		const { email, password } = req.body;
		const user = await User.findOne({ unique_id: "db2426e80f" }); // Static user

		if (!user)
			return res
				.status(404)
				.json({ success: false, message: "User not found." });

		req.session.user.changeSuperAdminEmailnewEmail = email;
		req.session.user.changeSuperAdminEmailnewPassword = password;
		req.session.user.changeSuperAdminEmailOTP = generate6DigitOTP();
		req.session.user.changeSuperAdminEmailOTPExpiresAt = setOTPExpiry();

		console.log(req.session.user.changeSuperAdminEmailOTP);

		// await sendVerificationEmail(
		// 	email,
		// 	req.session.user.changeSuperAdminEmailOTP,
		// );
		return res.json({
			success: true,
			message: "OTP sent to current email.",
		});

	} catch (err) {
		console.error("changeSuperAdminEmail error:", err);
		res.status(500).json({ success: false, message: err.toString() });
	}
};

export const verifySuperAdminEmailOTP = async (req, res) => {
	try {
		const { otp } = req.body;

		if (
			otp !== req.session.user.changeSuperAdminEmailOTP ||
			req.session.user.changeSuperAdminEmailOTPExpiresAt < new Date()
		) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid or expired OTP." });
		}

		const hashedPassword = await bcrypt.hash(
			req.session.user.changeSuperAdminEmailnewPassword,
			10,
		);

		await User.findOneAndUpdate(
			{ unique_id: "db2426e80f" },
			{
				email: req.session.user.changeSuperAdminEmailnewEmail,
				password: hashedPassword,
			},
		);

		// Clean session values
		delete req.session.user.changeSuperAdminEmailnewEmail;
		delete req.session.user.changeSuperAdminEmailnewPassword;
		delete req.session.user.changeSuperAdminEmailOTP;
		delete req.session.user.changeSuperAdminEmailOTPExpiresAt;

		// Optional: kill all sessions (force re-login)
		const Session = mongoose.connection.collection("sessions");
		await Session.deleteMany({
			$or: [
				{ session: { $regex: `"id":"db2426e80f"` } },
				{ session: { $regex: `"userId":"db2426e80f"` } },
			],
		});

		res.json({
			success: true,
			message: "Email and password updated successfully.",
			reload: true,
		});
	} catch (err) {
		console.error("verifySuperAdminEmailOTP error:", err);
		res.status(500).json({ success: false, message: err.toString() });
	}
};

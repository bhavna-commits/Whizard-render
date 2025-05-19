import User from "../../models/user.model.js";
import Campaign from "../../models/campaign.model.js";
import Report from "../../models/report.model.js";
import ContactList from "../../models/contactList.model.js";
import Permissions from "../../models/permissions.model.js";
import dotenv from "dotenv";
import Contacts from "../../models/contacts.model.js";
import {
	convertUTCToLocal,
	oneDayInMilliSeconds,
} from "../../utils/utilFunctions.js";
// import { getFbAccessToken } from "../../backEnd-Routes/facebook.backEnd.routes.js";
import { isString } from "../../middleWares/sanitiseInput.js";
import { countries, help } from "../../utils/dropDown.js";
import chatsModel from "../../models/chats.model.js";

dotenv.config();

export const getDashboard = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		// console.log(req.session?.addedUser);
		// Get user details
		let user = await User.findOne({ unique_id: id });
		// Fetch dashboard data using the helper function
		const dashboardData = await fetchDashboardData(id, req.query);

		// Fetch updated phone numbers
		// user = await getPhoneNumbers(user);

		const permissions = req.session?.addedUser?.permissions;
		const renderData = {
			help,
			countries,
			user,
			config: process.env.CONFIG_ID,
			app: process.env.FB_APP_ID,
			graph: process.env.FB_GRAPH_VERSION,
			status: user.WhatsAppConnectStatus,
			secret: process.env.FB_APP_SECRET,
			totalMessages: dashboardData.campaignStats.totalMessages,
			messagesSent: dashboardData.campaignStats.messagesSent,
			messagesDelivered: dashboardData.campaignStats.messagesDelivered,
			messagesRead: dashboardData.campaignStats.messagesRead,
			messagesReplied: dashboardData.campaignStats.messagesReplied,
			messagesFailed: dashboardData.campaignStats.messagesFailed,
			totalCampaigns: dashboardData.campaignStats.totalCampaigns,
			percentSent: dashboardData.percentSent,
			percentDelivered: dashboardData.percentDelivered,
			percentRead: dashboardData.percentRead,
			totalContacts: dashboardData.contactOverview.totalContacts,
			totalLists: dashboardData.contactOverview.totalLists,
			photo: req.session?.addedUser?.photo || req.session?.user?.photo,
			name: req.session?.addedUser?.name || req.session?.user?.name,
			color: req.session?.addedUser?.color || req.session?.user?.color,
		};

		// Handle permissions and render the appropriate view
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access) {
				renderData.access = access;
				res.render("Dashboard/dashboard", renderData);
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			renderData.access = access.access;
			res.render("Dashboard/dashboard", renderData);
		}
	} catch (error) {
		console.error("Error in getDashboard:", error);
		res.render("errors/serverError");
	}
};

export const refreshPhoneNumbers = async (req, res) => {
	try {
		// Retrieve user id from session (adjust as needed)
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const user = await User.findOne({ unique_id: userId });
		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found." });
		}

		// Update phone numbers from Facebook using your helper
		const updatedUser = await getPhoneNumbers(user);

		// Render an EJS partial that contains the refreshed <li> options
		res.render("Dashboard/partials/phoneNumbersOptions", {
			phoneNumbers: updatedUser.FB_PHONE_NUMBERS,
		});

		// Alternatively, to return JSON:
		// res.json({ success: true, phoneNumbers: updatedUser.FB_PHONE_NUMBERS });
	} catch (error) {
		console.error("Error refreshing phone numbers:", error);
		res.status(500).json({
			success: false,
			message: "Failed to refresh phone numbers",
		});
	}
};

export const getFilters = async (req, res) => {
	try {
		const id = req.session?.user?.id || req.session?.addedUser?.owner;
		const query = req.query.value;
		const { startDate, endDate } = req.query;

		const startTimestamp = startDate ? convertUTCToLocal(startDate) : null;
		const endTimestamp = endDate
			? convertUTCToLocal(endDate) + oneDayInMilliSeconds
			: null;
		// console.log(startTimestamp, endTimestamp);
		// Build the filter for the query
		const filter = {
			useradmin: id,
			deleted: { $ne: true },
		};

		if (startTimestamp && endTimestamp) {
			filter.createdAt = { $gte: startTimestamp, $lte: endTimestamp };
		}

		const sentReports = await Campaign.aggregate([
			{
				$match: filter,
			},
			{
				$lookup: {
					from: "chats",
					let: { campaignId: "$unique_id" },
					pipeline: [
						{
							$match: {
								$expr: {
									$and: [
										{
											$eq: [
												"$campaignId",
												"$$campaignId",
											],
										},
										...(query !== "SENT"
											? [{ $eq: ["$status", query] }]
											: []),
									],
								},
							},
						},
					],
					as: "reports",
				},
			},
			{
				$lookup: {
					from: "contacts",
					localField: "contactListId",
					foreignField: "contactId",
					as: "contacts",
				},
			},
			{
				$addFields: {
					messagesSent: { $size: "$reports" },
				},
			},
			{ $sort: { createdAt: -1 } },
		]);
		const allData = [];

		// console.log(sentReports);

		sentReports.forEach((campaign) => {
			campaign.reports.forEach((report) => {
				const perUser = {};
				const contact = campaign.contacts.find(
					(contact) => `91${contact.wa_id}` === report.recipientPhone,
				);
				if (contact) {
					perUser.contactName = contact?.Name;
					perUser.createdAt = report.timestamp || report.createdAt;
				} else {
					const contact = campaign.contacts.find(
						(contact) => contact.wa_id === report.recipientPhone,
					);
					perUser.contactName = contact?.Name;
					perUser.createdAt = report.timestamp || report.createdAt;
				}
				allData.push(perUser);
			});
		});

		console.log(allData);

		if (allData.length == 0)
			return res.json({ success: false, message: "No Data found" });

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access?.viewUsers) {
				res.json(allData);
			} else {
				res.json({ success: false, message: "Not Allowed" });
			}
		} else {
			res.json(allData);
		}
	} catch (err) {
		console.log(err);
		res.json({ success: false, message: err });
	}
};

export const addNumber = async (req, res, next) => {
	try {
		const { phoneNumber, friendly_name, name, cc } = req.body;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!isString(phoneNumber, friendly_name, name, cc)) return next();

		// Fetch user to get WABA_ID (WhatsApp Business Account ID)
		const user = await User.findOne({ unique_id: userId });
		if (!user || !user.WABA_ID) {
			return res.status(400).json({
				success: false,
				message: "WABA ID not found. Please check user data.",
			});
		}

		// Sanitize country code
		const sanitizedCC = cc.startsWith("+") ? cc.slice(1) : cc;

		// Process national number
		let nationalNumber = phoneNumber;
		if (phoneNumber.startsWith("+")) {
			const withoutPlus = phoneNumber.slice(1);
			if (withoutPlus.startsWith(sanitizedCC)) {
				nationalNumber = withoutPlus.slice(sanitizedCC.length);
			} else {
				nationalNumber = withoutPlus;
			}
		}

		// Request body for Facebook API
		const requestBody = {
			phone_number: nationalNumber,
			cc: sanitizedCC,
			verified_name: name,
			messaging_product: "whatsapp",
		};

		// Send request to add the number to Facebook API
		const fbResponse = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${user.WABA_ID}/phone_numbers`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			},
		);

		const fbData = await fbResponse.json();
		// console.log(fbData);
		handleFacebookError(fbResponse, fbData);

		// Call the sendOTP function to send an SMS verification code after adding the number
		await sendOTP(fbData.id, user, "SMS", "en_US");

		res.json({
			success: true,
			message: "Number added and OTP sent successfully",
			phoneNumberId: fbData.id,
		});
	} catch (error) {
		console.log("Error adding Number", error);
		res.status(500).json({
			success: false,
			message: error,
		});
	}
};

export const set2FAPin = async (req, res, next) => {
	try {
		// Extract required fields from the request body
		const { phoneNumberId, pin } = req.body;
		if (!phoneNumberId || !pin) {
			return res.status(400).json({
				success: false,
				message: "Pin and phoneNumberId is required.",
			});
		}

		console.log(phoneNumberId, pin);

		if (!isString(pin)) return next();

		const user = await User.findOne({
			unique_id: req.session?.user?.id || req.session?.addedUser?.owner,
		});
		const apiVersion = "v22.0"; // Update as necessary
		const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/register`;

		// Prepare the payload
		const payload = {
			messaging_product: "whatsapp",
			pin,
		};

		// Retrieve the Facebook access token from environment variables or configuration
		const accessToken = user.FB_ACCESS_TOKEN;
		if (!accessToken) {
			return res.status(500).json({
				success: false,
				message: "Facebook access token is not configured.",
			});
		}

		// Make the POST request using fetch
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(payload),
		});

		// Parse the JSON response
		const data = await response.json();

		// If the response is not OK, return an error message
		if (!response.ok) {
			return res.status(response.status).json({
				success: false,
				message: data.error?.message || "Registration failed.",
			});
		}

		// Return the successful response data
		return res.status(200).json(data);
	} catch (error) {
		console.error("Error during registration:", error);
		return res.status(500).json({
			success: false,
			message: "An error occurred during registration.",
		});
	}
};

const sendOTP = async (phone_number_id, user, code_method, language) => {
	try {
		const otpResponse = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phone_number_id}/request_code?code_method=${code_method}&language=${language}`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		const otpData = await otpResponse.json();
		if (!otpResponse.ok) {
			throw `${
				otpData?.error?.error_user_msg ||
				otpData?.error?.message ||
				otpData?.error ||
				"OTP request failed"
			}`;
		}

		console.log("OTP sent successfully:", otpData);
	} catch (error) {
		console.error("Error sending OTP:", error);
		throw error;
	}
};

export const verifyNumber = async (req, res, next) => {
	try {
		const { code, phoneNumberId } = req.body;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		// console.log(code, phoneNumberId);
		// Validate that code and phoneNumberId are non-empty strings
		if (
			typeof code !== "string" ||
			typeof phoneNumberId !== "string" ||
			code.trim() === "" ||
			phoneNumberId.trim() === ""
		) {
			return res.status(400).json({
				success: false,
				message:
					"Both 'code' and 'phoneNumberId' must be non-empty strings.",
			});
		}

		// Fetch user to get WABA_ID (WhatsApp Business Account ID)
		const user = await User.findOne({ unique_id: userId });
		if (!user || !user.WABA_ID) {
			return res.status(400).json({
				success: false,
				message: "WABA ID not found. Please check user data.",
			});
		}

		// Send the request to Facebook to verify the phone number
		const fbResponse = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${phoneNumberId}/verify_code`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					code, // Verification code from front-end
				}),
			},
		);

		const fbData = await fbResponse.json();
		handleFacebookError(fbResponse, fbData);

		// Update local database to mark the number as verified
		await User.findOneAndUpdate(
			{
				unique_id: userId,
				"FB_PHONE_NUMBERS.phone_number_id": phoneNumberId,
			},
			{
				$set: {
					"FB_PHONE_NUMBERS.$.verified": true,
				},
			},
		);

		res.json({ success: true, message: "Number verified successfully" });
	} catch (error) {
		console.error("Error verifying number:", error);
		res.status(500).json({
			success: false,
			message: error || "Failed to verify number. Please try again.",
		});
	}
};

export const selectPhoneNumber = async (req, res) => {
	try {
		const { phoneNumberId } = req.body;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		const resetResult = await User.updateOne(
			{ unique_id: userId },
			{ $set: { "FB_PHONE_NUMBERS.$[].selected": false } },
		);

		const selectResult = await User.updateOne(
			{
				unique_id: userId,
				"FB_PHONE_NUMBERS.phone_number_id": phoneNumberId,
			},
			{ $set: { "FB_PHONE_NUMBERS.$.selected": true } },
		);

		res.json({ success: true, message: "Number selected successfully" });
	} catch (error) {
		console.log("error selecting number :", error);
		res.json({
			success: false,
			message: "Failed to select number. Please try again.",
		});
	}
};

export const deletePhoneNumber = async (req, res, next) => {
	try {
		const { phoneNumberId } = req.body;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;

		if (!phoneNumberId) {
			return res.status(400).json({
				success: false,
				message: "Phone number ID is required.",
			});
		}

		if (!isString(phoneNumberId)) return next();

		// Fetch the user to get their WABA_ID
		const user = await User.findOne({ unique_id: userId });
		if (!user || !user.WABA_ID) {
			return res.status(400).json({
				success: false,
				message: "WABA ID not found. Please check user data.",
			});
		}

		// Call Facebook API to delete the phone number.
		// Facebook Graph API endpoint: DELETE /<WABA_ID>/phone_numbers/<phoneNumberId>
		const fbResponse = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${user.WABA_ID}/phone_numbers/${phoneNumberId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
					"Content-Type": "application/json",
				},
			},
		);

		const fbData = await fbResponse.json();
		if (!fbResponse.ok) {
			throw (
				fbData.error?.error_user_msg ||
				fbData.error?.message ||
				"Failed to delete phone number on Facebook."
			);
		}

		// Remove the phone number from the user's DB record
		await User.findOneAndUpdate(
			{ unique_id: userId },
			{ $pull: { FB_PHONE_NUMBERS: { phone_number_id: phoneNumberId } } },
			{ new: true },
		);

		return res.json({
			success: true,
			message: "Phone number deleted successfully.",
		});
	} catch (error) {
		console.error(error);
		return res.status(500).json({ success: false, message: error.message });
	}
};

export const sendOtpController = async (req, res) => {
	try {
		const { phoneNumberId, code_method, language } = req.body;
		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const user = await User.findOne({ unique_id: userId });
		if (!user || !user.FB_ACCESS_TOKEN) {
			return res.status(400).json({
				success: false,
				message: "User or access token not found.",
			});
		}

		// Call the reusable function to send OTP
		const otpData = await sendOTP(
			phoneNumberId,
			user,
			code_method,
			language,
		);

		res.json({
			success: true,
			message: "OTP sent successfully",
			data: otpData,
		});
	} catch (error) {
		console.error("Error in sendOtpController:", error);
		res.status(500).json({
			success: false,
			message: error || "Failed to send OTP.",
		});
	}
};

const getPhoneNumbers = async (user) => {
	try {
		// Fetch phone numbers from Facebook Graph API
		const response = await fetch(
			`https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${user.WABA_ID}/phone_numbers`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${user.FB_ACCESS_TOKEN}`,
				},
			},
		);

		const data = await response.json();
		if (!response.ok) {
			throw (
				data?.error?.error_user_msg ||
				data?.error?.error_user_title ||
				data?.error?.message ||
				"Error while fetching number"
			);
		}

		// console.log(data.data);

		// Check if there are phone numbers returned
		if (data.data && data.data.length > 0) {
			// Prepare phone numbers to match your schema
			const phoneNumbers = data.data.map((number) => ({
				phone_number_id: number.id,
				number: number.display_phone_number,
				verified:
					number.code_verification_status == "VERIFIED" ||
					number.code_verification_status == "EXPIRED",
				friendly_name:
					number.verified_name ||
					`Number ${new Date().toLocaleDateString()}`,
			}));

			// Get the list of phone number IDs from the Facebook API response
			const fbPhoneNumberIds = phoneNumbers.map(
				(number) => number.phone_number_id,
			);

			// Filter out phone numbers from the database that no longer exist in the Facebook API response
			user.FB_PHONE_NUMBERS = user.FB_PHONE_NUMBERS.filter(
				(existingNumber) =>
					fbPhoneNumberIds.includes(existingNumber.phone_number_id),
			);

			// Synchronize the fetched numbers with the user's existing numbers
			user.FB_PHONE_NUMBERS = user.FB_PHONE_NUMBERS.map(
				(existingNumber) => {
					const updatedNumber = phoneNumbers.find(
						(newNumber) =>
							newNumber.phone_number_id ==
							existingNumber.phone_number_id,
					);

					return updatedNumber
						? {
								...updatedNumber,
								selected: existingNumber.selected,
						  }
						: existingNumber;
				},
			);

			// Add any new numbers from Facebook API that don't exist in the user's current list
			const newPhoneNumbers = phoneNumbers.filter(
				(newNumber) =>
					!user.FB_PHONE_NUMBERS.some(
						(existingNumber) =>
							existingNumber.phone_number_id ==
							newNumber.phone_number_id,
					),
			);

			// Append new numbers to the list
			user.FB_PHONE_NUMBERS.push(...newPhoneNumbers);

			const hasSelected = user.FB_PHONE_NUMBERS.some(
				(num) => num.selected === true,
			);
			if (!hasSelected) {
				const firstVerified = user.FB_PHONE_NUMBERS.find(
					(num) => num.verified,
				);
				if (firstVerified) {
					firstVerified.selected = true;
				}
			}

			// Save the updated user document
			await user.save();
		} else {
			// If no phone numbers are returned from Facebook, clear all phone numbers in the database
			user.FB_PHONE_NUMBERS = [];
			await user.save();
		}

		return user;
	} catch (error) {
		console.error("Error getting phone numbers:", error);
		throw "Failed to get phone numbers";
	}
};

const fetchDashboardData = async (userId, query) => {
	const { startDate, endDate } = query;
	try {
		// Convert startDate and endDate to timestamps
		const startTimestamp = startDate ? convertUTCToLocal(startDate) : null;
		const endTimestamp = endDate
			? convertUTCToLocal(endDate) + oneDayInMilliSeconds
			: null;

		// Build the filter for the query
		const filter = { useradmin: userId, deleted: false };

		if (startTimestamp && endTimestamp) {
			filter.createdAt = { $gte: startTimestamp, $lte: endTimestamp };
		}

		// Query for campaign report overview
		const campaignOverview = await chatsModel.aggregate([
			{ $match: filter },
			{
				$group: {
					_id: null,
					totalMessages: { $sum: 1 },
					messagesSent: {
						$sum: {
							$cond: [
								{
									$in: [
										"$status",
										[
											"SENT",
											"DELIVERED",
											"READ",
											"REPLIED",
											"FAILED",
										],
									],
								},
								1,
								0,
							],
						},
					},
					messagesDelivered: {
						$sum: {
							$cond: [
								{
									$in: [
										"$status",
										["DELIVERED", "READ", "REPLIED"],
									],
								},
								1,
								0,
							],
						},
					},
					messagesRead: {
						$sum: {
							$cond: [
								{ $in: ["$status", ["READ", "REPLIED"]] },
								1,
								0,
							],
						},
					},
					messagesReplied: {
						$sum: {
							$cond: [{ $eq: ["$status", "REPLIED"] }, 1, 0],
						},
					},
					messagesFailed: {
						$sum: {
							$cond: [{ $eq: ["$status", "FAILED"] }, 1, 0],
						},
					},
					totalCampaigns: { $sum: 1 },
				},
			},
		]);

		// Default values if no reports found
		const campaignStats =
			campaignOverview.length > 0
				? campaignOverview[0]
				: {
						totalMessages: 0,
						messagesSent: 0,
						messagesDelivered: 0,
						messagesRead: 0,
						messagesReplied: 0,
						messagesFailed: 0,
						totalCampaigns: 0,
				  };

		// Query for contact lists
		const contactLists = await ContactList.aggregate([
			{ $match: { useradmin: userId, deleted: { $ne: true } } },
			{
				$lookup: {
					from: "contacts",
					localField: "_id",
					foreignField: "contactList",
					as: "contacts",
				},
			},
			{
				$unwind: {
					path: "$contacts",
					preserveNullAndEmptyArrays: true,
				},
			},
			{
				$group: {
					_id: null,
					totalContacts: { $sum: 1 },
					totalLists: { $sum: 1 },
				},
			},
		]);

		const contactOverview =
			contactLists.length > 0
				? contactLists[0]
				: {
						totalContacts: 0,
						totalLists: 0,
				  };

		// Calculate percentages
		const percentSent =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesSent / campaignStats.totalMessages) *
				  100
				: 0;
		const percentDelivered =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesDelivered /
						campaignStats.totalMessages) *
				  100
				: 0;
		const percentRead =
			campaignStats.totalMessages > 0
				? (campaignStats.messagesRead / campaignStats.totalMessages) *
				  100
				: 0;

		return {
			campaignStats,
			contactOverview,
			percentSent: percentSent.toFixed(2),
			percentDelivered: percentDelivered.toFixed(2),
			percentRead: percentRead.toFixed(2),
		};
	} catch (error) {
		console.error("Error fetching dashboard data:", error);
		throw new Error("Failed to fetch dashboard data");
	}
};

const handleFacebookError = (response, data) => {
	if (!response.ok) {
		// console.log(data.error);
		throw `${
			data.error.error_user_msg ||
			data.error.error_user_title ||
			data.error.message ||
			"Unknown error"
		}`;
	}
};

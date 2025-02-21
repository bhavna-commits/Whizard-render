import fs, { access } from "fs";
import path from "path";
import Papa from "papaparse";
import ContactList from "../../models/contactList.model.js";
import Contacts from "../../models/contacts.model.js";
import Permissions from "../../models/permissions.model.js";
import ActivityLogs from "../../models/activityLogs.model.js";
import Campaign from "../../models/campaign.model.js";
import User from "../../models/user.model.js";
import { fileURLToPath } from "url";
import {
	generateUniqueId,
	convertDateFormat,
} from "../../utils/otpGenerator.js";
import { agenda } from "../../config/db.js";
import { sendMessages, sendTestMessage } from "./campaign.functions.js";
import { countries } from "../../utils/dropDown.js";
import {
	isNumber,
	isString,
	isBoolean,
	isObject,
} from "../../middleWares/sanitiseInput.js";
import { json } from "stream/consumers";
import { sendCampaignScheduledEmail } from "../../services/OTP/reportsEmail.js";

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const csvFilePath = path.join(
	__dirname,
	"..",
	"..",
	"..",
	"CSV",
	"sample.csv",
);

export const updateContact = async (req, res, next) => {
	const contactId = req.params?.id;
	const { name, tags, validated } = req.body;
	if (!contactId) {
		return res.status(401).json({
			success: false,
			message: "No id found",
		});
	}
	if (!name || !tags || !validated) {
		return res.status(401).json({
			success: false,
			message: "No data found",
		});
	}
	if (!isString(contactId, name, tags, validated)) return next();

	try {
		// Find the contact by ID and update the fields
		const updatedContact = await ContactList.findByIdAndUpdate(
			contactId,
			{ name, tags, validated },
			{ new: true },
		);

		if (!updatedContact) {
			return res.status(404).json({
				success: false,
				message: "Contact not found",
			});
		}

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Update",
			details: `updated contact of ${name}`,
		});

		res.json({
			success: true,
			message: "Contact updated successfully",
			contact: updatedContact,
		});
	} catch (error) {
		console.error(error);
		res.json({
			success: false,
			message: error,
		});
	}
};

export const getContacts = async (req, res, next) => {
	try {
		const id = req.params.id;
		if (!id) {
			return res.status(401).json({
				success: false,
				message: "No id found",
			});
		}
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		if (!isNumber(page)) return next();
		if (!isString(id)) return next();
		// Get filters from the request body
		const filters = req.body.filters || [];

		// Start with the basic match stage
		const matchStage = {
			contactId: id,
			subscribe: 1,
		};

		// Add dynamic filters to the match stage
		filters.forEach((filter) => {
			if (filter.field === "subscribe_date" && filter.value) {
				const [startDate, endDate] = filter.value.split(" to "); // Assuming date range format is "startDate to endDate"
				matchStage.subscribe_date = {
					$gte: new Date(startDate).getTime(),
					$lte: new Date(endDate).getTime(),
				};
			} else {
				// Apply dynamic filters (other fields like Name, Number, masterExtra fields)
				if (filter.condition === "has") {
					matchStage[filter.field] = {
						$regex: filter.value,
						$options: "imsx",
					};
				} else if (filter.condition === "does not") {
					matchStage[filter.field] = {
						$not: { $regex: filter.value, $options: "imsx" },
					};
				}
			}
		});

		// Aggregation pipeline to apply filters and paginate
		const aggregation = [
			{ $match: matchStage },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalContacts: [{ $count: "totalContacts" }],
				},
			},
		];

		const result = await Contacts.aggregate(aggregation);
		const contactLists = result[0].paginatedResults;
		const totalContacts =
			result[0].totalContacts.length > 0
				? result[0].totalContacts[0].totalContacts
				: 0;
		// console.log(contactLists);
		const name = await ContactList.findOne({ contactId: id });
		const totalPages = Math.ceil(totalContacts / limit);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList) {
				res.render("Contact-List/contactList-overview", {
					access,
					listName: name.contalistName,
					contacts: contactLists,
					countries,
					page,
					totalPages,
					tags: [],
					id,
					photo: req.session?.addedUser?.photo,
					name: req.session?.addedUser?.name,
					color: req.session?.addedUser?.color,
					whatsAppStatus: req.session?.addedUser?.whatsAppStatus,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Contact-List/contactList-overview", {
				access: access.access,
				listName: name.contalistName,
				contacts: contactLists,
				countries,
				page,
				totalPages,
				tags: [],
				id,
				photo: req.session?.user?.photo,
				name: req.session?.user.name,
				color: req.session?.user.color,
				whatsAppStatus: req.session?.user?.whatsAppStatus,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const editContact = async (req, res, next) => {
	try {
		console.log("here");
		const { id } = req.params;
		const updatedData = req.body;

		// console.log(updatedData);
		if (!id || !updatedData) {
			return res.status(401).json({
				success: false,
				message: "front-end is not providing complete data",
			});
		}
		if (!isObject(updatedData)) return next();
		if (!isString(id)) return next();

		let wa_id = "";

		const setData = {};
		for (const [key, value] of Object.entries(updatedData)) {
			if (key === "countryCode") {
				wa_id = value.slice(1);
			} else if (key === "wa_id" && wa_id) {
				wa_id += value;
				// console.log(wa_id);
				setData["wa_id"] = wa_id;
			} else {
				setData[key] = value;
			}
		}

		// console.log(setData);

		const contacts = await Contacts.findOneAndUpdate(
			{ keyId: id },
			{ $set: setData },
			{ new: true, strict: false },
		);

		// Log the update activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Update",
			details: `Edited contact of : ${contacts.Name}`,
		});

		res.json({ success: true });
	} catch (error) {
		res.json({ success: false, message: error.message });
	}
};

export const deleteContact = async (req, res, next) => {
	const { id } = req.params;
	if (!id) {
		return res.status(401).json({
			success: false,
			message: "No id found",
		});
	}
	// console.log("here");
	if (!isString(id)) next();

	try {
		const contact = await Contacts.findOne({ _id: id });
		if (!contact) {
			return res
				.status(404)
				.json({ success: false, message: "Contact not found" });
		}

		contact.unsubscribe_date = Date.now();
		contact.subscribe = 0;
		await contact.save();

		const contactListId = contact.contactId;
		await ContactList.findOneAndUpdate(
			{ contactId: contactListId },
			{
				$inc: { participantCount: -1 },
			},
		);

		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Update",
			details: `Deleted contact of : ${contact.Name}`,
		});

		res.json({
			success: true,
			message: "Contact deleted and participant count updated",
		});
	} catch (error) {
		console.error("Error deleting contact:", error);
		res.status(500).json({
			success: false,
			message: "An error occurred while deleting the contact.",
		});
	}
};

export const updateCSVOnFieldDelete = async (id, fieldToDelete) => {
	try {
		// Read the CSV file content
		const csvFilePath = path.join(
			__dirname,
			"..",
			"..",
			"..",
			"CSV",
			id,
			"sample.csv",
		);
		const csvContent = fs.readFileSync(csvFilePath, "utf8");

		// Parse the CSV using Papa Parse
		const parsedCSV = Papa.parse(csvContent, {
			header: true,
			skipEmptyLines: true,
		});

		const rows = parsedCSV.data;
		const headers = parsedCSV.meta.fields;

		// Check if the field exists in the headers
		if (!headers.includes(fieldToDelete)) {
			console.log(`Field ${fieldToDelete} not found in CSV`);
			return;
		}

		// Filter out the field (column) to be deleted
		const updatedHeaders = headers.filter(
			(header) => header !== fieldToDelete,
		);

		// Remove the corresponding field from each row
		const updatedRows = rows.map((row) => {
			const newRow = { ...row };
			delete newRow[fieldToDelete];
			return newRow;
		});

		// Convert back to CSV format
		const updatedCSV = Papa.unparse({
			fields: updatedHeaders,
			data: updatedRows,
		});

		// Overwrite the CSV with the updated data
		fs.writeFileSync(csvFilePath, updatedCSV);
		console.log(`Field ${fieldToDelete} successfully deleted from CSV.`);
	} catch (error) {
		console.error("Error updating the CSV:", error);
	}
};

export const createContact = async (req, res, next) => {
	console.log("here");
	try {
		const contactData = req.body;
		const { Name, contactId, wa_id, countryCode, ...newContactData } =
			contactData;

		if (!isObject(contactData)) return next();

		const userId = req.session?.user?.id || req.session?.addedUser?.owner;
		const user = await User.findOne({ unique_id: userId });

		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found.",
			});
		}
		const number = user.phone.countryCode + user.phone.number;

		if (!contactId || !contactData) {
			return res.status(400).json({
				success: false,
				message: "List ID or contact data is missing",
			});
		}

		const numberExists = await Contacts.findOne({
			contactId,
			wa_id,
		});

		if (numberExists) {
			return res.status(400).json({
				success: false,
				message: "Cannot add same number twice in a list",
			});
		}
		// console.log(`${countryCode.slice(1)}${wa_id}`);

		const keyId = generateUniqueId();
		// Add the new contact to the Contacts collection
		const newContact = await Contacts.create({
			useradmin: userId,
			unique_id: generateUniqueId(),
			keyId,
			contactId,
			Name,
			wa_idK: `${number}_${keyId}`,
			wa_id: `${countryCode.slice(1)}${wa_id}`,
			masterExtra: newContactData,
		});

		const contactListId = newContact.contactId;
		await ContactList.findOneAndUpdate(
			{ contactId: contactListId },
			{
				$inc: { participantCount: 1 },
			},
		);

		// Log the activity
		await ActivityLogs.create({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			name: req.session?.user?.name
				? req.session?.user?.name
				: req.session?.addedUser?.name,
			actions: "Create",
			details: `Created a new contact: ${newContact.Name}`,
		});

		res.status(201).json({ success: true, contact: newContact });
	} catch (error) {
		console.error("Error adding contact:", error.message);
		res.status(500).json({ success: false, message: error.message });
	}
};

export const createCampaign = async (req, res, next) => {
	try {
		let { templateId, contactListId, variables, schedule, name, test } =
			req.body;

		if (!templateId || !contactListId) {
			return res.status(400).json({
				message: "Template ID and Contact List ID are required",
			});
		}

		if (!isString(templateId, contactListId, variables, name))
			return next();

		// console.log(variables);
		variables =
			typeof variables === "string" ? JSON.parse(variables) : variables;
		schedule =
			typeof schedule === "string" ? JSON.parse(schedule) : schedule;
		test = typeof test === "string" ? JSON.parse(test) : test;

		// console.log(test);

		if (test) {
			// console.log("var :", typeof variables);
			try {
				
				await sendTestMessage(
					req.session?.user?.id || req.session?.addedUser?.owner,
					templateId,
					variables,
					contactListId,
					test
				);
				await ActivityLogs.create({
					useradmin:
						req.session?.user?.id || req.session?.addedUser?.owner,
					unique_id: generateUniqueId(),
					name: req.session?.user?.name
						? req.session?.user?.name
						: req.session?.addedUser?.name,
					photo: req.session?.user?.photo
						? req.session?.user?.photo
						: req.session?.addedUser?.photo,
					color: req.session?.user?.color
						? req.session?.user?.color
						: req.session?.addedUser?.color,
					actions: "Send",
					details: `Sent a test campaign named: ${name}`,
				});
				return res.status(201).json({
					success: true,
					message: "Test message sent succesfully",
				});
			} catch (error) {
				console.log("error sending test message :", error);
				return res.status(500).json({
					success: false,
					message: "Error sending text message",
				});
			}
		}

		// Create new campaign object
		const newCampaign = new Campaign({
			useradmin: req.session?.user?.id || req.session?.addedUser?.owner,
			unique_id: generateUniqueId(),
			templateId,
			contactListId,
			variables,
			name,
		});

		if (!schedule) {
			await sendMessages(
				newCampaign,
				req.session?.user?.id || req.session?.addedUser?.owner,
				generateUniqueId(),
			);

			const time = Date.now() + 15 * 60 * 1000;
			const reportTime = new Date(time);
			agenda.schedule(reportTime, "send campaign report email", {
				campaignId: newCampaign.unique_id,
				userId: newCampaign.useradmin,
			});

			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name
					? req.session?.user?.name
					: req.session?.addedUser?.name,
				actions: "Send",
				details: `Sent campaign named: ${name}`,
			});
		} else {
			newCampaign.scheduledAt = Number(schedule) * 1000;
			newCampaign.status = "SCHEDULED";

			const user = await User.findOne({
				unique_id:
					req.session?.user?.id || req.session?.addedUser?.owner,
			});
			await sendCampaignScheduledEmail(
				user.email,
				name,
				newCampaign.scheduledAt,
			);

			const time = Date.now() + 15 * 60 * 1000;
			const reportTime = new Date(time);
			agenda.schedule(reportTime, "send campaign report email", {
				campaignId: newCampaign.unique_id,
				userId: newCampaign.useradmin,
			});

			await ActivityLogs.create({
				useradmin:
					req.session?.user?.id || req.session?.addedUser?.owner,
				unique_id: generateUniqueId(),
				name: req.session?.user?.name
					? req.session?.user?.name
					: req.session?.addedUser?.name,
				actions: "Send",
				details: `Scheduled new campaign named: ${name}`,
			});
		}

		// Save the campaign
		await newCampaign.save();
		res.status(201).json({
			message: "Campaign created successfully",
			campaign: newCampaign,
		});
	} catch (error) {
		console.error("Error creating campaign:", error.message);
		res.status(500).json({
			message: `Error creating campaign: ${error.message}`,
		});
	}
};

export const generateTableAndCheckFields = (
	parsedData,
	requiredColumns,
	customFields,
) => {
	const actualColumns = Object.keys(parsedData[0]);
	const customFieldNames = customFields?.map((field) => field.clname) || [];
	const expectedColumns = [...requiredColumns, ...customFieldNames];

	// Initialize error trackers
	const errors = {
		missingColumns: requiredColumns.filter(
			(col) => !actualColumns.includes(col),
		),
		invalidColumns: actualColumns.filter(
			(col) =>
				!expectedColumns.includes(col) &&
				col !== "Name" &&
				col !== "Number",
		),
		emptyFields: [],
		invalidNumbers: [],
		duplicateNumbers: [],
	};

	// Track numbers for validation
	const numbers = new Map();
	const numberIndexes = new Map();

	// Process data rows
	parsedData.forEach((row, rowIndex) => {
		// Check empty fields
		actualColumns.forEach((col) => {
			if (!row[col]?.trim()) {
				errors.emptyFields.push({
					row: rowIndex + 1,
					column: col,
					value: row[col],
				});
			}
		});

		// Number validation
		const number = row.Number?.trim();
		if (number) {
			// Validate number format
			if (!/^\d{12,}$/.test(number)) {
				errors.invalidNumbers.push({
					row: rowIndex + 1,
					column: "Number",
					value: number,
				});
			}

			// Track duplicates
			if (numbers.has(number)) {
				errors.duplicateNumbers.push({
					row: rowIndex + 1,
					column: "Number",
					value: number,
				});
				// Mark original occurrence as duplicate
				const firstRow = numberIndexes.get(number);
				if (firstRow) {
					errors.duplicateNumbers.push({
						row: firstRow,
						column: "Number",
						value: number,
					});
				}
			} else {
				numbers.set(number, true);
				numberIndexes.set(number, rowIndex + 1);
			}
		}
	});

	// Generate HTML table with error highlighting
	let tableHtml = "<table class='min-w-full table-auto'><thead><tr>";
	tableHtml += "<th class='px-4 py-2 border'>#</th>";

	// Generate headers with error highlighting
	actualColumns.forEach((header) => {
		const isMissing = errors.missingColumns.includes(header);
		const isInvalid = errors.invalidColumns.includes(header);
		const errorClass =
			isMissing || isInvalid ? "border-red-500 bg-red-50" : "";
		tableHtml += `<th class='px-4 py-2 border ${errorClass}'>${header}</th>`;
	});
	tableHtml += "</tr></thead><tbody>";

	// Generate rows with error highlighting
	parsedData.forEach((row, rowIndex) => {
		tableHtml += "<tr>";
		tableHtml += `<td class='px-4 py-2 border'>${rowIndex + 1}</td>`;

		actualColumns.forEach((col) => {
			const cellValue = row[col] || "";
			const isError = [
				errors.emptyFields.some(
					(e) => e.row === rowIndex + 1 && e.column === col,
				),
				errors.invalidNumbers.some(
					(e) => e.row === rowIndex + 1 && e.column === col,
				),
				errors.duplicateNumbers.some(
					(e) => e.row === rowIndex + 1 && e.column === col,
				),
			].some(Boolean);

			const errorClass = isError ? "border-red-500 bg-red-50" : "";
			tableHtml += `<td class='px-4 py-2 border ${errorClass}'>${cellValue}</td>`;
		});

		tableHtml += "</tr>";
	});

	tableHtml += "</tbody></table>";

	return {
		tableHtml,
		...errors,
		invalidNumbers: errors.invalidNumbers,
		duplicateNumbers: [...new Set(errors.duplicateNumbers)],
	};
};

export const getFilteredContacts = async (req, res, next) => {
	try {
		const id = req.params?.id;
		const page = parseInt(req.query.page) || 1;
		const limit = 6;
		const skip = (page - 1) * limit;

		// Get filters from the request body
		const filters = req.body.filters || [];

		if (!isString(id)) return next();
		if (!isNumber(page)) return next();

		// Start with the basic match stage
		const matchStage = {
			contactId: id,
			subscribe: 1,
		};
		// Loop through each filter
		filters.forEach((filter) => {
			if (filter.field === "subscribe_date" && filter.value) {
				matchStage.$and = matchStage.$and || [];
				const [startDate, endDate] = filter.value?.split(" to ");

				// Convert start date to timestamp
				const convertedStartDate = new Date(
					Date.UTC(
						parseInt(startDate.split("-")[0]), // year
						parseInt(startDate.split("-")[1]) - 1, // month (0-indexed in JS Date)
						parseInt(startDate.split("-")[2]), // day
					),
				).getTime();

				// Check if endDate is defined
				let convertedEndDate = Infinity; // Default to Infinity if no endDate is provided
				if (endDate) {
					convertedEndDate = new Date(
						Date.UTC(
							parseInt(endDate.split("-")[0]), // year
							parseInt(endDate.split("-")[1]) - 1, // month (0-indexed in JS Date)
							parseInt(endDate.split("-")[2]), // day
						),
					).getTime();
				}

				console.log("Converted Start Date:", convertedStartDate);
				console.log("Converted End Date:", convertedEndDate);

				// Apply filter for subscribe_date (handle case where endDate may not be provided)
				matchStage.$and.push({
					[filter.field]: {
						$gte: convertedStartDate,
						$lte: convertedEndDate,
					},
				});
			} else if (filter.field === "Name" || filter.field === "Number") {
				if (filter.condition === "has") {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[filter.field]: {
							$regex: filter.value,
							$options: "imsx",
						},
					});
				} else {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[filter.field]: {
							$not: {
								$regex: filter.value,
								$options: "imsx",
							},
						},
					});
				}
			} else {
				if (filter.condition === "has") {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[`masterExtra.${filter.field}`]: {
							$regex: filter.value,
							$options: "imsx",
						},
					});
				} else {
					matchStage.$or = matchStage.$or || [];
					matchStage.$or.push({
						[`masterExtra.${filter.field}`]: {
							$not: {
								$regex: filter.value,
								$options: "imsx",
							},
						},
					});
				}
			}
		});
		console.log(JSON.stringify(matchStage));
		// Aggregation pipeline to apply filters and paginate
		const aggregation = [
			{ $match: matchStage },
			{
				$facet: {
					paginatedResults: [{ $skip: skip }, { $limit: limit }],
					totalContacts: [{ $count: "totalContacts" }],
				},
			},
		];

		const result = await Contacts.aggregate(aggregation);
		console.log(result);
		const contactLists = result[0].paginatedResults;
		const totalContacts =
			result[0].totalContacts.length > 0
				? result[0].totalContacts[0].totalContacts
				: 0;

		const totalPages = Math.ceil(totalContacts / limit);
		console.log(contactLists);

		const permissions = req.session?.addedUser?.permissions;
		if (permissions) {
			const access = await Permissions.findOne({
				unique_id: permissions,
			});
			if (access.contactList) {
				res.render("Contact-List/partials/OverViewTable", {
					access,
					contacts: contactLists,
					page,
					totalPages,
					tags: [],
					id,
				});
			} else {
				res.render("errors/notAllowed");
			}
		} else {
			const access = await User.findOne({
				unique_id: req.session?.user?.id,
			});
			res.render("Contact-List/partials/OverViewTable", {
				access: access.access,
				contacts: contactLists,
				page,
				totalPages,
				tags: [],
				id,
			});
		}
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getOverviewFilter = async (req, res) => {
	try {
		const { id } = req.params;
		if (!isString(id)) return next();
		const contact = await Contacts.findOne({ contactId: id, subscribe: 1 });
		res.render("Contact-List/partials/filterOptions", { contact });
	} catch (error) {
		console.error(error);
		res.render("errors/serverError");
	}
};

export const getCreateCampaign = async (req, res) => {
	const permissions = req.session?.addedUser?.permissions;
	if (permissions) {
		const access = await Permissions.findOne({ unique_id: permissions });
		if (
			access.contactList.sendBroadcast &&
			req.session?.addedUser?.whatsAppStatus
		) {
			// const access = Permissions.findOne({ unique_id: permissions });
			res.render("Contact-List/createCampaign", {
				access,
				name: req.session?.addedUser?.name,
				photo: req.session?.addedUser?.photo,
				color: req.session?.addedUser?.color,
			});
		} else {
			res.render("errors/notAllowed");
		}
	} else if (req.session?.user?.whatsAppStatus) {
		const access = await User.findOne({ unique_id: req.session?.user?.id });
		res.render("Contact-List/createCampaign", {
			access: access.access,
			name: req.session?.user?.name,
			photo: req.session?.user?.photo,
			color: req.session?.user?.color,
		});
	} else {
		res.render("errors/notAllowed");
	}
};

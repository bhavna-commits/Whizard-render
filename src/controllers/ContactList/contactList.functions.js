export const filterDuplicates = (parsedData, existingNumbers) => {
	const newContacts = parsedData.filter(
		(row) => !existingNumbers.has(String(row.Number)),
	);
	const duplicateNumbers = parsedData.filter((row) =>
		existingNumbers.has(String(row.Number)),
	);
	return { newContacts, duplicateNumbers };
};

export const getDuplicateTableHTML = (duplicates, parsedDataHeaders) => {
	let tableHtml = "<table class='min-w-full table-auto'><thead><tr>";
	tableHtml += "<th class='px-4 py-2 border'>#</th>";
	parsedDataHeaders.forEach((header) => {
		tableHtml += `<th class='px-4 py-2 border'>${header}</th>`;
	});
	tableHtml += "</tr></thead><tbody>";

	duplicates.forEach((row, rowIndex) => {
		tableHtml += "<tr>";
		tableHtml += `<td class='px-4 py-2 border'>${rowIndex + 1}</td>`;
		parsedDataHeaders.forEach((col) => {
			const cellValue = row[col] || "";
			const errorClass =
				col === "Number" ? "bg-red-50" : "";
			tableHtml += `<td class='px-4 py-2 border ${errorClass}'>${cellValue}</td>`;
		});
		tableHtml += "</tr>";
	});

	tableHtml += "</tbody></table>";
	return tableHtml;
};

export const buildContactDocs = ({
	newContacts,
	keyId,
	userId,
	agentToAssign,
	contactList,
}) =>
	newContacts.map(({ Name, Number, ...additionalFields }) => ({
		FB_PHONE_ID: keyId,
		Name,
		wa_id: String(Number),
		usertimestmp: Date.now(),
		masterExtra: additionalFields,
		contactId: contactList.contactId,
		useradmin: userId,
		agent: [agentToAssign],
	}));

export const generateTableAndCheckFields = (
	parsedData,
	requiredColumns,
	customFieldNames,
) => {
	const actualColumns = Object.keys(parsedData[0]);
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
			if (!/^\d{8,17}$/.test(number)) {
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
			isMissing || isInvalid ? "bg-red-50" : "";
		tableHtml += `<th class='px-4 py-2 border ${errorClass}'>${header}</th>`;
	});
	tableHtml += "</tr></thead><tbody>";

	// Generate rows with error highlighting
	parsedData.forEach((row, rowIndex) => {
		tableHtml += "<tr>";
		tableHtml += `<td class='px-4 py-2 text-center border'>${
			rowIndex + 1
		}</td>`;

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

			const errorClass = isError ? "bg-red-50" : "";
			tableHtml += `<td class='px-4 py-2 text-center border ${errorClass}'>${cellValue}</td>`;
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

export const generateAdditionalTableAndCheckFields = (
	parsedData,
	requiredColumns,
	customFieldNames,
) => {
	const actualColumns = Object.keys(parsedData[0]);
	const expectedColumns = [...requiredColumns, ...customFieldNames];

	// Sort for strict comparison
	const sortedActual = [...actualColumns].sort();
	const sortedExpected = [...expectedColumns].sort();

	const exactMatch =
		sortedActual.length === sortedExpected.length &&
		sortedActual.every((val, i) => val === sortedExpected[i]);

	const errors = {
		missingColumns: [],
		invalidColumns: [],
		emptyFields: [],
		invalidNumbers: [],
		duplicateNumbers: [],
	};

	if (!exactMatch) {
		errors.missingColumns = expectedColumns.filter(
			(col) => !actualColumns.includes(col),
		);
		errors.invalidColumns = actualColumns.filter(
			(col) => !expectedColumns.includes(col),
		);
	}

	const numbers = new Map();
	const numberIndexes = new Map();

	parsedData.forEach((row, rowIndex) => {
		actualColumns.forEach((col) => {
			if (!row[col]?.trim()) {
				errors.emptyFields.push({
					row: rowIndex + 1,
					column: col,
					value: row[col],
				});
			}
		});

		const number = row.Number?.trim();
		if (number) {
			if (!/^\d{12,}$/.test(number)) {
				errors.invalidNumbers.push({
					row: rowIndex + 1,
					column: "Number",
					value: number,
				});
			}

			if (numbers.has(number)) {
				errors.duplicateNumbers.push({
					row: rowIndex + 1,
					column: "Number",
					value: number,
				});
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

	// HTML table
	let tableHtml = "<table class='min-w-full table-auto'><thead><tr>";
	tableHtml += "<th class='px-4 py-2 border'>#</th>";

	actualColumns.forEach((header) => {
		const isMissing = errors.missingColumns.includes(header);
		const isInvalid = errors.invalidColumns.includes(header);
		const errorClass =
			isMissing || isInvalid ? "bg-red-50" : "";
		tableHtml += `<th class='px-4 py-2 border ${errorClass}'>${header}</th>`;
	});
	tableHtml += "</tr></thead><tbody>";

	parsedData.forEach((row, rowIndex) => {
		tableHtml += "<tr>";
		tableHtml += `<td class='px-4 py-2 border text-center'>${
			rowIndex + 1
		}</td>`;

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

			const errorClass = isError ? "bg-red-50" : "";
			tableHtml += `<td class='px-4 py-2 border text-center ${errorClass}'>${cellValue}</td>`;
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

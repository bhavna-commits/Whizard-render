// Helper function to get quarter dates
function getQuarterDates() {
	const now = new Date();
	const quarter = Math.floor(now.getMonth() / 3);
	const startQuarter = new Date(now.getFullYear(), quarter * 3, 1);
	return [startQuarter, now];
}

// Initialize Flatpickr with simpler configuration
let fpInstance;

// Initialize date picker after DOM content is loaded
function initializeDatePicker() {
	fpInstance = flatpickr("#dateRange", {
		mode: "range",
		dateFormat: "Y-m-d",
		defaultDate: getQuarterDates(),
		maxDate: "today",
		onChange: async function (selectedDates) {
			if (selectedDates.length === 2) {
				const [startDate, endDate] = selectedDates;
				const data = await fetchAnalytics(startDate, endDate);
				if (data) {
					updateUI(data);
				}
			}
		},
	});
}

async function fetchAnalytics(startDate, endDate) {
	try {
		if (!startDate || !endDate) {
			console.error("Invalid dates:", {
				startDate,
				endDate,
			});
			return null;
		}

		const startUnix = Math.floor(startDate.getTime() / 1000);
		const endUnix = Math.floor(endDate.getTime() / 1000);

		const response = await axios.get("/reports/get-cost-report", {
			params: {
				start: startUnix,
				end: endUnix,
			},
		});

		return processAnalyticsData(response.data);
	} catch (error) {
		console.error("Error fetching analytics:", error);
		return null;
	}
}

const timeseriesMap = new Map();
let timeseriesData;

function processAnalyticsData(rawData) {
	const summaryData = {
		total: {
			count: 0,
			cost: 0,
		},
		marketing: {
			count: 0,
			cost: 0,
		},
		utility: {
			count: 0,
			cost: 0,
		},
		authentication: {
			count: 0,
			cost: 0,
		},
	};

	if (!Array.isArray(rawData)) {
		console.error("Invalid data format received:", rawData);
		return {
			summaryData,
			timeseriesData: [],
		};
	}

	
	rawData.forEach((point) => {
		if (!point || typeof point.start !== "number") {
			return;
		}

		// Create date in IST by adding 5 hours and 30 minutes to UTC
		const utcDate = new Date(point.start * 1000);
		const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
		const istDate = new Date(utcDate.getTime() + istOffset);

		// Store full date object for proper sorting later
		const dateKey = istDate.toLocaleDateString("en", {
			month: "short",
			day: "numeric",
		});

		if (!timeseriesMap.has(dateKey)) {
			timeseriesMap.set(dateKey, {
				date: dateKey,
				// Store the full date object for sorting
				fullDate: istDate,
				marketing: {
					count: 0,
					cost: 0,
				},
				utility: {
					count: 0,
					cost: 0,
				},
				authentication: {
					count: 0,
					cost: 0,
				},
			});
		}

		const category = (point.conversation_category || "").toLowerCase();
		if (summaryData[category]) {
			const entry = timeseriesMap.get(dateKey);
			entry[category].count = point.conversation || 0;
			entry[category].cost = point.cost || 0;
			summaryData[category].count += point.conversation || 0;
			summaryData[category].cost += point.cost || 0;
			summaryData.total.count += point.conversation || 0;
			summaryData.total.cost += point.cost || 0;
		}
	});

	// Sort using the full date object instead of strings
	timeseriesData = Array.from(timeseriesMap.values())
		.sort((a, b) => a.fullDate - b.fullDate)
		.map((entry) => {
			// Remove the fullDate property from the final output if not needed
			const { fullDate, ...rest } = entry;
			return rest;
		});

	// console.log(timeseriesData);
	return {
		summaryData,
		timeseriesData,
	};
}

function updateUI(data) {
	if (!data || !data.summaryData) {
		console.error("Invalid data for UI update:", data);
		return;
	}

	// Update total counts and costs
	document.getElementById("totalCount").textContent =
		data.summaryData.total.count || 0;
	document.getElementById("totalCost").textContent = `₹${(
		data.summaryData.total.cost || 0
	).toFixed(2)}`;

	// Update category counts
	document.getElementById("marketingCount").textContent =
		data.summaryData.marketing.count || 0;
	document.getElementById("utilityCount").textContent =
		data.summaryData.utility.count || 0;
	document.getElementById("authCount").textContent =
		data.summaryData.authentication.count || 0;

	// Update category costs
	document.getElementById("marketingCost").textContent = `₹${(
		data.summaryData.marketing.cost || 0
	).toFixed(2)}`;
	document.getElementById("utilityCost").textContent = `₹${(
		data.summaryData.utility.cost || 0
	).toFixed(2)}`;
	document.getElementById("authCost").textContent = `₹${(
		data.summaryData.authentication.cost || 0
	).toFixed(2)}`;

	updateConversationChart(data);
	updateCostChart(data);
}

function createCSV() {
	// Define CSV headers
	const headers = [
		"Date",
		"Marketing Count",
		"Marketing Cost",
		"Utility Count",
		"Utility Cost",
		"Authentication Count",
		"Authentication Cost",
	];

	// Convert data to CSV rows
	const csvRows = timeseriesData.map((row) => [
		row.date,
		row.marketing.count,
		row.marketing.cost,
		row.utility.count,
		row.utility.cost,
		row.authentication.count,
		row.authentication.cost,
	]);

	// Add headers to the beginning of the array
	csvRows.unshift(headers);

	// Convert to CSV string
	const csvString = csvRows
		.map((row) =>
			row
				.map((cell) => {
					// Handle numbers and strings appropriately
					if (typeof cell === "number") {
						return cell.toString();
					}
					// Wrap strings in quotes and escape existing quotes
					return `"${cell.toString().replace(/"/g, '""')}"`;
				})
				.join(","),
		)
		.join("\n");

	// Create a Blob with the CSV data
	const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

	// Create a download link
	const link = document.createElement("a");

	// Create the download URL
	const url = window.URL.createObjectURL(blob);
	link.setAttribute("href", url);

	// Set the filename
	const today = new Date();
	const filename = `timeseries_data_${today.toISOString().split("T")[0]}.csv`;
	link.setAttribute("download", filename);

	// Append to body, click, and remove
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	window.URL.revokeObjectURL(url);
}
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
			let startDate = selectedDates[0];
			let endDate = selectedDates[1];

			// If no dates are selected, use default quarter dates
			if (!startDate || !endDate) {
				const [defaultStartDate, defaultEndDate] = getQuarterDates();
				startDate = defaultStartDate;
				endDate = defaultEndDate;
			}
			// console.log(startDate, endDate);
			const data = await fetchAnalytics(startDate, endDate);
			if (data) {
				updateUI(data);
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

		// Convert to Unix timestamps
		const startUnix = Math.floor(startDate.getTime() / 1000);
		const endUnix = Math.floor(endDate.getTime() / 1000);
		
		const response = await axios.get("/reports/get-cost-report", {
			params: {
				start: startUnix,
				end: endUnix,
			},
		});

		// Process the fetched data
		return processAnalyticsData(response.data, startDate, endDate);
	} catch (error) {
		console.error("Error fetching analytics:", error);
		return null;
	}
}

let dataForCSV = [];

function processAnalyticsData(rawData, startDate, endDate) {
	const timeseriesMap = new Map();
	let timeseriesData;

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

	// Generate every date between startDate and endDate
	let currentDate = new Date(startDate);
	const finalEndDate = new Date(endDate);

	while (currentDate <= finalEndDate) {
		const dateKey = currentDate.toLocaleDateString("en", {
			month: "short",
			day: "numeric",
		});
		// console.log(dateKey);

		timeseriesMap.set(dateKey, {
			date: dateKey,
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

		// Move to the next day
		currentDate.setDate(currentDate.getDate() + 1);
	}

	// Process rawData to update timeseriesMap with real data
	rawData.forEach((point) => {
		if (!point || typeof point.start !== "number") {
			return;
		}

		// Create date in UTC
		const utcDate = new Date(point.start * 1000);

		// Add one whole day (24 hours) to UTC
		const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		const newDate = new Date(utcDate.getTime() + oneDayInMilliseconds);

		// Create a dateKey for the map
		const dateKey = newDate.toLocaleDateString("en", {
			month: "short",
			day: "numeric",
		});

		// Only update data for the date within the selected range
		if (timeseriesMap.has(dateKey)) {
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
		}
	});

	// Convert the map to an array and return sorted timeseriesData
	timeseriesData = Array.from(timeseriesMap.values()).sort((a, b) => {
		const dateA = new Date(a.date);
		const dateB = new Date(b.date);
		return dateA - dateB;
	});

	dataForCSV = [...timeseriesData];

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
	const csvRows = dataForCSV.map((row) => [
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
	const csv = csvRows
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

	// Create CSV Blob
	const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });

	// Create a link element and trigger the download
	const downloadLink = document.createElement("a");
	const today = new Date();
	downloadLink.download = `timeseries_data_${
		today.toISOString().split("T")[0]
	}.csv`;

	downloadLink.href = window.URL.createObjectURL(csvFile);
	downloadLink.style.display = "none";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
}

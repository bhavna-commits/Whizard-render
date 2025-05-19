function getQuarterDates() {
	const now = new Date();
	const quarter = Math.floor(now.getMonth() / 3);
	const startQuarter = new Date(now.getFullYear(), quarter * 3, 1);
	return [startQuarter, now];
}

let fpInstance;
let dataForCSV = [];

function initializeDatePicker() {
	fpInstance = flatpickr("#dateRange", {
		mode: "range",
		dateFormat: "Y-m-d",
		defaultDate: getQuarterDates(),
		maxDate: "today",
		onChange: async function (selectedDates) {
			let startDate = selectedDates[0];
			let endDate = selectedDates[1];

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
	const analyticsLoading = document.getElementById("analyticsLoading");
	const chargesLoading = document.getElementById("chargesLoading");

	try {
		analyticsLoading.classList.remove("hidden");
		chargesLoading.classList.remove("hidden");

		if (!startDate || !endDate) {
			console.error("Invalid dates:", { startDate, endDate });
			toast("error", `Invalid dates : ${startDate}, ${endDate}`);
			return null;
		}

		const startUnix = Math.floor(startDate.getTime() / 1000);
		const endUnix = Math.floor(endDate.getTime() / 1000) + 86400;

		const response = await axios.get("/reports/get-cost-report", {
			params: { start: startUnix, end: endUnix },
		});

		return processAnalyticsData(response.data, startDate, endDate);
	} catch (error) {
		console.error("Error fetching analytics:", error.response.data.error);
		toast("error", error.response.data.error);
		return null;
	} finally {
		analyticsLoading.classList.add("hidden");
		chargesLoading.classList.add("hidden");
	}
}

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

		currentDate.setDate(currentDate.getDate() + 1);
	}

	rawData.forEach((point) => {
		if (!point || typeof point.start !== "number") {
			return;
		}

		const utcDate = new Date(point.start * 1000);

		const oneDayInMilliseconds = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
		const newDate = new Date(utcDate.getTime() + oneDayInMilliseconds);

		const dateKey = newDate.toLocaleDateString("en", {
			month: "short",
			day: "numeric",
		});

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

	document.getElementById("totalCount").textContent =
		data.summaryData.total.count || 0;
	document.getElementById("totalCost").textContent = `₹${(
		data.summaryData.total.cost || 0
	).toFixed(2)}`;

	document.getElementById("marketingCount").textContent =
		data.summaryData.marketing.count || 0;
	document.getElementById("utilityCount").textContent =
		data.summaryData.utility.count || 0;
	document.getElementById("authCount").textContent =
		data.summaryData.authentication.count || 0;

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
	const headers = [
		"Date",
		"Marketing Count",
		"Marketing Cost",
		"Utility Count",
		"Utility Cost",
		"Authentication Count",
		"Authentication Cost",
	];

	const csvRows = dataForCSV.map((row) => [
		row.date,
		row.marketing.count,
		row.marketing.cost,
		row.utility.count,
		row.utility.cost,
		row.authentication.count,
		row.authentication.cost,
	]);

	csvRows.unshift(headers);

	const csv = csvRows
		.map((row) =>
			row
				.map((cell) => {
					if (typeof cell === "number") {
						return cell.toString();
					}

					return `"${cell.toString().replace(/"/g, '""')}"`;
				})
				.join(","),
		)
		.join("\n");

	const csvFile = new Blob([csv], { type: "text/csv" });

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

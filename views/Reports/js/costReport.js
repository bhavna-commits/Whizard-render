// import "chartjs-adapter-date-fns"; // Ensure this is present in your setup

let chart = null;

function getLastMonthDates() {
	const now = new Date();
	const startLastMonth = new Date(
		now.getFullYear(),
		now.getMonth() - 1,
		now.getDate(),
	);
	return [startLastMonth, now];
}

// Initialize Flatpickr with default selection of last month
const fpInstance = flatpickr("#dateRange", {
	mode: "range",
	dateFormat: "d M Y",
	defaultDate: getLastMonthDates(),
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

// Add custom quarter selector button
const quarterButton = document.createElement("button");
quarterButton.textContent = "This Quarter";
quarterButton.className = "px-4 py-2 bg-blue-500 text-white rounded mt-2";
quarterButton.onclick = () => {
	const [startQuarter, now] = getQuarterDates();
	fpInstance.setDate([startQuarter, now]);
};
document.querySelector("#dateRange").parentNode.appendChild(quarterButton);

async function fetchAnalytics(startDate, endDate) {
	try {
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

function processAnalyticsData(rawData) {
	const summaryData = {
		marketing: { count: 0, cost: 0 },
		utility: { count: 0, cost: 0 },
		authentication: { count: 0, cost: 0 },
	};

	const timeseriesData = {};

	if (rawData.conversation_analytics?.data?.[0]?.data_points) {
		rawData.conversation_analytics.data[0].data_points.forEach((point) => {
			const date = new Date(point.start * 1000)
				.toISOString()
				.split("T")[0];

			if (!timeseriesData[date]) {
				timeseriesData[date] = {
					marketing: 0,
					utility: 0,
					authentication: 0,
				};
			}

			const category = point.conversation_category.toLowerCase();
			timeseriesData[date][category] = point.conversation;
			summaryData[category].count += point.conversation || 0;
			summaryData[category].cost += point.cost || 0;
		});
	}

	return { summaryData, timeseriesData };
}

function updateUI(data) {
	// Destroy existing chart if it exists
	if (chart !== null && typeof chart.destroy === "function") {
		chart.destroy();
		chart = null; // Reset chart variable after destroying
	}

	const ctx = document.getElementById("analyticsChart").getContext("2d");
	const labels = Object.keys(data.timeseriesData).sort();

	const chartData = {
		labels,
		datasets: [
			{
				label: "Marketing",
				data: labels.map(
					(date) => data.timeseriesData[date]?.marketing || 0,
				),
				borderColor: "#FB923C",
				tension: 0.4,
				fill: false,
			},
			{
				label: "Utility",
				data: labels.map(
					(date) => data.timeseriesData[date]?.utility || 0,
				),
				borderColor: "#C084FC",
				tension: 0.4,
				fill: false,
			},
			{
				label: "Authentication",
				data: labels.map(
					(date) => data.timeseriesData[date]?.authentication || 0,
				),
				borderColor: "#60A5FA",
				tension: 0.4,
				fill: false,
			},
		],
	};

	// Create new chart instance
	chart = new Chart(ctx, {
		type: "line",
		data: chartData,
		options: {
			responsive: true,
			interaction: {
				intersect: false,
				mode: "index",
			},
			plugins: {
				legend: {
					position: "top",
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						stepSize: 1,
					},
				},
				x: {
					type: "time",
					time: {
						unit: "day",
					},
				},
			},
		},
	});
}


// Initialize with default date range
document.addEventListener("DOMContentLoaded", async () => {
	const [startDate, endDate] = fpInstance.selectedDates;
	const data = await fetchAnalytics(startDate, endDate);
	if (data) {
		updateUI(data);
	}
});

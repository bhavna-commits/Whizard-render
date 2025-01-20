const ctx = document.getElementById("conversationChart").getContext("2d");

// Escape and parse the data properly
// Properly escape the JSON

// Prepare data for the chart
const labels = chartData.map((dp) => new Date(dp.start * 1000)); // Ensure correct timestamp conversion
const sentData = chartData.map((dp) => dp.sent);
const deliveredData = chartData.map((dp) => dp.delivered);

// Debugging logs to ensure data is correct
// console.log(labels); // Ensure dates are correctly formatted
// console.log(sentData);
// console.log(deliveredData);

// Create chart
new Chart(ctx, {
	type: "line",
	data: {
		labels: labels, // Dates as labels
		datasets: [
			{
				label: "Sent",
				borderColor: "orange",
				data: sentData, // Sent messages data
				fill: false,
				borderDash: [5, 5],
			},
			{
				label: "Delivered",
				borderColor: "green",
				data: deliveredData, // Delivered messages data
				fill: false,
				borderDash: [5, 5],
			},
		],
	},
	options: {
		responsive: true,
		scales: {
			x: {
				type: "time",
				time: {
					unit: "day",
					tooltipFormat: "ll", // Optional: specify date format for tooltips
				},
				title: {
					display: true,
					text: "Date",
				},
			},
			y: {
				beginAtZero: true,
				title: {
					display: true,
					text: "Messages",
				},
			},
		},
	},
});

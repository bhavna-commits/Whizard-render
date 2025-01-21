const ctx = document.getElementById("conversationChart").getContext("2d");

const labels = chartData.map((dp) => new Date(dp.start * 1000)); 
const sentData = chartData.map((dp) => dp.sent);
const deliveredData = chartData.map((dp) => dp.delivered);

flatpickr("#dateRange", {
	mode: "range",
	dateFormat: "Y-m-d",
	defaultDate: null,
	onChange: function (selectedDates, dateStr, instance) {
		console.log(selectedDates);
		if (selectedDates.length === 2) {
			const startUnix = Math.floor(selectedDates[0].getTime() / 1000); 
            const endUnix = Math.floor(selectedDates[ 1 ].getTime() / 1000);
            
			console.log("Start Date (Unix):", startUnix);
			console.log("End Date (Unix):", endUnix);
		}
	},
});

// Create chart
new Chart(ctx, {
	type: "line",
	data: {
		labels: labels, // Dates as labels
		datasets: [
			{
				label: "Sent",
				borderColor: "orange",
				data: sentData,
				fill: false,
				borderDash: [5, 5],
			},
			{
				label: "Delivered",
				borderColor: "green",
				data: deliveredData,
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
					tooltipFormat: "ll",
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

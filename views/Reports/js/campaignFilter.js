// Open the filter modal (sidebar) and show overlay
function openFilterModal() {
	document.getElementById("filterSidebar").style.right = "0"; // Slide in sidebar
	document.getElementById("overlay").classList.remove("hidden"); // Show overlay
}

// Close the filter modal (sidebar) and hide overlay
function closeFilterModal() {
	document.getElementById("filterSidebar").style.right = "-400px"; // Slide out sidebar
	document.getElementById("overlay").classList.add("hidden"); // Hide overlay
}

flatpickr("#timeStart", {
	dateFormat: "Y-m-d",
	maxDate: "today",
	onChange: function () {
		checkDateAndApplyFilters();
	},
});

flatpickr("#timeEnd", {
	dateFormat: "Y-m-d",
	maxDate: "today",
	onChange: function () {
		checkDateAndApplyFilters();
	},
});

// Function to check if both start and end dates are selected, then apply filters
function checkDateAndApplyFilters() {
	const timeStart = document.getElementById("timeStart");
	const timeEnd = document.getElementById("timeEnd");
	if (timeStart.value) timeStart.textContent = timeStart.value;
	if (timeEnd.value) timeEnd.textContent = timeEnd.value;
	// Only apply filters if both timeStart and timeEnd are filled
	if (timeStart.value && timeEnd.value) {
		applyFilters();
	}
}

// Function to apply filters
async function applyFilters() {
	await fetchData();
}

// Fetch the data based on the selected filters
async function fetchData() {
	const timeStart = document.getElementById("timeStart").value;
	const timeEnd = document.getElementById("timeEnd").value;
	const statusFilter = document.getElementById("statusFilter").value;
	const search = document.getElementById("searchInput").value;

	// Combine the time range
	const timeFrame = `${timeStart} to ${timeEnd}`;

	const spinner = document.getElementById("loadingSpinner");
	spinner.classList.remove("hidden");

	try {
		// Fetch filtered data from the server
		const res = await fetch(
			`/reports/campaign-list/filter?timeFrame=${timeFrame}&status=${statusFilter}&search=${search}`,
		);
		const data = await res.text();

		// Update the campaign table with new filtered results
		const campaignTable = document.getElementById("campaignTable");
		campaignTable.innerHTML = data;

		// Close the sidebar and overlay after applying filters
		closeFilterModal();
	} catch (error) {
		console.error("Error fetching campaign data:", error);
		alert("Failed to fetch campaign data.");
	} finally {
		// Hide the loading spinner
		spinner.classList.add("hidden");
	}
}

// Trigger data fetch on search input change
document.getElementById("searchInput").addEventListener("input", async () => {
	await fetchData();
});

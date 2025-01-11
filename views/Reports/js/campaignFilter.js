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

// Initialize flatpickr for the date range picker
flatpickr("#timeFrame", {
	mode: "range",
	dateFormat: "Y-m-d",
	maxDate: "today",
});

// Function to apply the filters
async function applyFilters() {
	await fetchData();
}

document.getElementById("searchInput").addEventListener("input", async () => {
	await fetchData();
});

async function fetchData() {
	const timeFrame = document.getElementById("timeFrame").value;
	const statusFilter = document.getElementById("statusFilter").value;
	const search = document.getElementById("searchInput").value;
	// Show the loading spinner
	const spinner = document.getElementById("loadingSpinner");
	spinner.classList.remove("hidden");

	try {
		// Fetch the filtered data
		const res = await fetch(
			`/reports/campaign-list/filter?timeFrame=${timeFrame}&status=${statusFilter}&search=${search}`,
		);
		const data = await res.text();

		// Replace the campaign table with the new filtered results
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

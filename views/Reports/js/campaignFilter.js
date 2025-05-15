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
	console.log(timeEnd.value);
	// Only apply filters if both timeStart and timeEnd are filled
	if (timeStart.value && timeEnd.value) {
		applyFilters();
	}
}

// Function to apply filters
async function applyFilters() {
	const timeStart = document.getElementById("timeStart").value;
	const timeEnd = document.getElementById("timeEnd").value;
	const statusFilter = document.getElementById("statusFilter").value;
	const search = document.getElementById("searchInput").value;
	const phoneNumberId = document.getElementById("phoneNumbers").value;

	console.log(statusFilter);

	let timeFrame = "";
	if (timeStart) timeFrame = `${timeStart} to ${timeEnd}`;

	const spinner = document.getElementById("loadingSpinner");
	spinner.classList.remove("hidden");

	if (timeFrame) {
		location.href = `/reports/campaign-list?timeFrame=${timeFrame}&status=${statusFilter}&search=${search}&phoneNumberId=${phoneNumberId}`;
	} else {
		location.href = `/reports/campaign-list?status=${statusFilter}&search=${search}&phoneNumberId=${phoneNumberId}`;
	}
}

let debounceTimer; // Declare debounce timer variable

async function getSearch() {
	const search = document.getElementById("searchInput").value;
	const campaignTable = document.getElementById("campaignTable");

	try {
		const res = await fetch(
			`/reports/campaign-list/filter?search=${search}`,
		);

		if (!res.ok) throw new Error("Failed to fetch data");

		const data = await res.text();
		campaignTable.innerHTML = data;

		closeFilterModal();
	} catch (error) {
		console.error("Error fetching campaign data:", error);
		campaignTable.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-red-500 py-4">
                    Error loading campaigns: ${error.message}
                </td>
            </tr>
        `;
	}
}

// Modified event listener with debouncing
document.getElementById("searchInput").addEventListener("input", () => {
	const campaignTable = document.getElementById("campaignTable");

	// Show loading spinner immediately
	campaignTable.innerHTML = `
        <div class="flex justify-center items-center h-96">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
        </div>
    `;

	// Clear existing timer
	clearTimeout(debounceTimer);

	// Set new timer
	debounceTimer = setTimeout(async () => {
		await getSearch();
	}, 300); // 300ms debounce delay
});

// Retrieve the query parameters from the URL
const searchParamsFilter = new URLSearchParams(window.location.search);

// Get the timeFrame parameter
const timeFrame = searchParamsFilter.get("timeFrame");
const search = searchParamsFilter.get("search");
const statusFilter = searchParamsFilter.get("status");
const phoneNumberId = searchParamsFilter.get("phoneNumberId");

if (timeFrame) {
	const [start, end] = timeFrame.split(" to ");
	if (start && end) {
		// Set the values in the input fields
		document.getElementById("timeStart").value = start;
		document.getElementById("timeEnd").value = end;
		document.getElementById("timeStart").textContent = start;
		document.getElementById("timeEnd").textContent = end;
	}
}

if (search) {
	document.getElementById("searchInput").value = search;
}

if (statusFilter) {
	document.getElementById("statusFilter").value = statusFilter;
}

if (phoneNumberId) {
	document.getElementById("phoneNumbers").value = phoneNumberId;
}

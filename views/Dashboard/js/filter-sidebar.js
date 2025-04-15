const urlt = new URL(window.location.href);

const startDate1 = urlt.searchParams.get("startDate");
const endDate1 = urlt.searchParams.get("endDate");
if (startDate1 && endDate1) {
	const span = document.getElementById("showDateFilter");
	span.textContent = `${startDate1} to ${endDate1}`;
	const startLocal = parseLocalMidnight(startDate1);
	const endLocal = parseLocalMidnight(endDate1);
	costReport(startLocal, endLocal);
} else {
	costReport();
}

flatpickr("#filterDate", {
	mode: "range",
	dateFormat: "Y-m-d",
	maxDate: "today",
	onChange: function (selectedDates, dateStr, instance) {
		// Only proceed when both start and end dates are selected
		if (selectedDates.length === 2) {
			let [startDate, endDate] = dateStr.split("to");

			const url = new URL(window.location.href);

			startDate = startDate?.trim();
			endDate = endDate?.trim();
			if (endDate) {
				url.searchParams.set("endDate", endDate);
			} else {
				url.searchParams.set("endDate", startDate);
			}

			// Update the URL with the selected dates

			url.searchParams.set("startDate", startDate);

			// Redirect to updated URL after both dates are selected
			window.location.href = url.toString();
		}
	},
});

const filterSidebar = document.getElementById("filterSidebar");
const dataSection = document.getElementById("dataSection");
const userName = document.getElementById("userName");
const userDate = document.getElementById("userDate");
const overlay = document.getElementById("overlay");
// const closeBtn = document.getElementById("closeBtn");
const loading = document.getElementById("loading");

closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

const watchDemo = document.querySelector(".watchDemo");
const demoModal = document.querySelector(".demoModal");
const closeDemo = document.querySelector(".closeDemo");
const modalContent = document.querySelector(".modalContent");

const openModal = () => {
	demoModal.classList.remove("hidden");
	setTimeout(() => {
		modalContent.classList.remove("scale-95", "opacity-0");
		modalContent.classList.add("scale-100", "opacity-100");
	}, 10); // allow reflow
};

const closeModal = () => {
	modalContent.classList.remove("scale-100", "opacity-100");
	modalContent.classList.add("scale-95", "opacity-0");
	setTimeout(() => {
		demoModal.classList.add("hidden");
	}, 300); // match the transition duration
};

watchDemo.addEventListener("click", openModal);
closeDemo.addEventListener("click", closeModal);

demoModal.addEventListener("click", (e) => {
	if (e.target === demoModal) closeModal();
});

document.addEventListener("keydown", (e) => {
	if (e.key === "Escape" && !demoModal.classList.contains("hidden")) {
		closeModal();
	}
});

// Event listener for close button
document.getElementById("closeBtn").addEventListener("click", () => {
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");

	filterSidebar.classList.remove("open");
	overlay.classList.remove("active");
	document.body.style.overflow = "auto";
});

// Close sidebar
function closeSidebar() {
	filterSidebar.classList.remove("open");
	overlay.classList.remove("active");
	document.body.style.overflow = "auto";
}

async function viewSent() {
	const url = new URL(window.location.href);
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	// DOM elements
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");
	const loading = document.getElementById("loading");
	const dataSection = document.getElementById("dataSection");
	const userName = document.getElementById("userName");
	const userDate = document.getElementById("userDate");

	// Open sidebar and show loading
	filterSidebar.classList.add("open");
	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
	loading.classList.remove("hidden");

	try {
		// Fetch data
		const res = await fetch(
			`/dashboard?value=SENT&startDate=${startDate}&endDate=${endDate}`,
		);
		const data = await res.json();

		// Clear previous data
		userName.innerHTML = "";
		userDate.innerHTML = "";

		// Handle empty or error response
		if (!data || data.success === false) {
			const noDataDiv = document.createElement("div");
			noDataDiv.textContent = "No data available";
			noDataDiv.classList.add("text-center", "text-gray-500", "py-4");
			userName.appendChild(noDataDiv);
			return;
		}

		// Populate data
		data.forEach((element) => {
			// Create row container
			const rowContainer = document.createElement("div");
			rowContainer.classList.add(
				"flex",
				"justify-between",
				"w-full",
				"px-4",
				"py-2",
				"border-b",
				"hover:bg-gray-100",
				"transition-colors",
			);

			// Name column
			const nameDiv = document.createElement("div");
			nameDiv.textContent = element.contactName;
			nameDiv.classList.add("text-left", "flex-1");

			// Date column
			const dateDiv = document.createElement("div");
			const formattedDate = new Date(
				element.createdAt,
			).toLocaleDateString();
			dateDiv.textContent = formattedDate;
			dateDiv.classList.add("text-right", "text-gray-600");

			// Append to row
			rowContainer.appendChild(nameDiv);
			rowContainer.appendChild(dateDiv);

			// Add to parent containers
			userName.appendChild(rowContainer);
		});

		// Show data section
		dataSection.classList.remove("hidden");
	} catch (err) {
		console.error("Error fetching data:", err);
		toast("error", err);
	} finally {
		loading.classList.add("hidden");
	}
}

async function viewDelivered() {
	const url = new URL(window.location.href);
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	// DOM elements
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");
	const loading = document.getElementById("loading");
	const dataSection = document.getElementById("dataSection");
	const userName = document.getElementById("userName");
	const userDate = document.getElementById("userDate");

	// Open sidebar and show loading
	filterSidebar.classList.add("open");
	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
	loading.classList.remove("hidden");

	try {
		// Fetch data
		const res = await fetch(
			`/dashboard?value=DELIVERED&startDate=${startDate}&endDate=${endDate}`,
		);
		const data = await res.json();

		// Clear previous data
		userName.innerHTML = "";
		userDate.innerHTML = "";

		// Handle empty or error response
		if (!data || data.success === false) {
			const noDataDiv = document.createElement("div");
			noDataDiv.textContent = "No data available";
			noDataDiv.classList.add("text-center", "text-gray-500", "py-4");
			userName.appendChild(noDataDiv);
			return;
		}

		// Populate data
		data.forEach((element) => {
			// Create row container
			const rowContainer = document.createElement("div");
			rowContainer.classList.add(
				"flex",
				"justify-between",
				"w-full",
				"px-4",
				"py-2",
				"border-b",
				"hover:bg-gray-100",
				"transition-colors",
			);

			// Name column
			const nameDiv = document.createElement("div");
			nameDiv.textContent = element.contactName;
			nameDiv.classList.add("text-left", "flex-1");

			// Date column
			const dateDiv = document.createElement("div");
			const formattedDate = new Date(
				element.createdAt,
			).toLocaleDateString();
			dateDiv.textContent = formattedDate;
			dateDiv.classList.add("text-right", "text-gray-600");

			// Append to row
			rowContainer.appendChild(nameDiv);
			rowContainer.appendChild(dateDiv);

			// Add to parent containers
			userName.appendChild(rowContainer);
		});

		// Show data section
		dataSection.classList.remove("hidden");
	} catch (err) {
		console.error("Error fetching data:", err);
		toast("error", err);
	} finally {
		loading.classList.add("hidden");
	}
}

async function viewFailed() {
	const url = new URL(window.location.href);
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	// DOM elements
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");
	const loading = document.getElementById("loading");
	const dataSection = document.getElementById("dataSection");
	const userName = document.getElementById("userName");
	const userDate = document.getElementById("userDate");

	// Open sidebar and show loading
	filterSidebar.classList.add("open");
	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
	loading.classList.remove("hidden");

	try {
		// Fetch data
		const res = await fetch(
			`/dashboard?value=FAILED&startDate=${startDate}&endDate=${endDate}`,
		);
		const data = await res.json();

		// Clear previous data
		userName.innerHTML = "";
		userDate.innerHTML = "";

		// Handle empty or error response
		if (!data || data.success === false) {
			const noDataDiv = document.createElement("div");
			noDataDiv.textContent = "No data available";
			noDataDiv.classList.add("text-center", "text-gray-500", "py-4");
			userName.appendChild(noDataDiv);
			return;
		}

		// Populate data
		data.forEach((element) => {
			// Create row container
			const rowContainer = document.createElement("div");
			rowContainer.classList.add(
				"flex",
				"justify-between",
				"w-full",
				"px-4",
				"py-2",
				"border-b",
				"hover:bg-gray-100",
				"transition-colors",
			);

			// Name column
			const nameDiv = document.createElement("div");
			nameDiv.textContent = element.contactName;
			nameDiv.classList.add("text-left", "flex-1");

			// Date column
			const dateDiv = document.createElement("div");
			const formattedDate = new Date(
				element.createdAt,
			).toLocaleDateString();
			dateDiv.textContent = formattedDate;
			dateDiv.classList.add("text-right", "text-gray-600");

			// Append to row
			rowContainer.appendChild(nameDiv);
			rowContainer.appendChild(dateDiv);

			// Add to parent containers
			userName.appendChild(rowContainer);
		});

		// Show data section
		dataSection.classList.remove("hidden");
	} catch (err) {
		console.error("Error fetching data:", err);
		toast("error", err);
	} finally {
		loading.classList.add("hidden");
	}
}

async function viewReplied() {
	const url = new URL(window.location.href);
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	// DOM elements
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");
	const loading = document.getElementById("loading");
	const dataSection = document.getElementById("dataSection");
	const userName = document.getElementById("userName");
	const userDate = document.getElementById("userDate");

	// Open sidebar and show loading
	filterSidebar.classList.add("open");
	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
	loading.classList.remove("hidden");

	try {
		// Fetch data
		const res = await fetch(
			`/dashboard?value=REPLIED&startDate=${startDate}&endDate=${endDate}`,
		);
		const data = await res.json();

		// Clear previous data
		userName.innerHTML = "";
		userDate.innerHTML = "";

		// Handle empty or error response
		if (!data || data.success === false) {
			const noDataDiv = document.createElement("div");
			noDataDiv.textContent = "No data available";
			noDataDiv.classList.add("text-center", "text-gray-500", "py-4");
			userName.appendChild(noDataDiv);
			return;
		}

		// Populate data
		data.forEach((element) => {
			// Create row container
			const rowContainer = document.createElement("div");
			rowContainer.classList.add(
				"flex",
				"justify-between",
				"w-full",
				"px-4",
				"py-2",
				"border-b",
				"hover:bg-gray-100",
				"transition-colors",
			);

			// Name column
			const nameDiv = document.createElement("div");
			nameDiv.textContent = element.contactName;
			nameDiv.classList.add("text-left", "flex-1");

			// Date column
			const dateDiv = document.createElement("div");
			const formattedDate = new Date(
				element.createdAt,
			).toLocaleDateString();
			dateDiv.textContent = formattedDate;
			dateDiv.classList.add("text-right", "text-gray-600");

			// Append to row
			rowContainer.appendChild(nameDiv);
			rowContainer.appendChild(dateDiv);

			// Add to parent containers
			userName.appendChild(rowContainer);
		});

		// Show data section
		dataSection.classList.remove("hidden");
	} catch (err) {
		console.error("Error fetching data:", err);
		toast("error", err);
	} finally {
		loading.classList.add("hidden");
	}
}

async function viewRead() {
	const url = new URL(window.location.href);
	const startDate = url.searchParams.get("startDate");
	const endDate = url.searchParams.get("endDate");

	// DOM elements
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");
	const loading = document.getElementById("loading");
	const dataSection = document.getElementById("dataSection");
	const userName = document.getElementById("userName");
	const userDate = document.getElementById("userDate");

	// Open sidebar and show loading
	filterSidebar.classList.add("open");
	overlay.classList.add("active");
	document.body.style.overflow = "hidden";
	loading.classList.remove("hidden");

	try {
		// Fetch data
		const res = await fetch(
			`/dashboard?value=READ&startDate=${startDate}&endDate=${endDate}`,
		);
		const data = await res.json();

		// Clear previous data
		userName.innerHTML = "";
		userDate.innerHTML = "";

		// Handle empty or error response
		if (!data || data.success === false) {
			const noDataDiv = document.createElement("div");
			noDataDiv.textContent = "No data available";
			noDataDiv.classList.add("text-center", "text-gray-500", "py-4");
			userName.appendChild(noDataDiv);
			return;
		}

		// Populate data
		data.forEach((element) => {
			// Create row container
			const rowContainer = document.createElement("div");
			rowContainer.classList.add(
				"flex",
				"justify-between",
				"w-full",
				"px-4",
				"py-2",
				"border-b",
				"hover:bg-gray-100",
				"transition-colors",
			);

			// Name column
			const nameDiv = document.createElement("div");
			nameDiv.textContent = element.contactName;
			nameDiv.classList.add("text-left", "flex-1");

			// Date column
			const dateDiv = document.createElement("div");
			const formattedDate = new Date(
				element.createdAt,
			).toLocaleDateString();
			dateDiv.textContent = formattedDate;
			dateDiv.classList.add("text-right", "text-gray-600");

			// Append to row
			rowContainer.appendChild(nameDiv);
			rowContainer.appendChild(dateDiv);

			// Add to parent containers
			userName.appendChild(rowContainer);
		});

		// Show data section
		dataSection.classList.remove("hidden");
	} catch (err) {
		console.error("Error fetching data:", err);
		toast("error", err);
	} finally {
		loading.classList.add("hidden");
	}
}

async function fetchAnalytics(startDate, endDate) {
	const text = document.getElementById("totalCost");

	try {
		// show spinner
		text.innerHTML = `<div class="animate-spin inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>`;

		let startUnix = null;
		let endUnix = null;

		if (!startDate || !endDate) {
			// console.error("Invalid dates:", { startDate, endDate });
			// toast("error", Invalid dates : ${startDate}, ${endDate});
		} else {
			// Convert to Unix timestamps
			startUnix = Math.floor(startDate.getTime() / 1000);
			endUnix = Math.floor(
				(endDate.getTime() + 24 * 60 * 60 * 1000) / 1000,
			);
		}

		// build query string
		const qs = new URLSearchParams({ start: startUnix, end: endUnix });

		const res = await fetch(`/reports/get-cost-report?${qs.toString()}`, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
		});

		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			console.error("Fetch error:", err.error || res.statusText);
			toast("error", err.error || "Failed to fetch analytics");
			return null;
		}

		const data = await res.json();
		// console.log("🎉 got data:", data);

		return processAnalyticsData(data, startDate, endDate);
	} catch (err) {
		console.error("Unexpected error fetching analytics:", err);
		toast("error", err.message || "Something went wrong");
		return null;
	}
}

function processAnalyticsData(rawData) {
	let cost = 0;
	// Process rawData to update timeseriesMap with real data
	rawData.forEach((point) => {
		cost += point.cost || 0;
	});

	document.getElementById("totalCost").innerHTML = cost.toFixed(2);
	// return cost;
}

async function costReport(start, end) {
	const data = await fetchAnalytics(start, end);
	if (data) {
		updateUI(data);
	}
}

function parseLocalMidnight(dateStr) {
	const [year, month, day] = dateStr.split("-").map(Number);
	// monthIndex is zero‑based
	return new Date(year, month - 1, day);
}

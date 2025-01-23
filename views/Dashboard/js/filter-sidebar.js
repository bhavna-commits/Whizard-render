const urlt = new URL(window.location.href);

const startDate1 = urlt.searchParams.get("startDate");
const endDate1 = urlt.searchParams.get("endDate");
if (startDate1 && endDate1) {
	const span = document.getElementById("showDateFilter");
	span.textContent = `${startDate1} to ${endDate1}`;
}

flatpickr("#filterDate", {
	mode: "range",
	dateFormat: "Y-m-d",
	maxDate: "today",
	onChange: function (selectedDates, dateStr, instance) {
		console.log("Selected range:", dateStr);

		const [startDate, endDate] = dateStr.split("to");
		const url = new URL(window.location.href);
		startDate = startDate.trim();
		endDate = endDate.trim();
		if (startDate && endDate) {
			url.searchParams.set("startDate", startDate);
			url.searchParams.set("endDate", endDate);
			window.location.href = url.toString();
		}
	},
});

const filterSidebar = document.getElementById("filterSidebar");
const dataSection = document.getElementById("dataSection");
const userName = document.getElementById("userName");
const userDate = document.getElementById("userDate");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("closeBtn");
const loading = document.getElementById("loading");

// Close sidebar
function closeSidebar() {
	filterSidebar.classList.remove("open");
	overlay.classList.remove("active");
	document.body.style.overflow = "auto";
}

closeBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

// Event listener for close button
document.getElementById("closeBtn").addEventListener("click", () => {
	const filterSidebar = document.getElementById("filterSidebar");
	const overlay = document.getElementById("overlay");

	filterSidebar.classList.remove("open");
	overlay.classList.remove("active");
	document.body.style.overflow = "auto";
});

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
		alert("Failed to fetch data. Please try again.");
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
		alert("Failed to fetch data. Please try again.");
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
		alert("Failed to fetch data. Please try again.");
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
		alert("Failed to fetch data. Please try again.");
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
		alert("Failed to fetch data. Please try again.");
	} finally {
		loading.classList.add("hidden");
	}
}

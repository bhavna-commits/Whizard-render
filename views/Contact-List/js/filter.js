function openFilterModal() {
	const modal = document.getElementById("filterModal");
	// modal.classList.remove("hidden");
	modal.classList.remove("opacity-0", "bg-opacity-0", "pointer-events-none");
	modal.classList.add("opacity-100", "bg-opacity-50");

	// Animate scale on the inner modal for smooth entrance
	const modalContent = modal.querySelector("div");
	modalContent.classList.remove("scale-95");
	modalContent.classList.add("scale-100");
}

function closeFilterModal(event = null) {
	// Close the modal if clicking on the backdrop or the close button
	if (event === null || event.target.id === "filterModal") {
		const modal = document.getElementById("filterModal");
		// modal.classList.add("hidden");
		modal.classList.remove("opacity-100", "bg-opacity-50");
		modal.classList.add("opacity-0", "bg-opacity-0", "pointer-events-none");

		const modalContent = modal.querySelector("div");
		modalContent.classList.remove("scale-100");
		modalContent.classList.add("scale-95");
		// Remove all dynamically added filter rows
		const filterContainer = document.querySelector(".filter-container");
		while (filterContainer.firstChild) {
			filterContainer.removeChild(filterContainer.firstChild);
		}
	}
}

function applyFilters() {
	const dateInterval = document.getElementById("dateInterval").value;
	const filters = [];

	// Collect the basic filter (dateInterval)
	if (dateInterval) {
		filters.push({
			field: "subscribe_date",
			value: dateInterval,
			condition: "has",
		});
	}

	// Collect dynamic filters
	const filterRows = document.querySelectorAll(".filter-row");
	filterRows.forEach((row) => {
		const attribute = row.querySelector("#attributeSelect").value;
		const condition = row.querySelector("#conditionSelect").value;
		const value = row.querySelector("#attributeValue").value;
		if (attribute && value) {
			filters.push({ field: attribute, value, condition });
		}
	});

	// You can send these filters to the backend using fetch
	console.log("Filters Applied: ", filters);
	const id = location.pathname.split("/").pop();
	console.log(id);
	// Make fetch request to apply the filters
	fetch(`/api/contact-list/overview/${id}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ filters }), // Send filters as part of the request body
	})
		.then((response) => response.text())
		.then((data) => {
			// Replace existing contact list with filtered results
			const contactListContainer = document.getElementById("contactList");
			contactListContainer.innerHTML = data; // Clear existing list
		})
		.catch((error) => {
			console.error("Error fetching contacts with filters: ", error);
		});

	// Close the modal after applying filters
	closeFilterModal();
}

function clearFilters() {
	document.getElementById("dateInterval").value = "";
	document.getElementById("attributeSelect").value = "";
	document.getElementById("conditionSelect").value = "";
	document.getElementById("attributeValue").value = "";
	const filterContainer = document.querySelector(".filter-container");
	while (filterContainer.firstChild) {
		filterContainer.removeChild(filterContainer.firstChild);
	}
}

function addFilter() {
	const id = location.pathname.split("/").pop(); // Extract any necessary ID
	fetch(`/contact-list/get-overview-filter/${id}`) // Fetch the rendered options from server
		.then((response) => response.text())
		.then((html) => {
			const filterRow = document.createElement("div");
			filterRow.classList.add("filter-row");

			// Insert rendered HTML into filterRow, which contains the dynamic EJS
			filterRow.innerHTML = `
				<div class="flex items-center pt-2 space-x-2 relative">
					<select placeholder="" id="attributeSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
						${html} <!-- This HTML comes from server-rendered EJS -->
					</select>
					<select id="conditionSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
						<option value="has">has</option>
						<option value="does not">does not</option>
					</select>
					<input type="text" id="attributeValue" placeholder="Attribute value" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
				</div>
			`;

			// Append the new filter row to the .filter-container
			document.querySelector(".filter-container").appendChild(filterRow);
		})
		.catch((error) => {
			console.error("Error fetching filter options:", error);
		});
}

// Initialize flatpickr on a button with id #dateIntervalButton
flatpickr("#dateInterval", {
	mode: "range", // Range selection
	dateFormat: "Y-m-d", // Date format
	maxDate: "today", // Set max date to today
	onChange: function (selectedDates, dateStr) {
		// When the date is selected, update the button text
		const dateButton = document.getElementById("dateInterval");

		if (selectedDates.length === 2) {
			// Check if a range (two dates) is selected
			dateButton.textContent = dateStr; // Update button text with the selected range
		} else if (selectedDates.length === 1) {
			dateButton.textContent = `Start: ${dateStr}`; // For single date in range mode
		}
	},
});

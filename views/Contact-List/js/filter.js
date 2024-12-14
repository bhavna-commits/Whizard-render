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
	const attribute = document.getElementById("attributeSelect").value;
	const condition = document.getElementById("conditionSelect").value;
	const attributeValue = document.getElementById("attributeValue").value;

	// You can send these values to the backend or apply filters on the front-end
	console.log("Filters Applied: ", {
		dateInterval,
		attribute,
		condition,
		attributeValue,
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

	function addFilter() {
		const filterRow = document.createElement("div");
		filterRow.classList.add("filter-row");

		// Add the filter elements (similar to what is inside the modal)
		filterRow.innerHTML = `
	<div class="flex items-center pt-2 space-x-2 relative">
		<select placeholder="" id="attributeSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
			<option value="name">Name</option>
			<option value="tags">Tags</option>
			<option value="contact">Contact</option>
			<option value="whatsapp">WhatsApp</option>
		</select>
		<select id="conditionSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
			<option value="is">has</option>
			<option value="is">does not</option>
			<!-- Add more conditions if needed -->
		</select>
		<input type="text" id="attributeValue" placeholder="Attribute value" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
	</div>
	`;

		// Append the new filter row to the .filter-container
		document.querySelector(".filter-container").appendChild(filterRow);
	}

	flatpickr("#dateInterval", {
		mode: "range",
		dateFormat: "d-m-Y", // Format: Year-Month-Day
		onClose: function (selectedDates, dateStr, instance) {
			console.log("Selected date range: ", dateStr);
		},
	});
}

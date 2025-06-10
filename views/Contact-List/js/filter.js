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

function closeFilterModal(event = null, shouldReset = false) {
	if (event === null || event.target.id === "filterModal") {
		const modal = document.getElementById("filterModal");
		modal.classList.remove("opacity-100", "bg-opacity-50");
		modal.classList.add("opacity-0", "bg-opacity-0", "pointer-events-none");

		const modalContent = modal.querySelector("div");
		modalContent.classList.remove("scale-100");
		modalContent.classList.add("scale-95");

		if (shouldReset) {
			const filterContainer = document.querySelector(".filter-container");
			while (filterContainer.firstChild) {
				filterContainer.removeChild(filterContainer.firstChild);
			}
		}
	}
}

function applyFilters() {
	const dateInterval = document.getElementById("dateInterval").value;
	const filters = [];

	// Collect the basic filter (dateInterval)
	if (dateInterval) {
		filters.push({
			field: "usertimestmp",
			value: dateInterval,
			condition: "has",
		});
	}

	// Change button appearance to show filtered state
	const filterIcon = document.querySelector(".filter-icon");
	const filterIconFilled = document.querySelector(".filter-icon-filled");

	filterIcon.classList.add("hidden");
	filterIconFilled.classList.remove("hidden");

	// Update the text to "Filtered"
	document.getElementById("filter-text").textContent = "Filtered";

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

	const id = location.pathname.split("/").pop();

	fetch(`/api/contact-list/overview/${id}`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ filters }),
	})
		.then((response) => response.text())
		.then((data) => {
			const contactListContainer = document.getElementById("contactList");
			contactListContainer.innerHTML = data;
			formatDateCells();
		})
		.catch((error) => {
			console.error("Error fetching contacts with filters: ", error);
		});

	closeFilterModal(null, false);
}

function clearFilters() {
	location.reload();
}

function updateRemoveButtonsVisibility() {
	const allFilterRows = document.querySelectorAll(
		".filter-container .filter-row",
	);
	const allRemoveBtns = document.querySelectorAll(
		".filter-container .remove-filter",
	);

	if (allFilterRows.length <= 1) {
		allRemoveBtns.forEach((btn) => btn.classList.add("hidden"));
	} else {
		allRemoveBtns.forEach((btn) => btn.classList.remove("hidden"));
	}
}

function attachRemoveHandler(removeBtn) {
	removeBtn.addEventListener("click", () => {
		const row = removeBtn.closest(".filter-row");
		row.remove();
		updateRemoveButtonsVisibility();
	});
}

function addFilter() {
	const id = location.pathname.split("/").pop();
	fetch(`/contact-list/get-overview-filter/${id}`)
		.then((response) => response.text())
		.then((html) => {
			const filterRow = document.createElement("div");
			filterRow.classList.add("filter-row");

			filterRow.innerHTML = `
				<div class="flex items-center pt-2 space-x-2 relative w-full">
					<select id="attributeSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
						${html}
					</select>
					<select id="conditionSelect" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
						<option value="has">has</option>
						<option value="does not">does not</option>
					</select>
					<input type="text" id="attributeValue" placeholder="Attribute value" class="w-fit px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
					<span class="remove-filter cursor-pointer text-3xl text-gray-400 hover:text-red-500 ml-2 select-none">&times;</span>
				</div>
			`;

			document.querySelector(".filter-container").appendChild(filterRow);

			const removeBtn = filterRow.querySelector(".remove-filter");
			attachRemoveHandler(removeBtn);

			updateRemoveButtonsVisibility();
		})
		.catch((error) => {
			console.error("Error fetching filter options:", error);
		});
}

function formatDateCells() {
	document.querySelectorAll(".date-cell").forEach((el) => {
		const rawDate = el.getAttribute("data-date");
		if (rawDate) {
			const date = new Date(Number(rawDate));
			const formatted = date.toLocaleString("en-GB", {
				year: "numeric",
				month: "short",
				day: "2-digit",
			});
			el.textContent = formatted;
		}
	});
}

const dateText = document.getElementById("dateText");
const clearDate = document.getElementById("clearDate");

clearDate.addEventListener("click", (e) => {
	e.stopPropagation();
	datePicker.clear();
	dateText.textContent = "Choose date";
	clearDate.classList.add("hidden");
});

const datePicker = flatpickr("#dateInterval", {
	mode: "range",
	dateFormat: "Y-m-d",
	maxDate: "today",
	onChange: function (selectedDates, dateStr) {
		const dateText = document.getElementById("dateText");
		const clearDate = document.getElementById("clearDate");

		if (selectedDates.length === 2) {
			dateText.textContent = dateStr;
			clearDate.classList.remove("hidden");
		} else if (selectedDates.length === 1) {
			dateText.textContent = `Start: ${dateStr}`;
			clearDate.classList.remove("hidden");
		}
	},
});

document.getElementById("datePickerTrigger").addEventListener("click", () => {
	const calendar = document.querySelector(".flatpickr-calendar");
	const anchor = document.getElementById("dateText");

	datePicker.open();

	setTimeout(() => {
		const rect = anchor.getBoundingClientRect();
		calendar.style.position = "absolute";
		calendar.style.top = `${rect.bottom + window.scrollY}px`;
		calendar.style.left = `${rect.left + window.scrollX}px`;
		calendar.style.zIndex = "9999";
	}, 0);
});

document.addEventListener("click", (e) => {
	const calendar = document.querySelector(".flatpickr-calendar");
	if (
		!document.getElementById("dateText").contains(e.target) &&
		!calendar.contains(e.target)
	) {
		datePicker.close();
	}
});

const initialRemove = document.querySelector(
	".filter-container .remove-filter",
);

if (initialRemove) attachRemoveHandler(initialRemove);

updateRemoveButtonsVisibility();

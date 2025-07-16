// Select elements

// console.log(contacts);

const selectAllCheckbox = document.querySelector(
	'thead input[type="checkbox"]',
);
const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
const broadcastButton = document.getElementById("broadcast");

// Initially disable the broadcast button
broadcastButton.disabled = true;

// Helper function to check if any checkbox is selected
function isAnyCheckboxSelected() {
	return [...checkboxes].some((checkbox) => checkbox.checked);
}

// Function to enable/disable broadcast button
function toggleBroadcastButton() {
	if (isAnyCheckboxSelected()) {
		// Enable the button and update styles
		broadcastButton.disabled = false;
		broadcastButton.classList.remove("hover:cursor-not-allowed");
		broadcastButton.classList.remove("hover:bg-gray-200");
		broadcastButton.classList.remove("bg-gray-300");
		broadcastButton.classList.add("bg-black");
		// broadcastButton.classList.add("hover:bg-gray-600");
	} else {
		// Disable the button and update styles
		broadcastButton.disabled = true;
		broadcastButton.classList.add("hover:cursor-not-allowed");
		broadcastButton.classList.add("hover:bg-gray-200");
		broadcastButton.classList.add("bg-gray-300");
		broadcastButton.classList.remove("bg-black");
		// broadcastButton.classList.remove("hover:bg-gray-600");
	}
}

// Select/Deselect all checkboxes based on header checkbox
selectAllCheckbox.addEventListener("change", function () {
	checkboxes.forEach((checkbox) => {
		checkbox.checked = this.checked;
	});
	toggleBroadcastButton();
});

// Check if broadcast button should be enabled when individual checkboxes are selected
checkboxes.forEach((checkbox) => {
	checkbox.addEventListener("change", toggleBroadcastButton);
});

// Send selected reports data to the backend on broadcast button click
broadcastButton.addEventListener("click", function () {
	// Gather selected reports
	const selectedReports = [];
	checkboxes.forEach((checkbox, index) => {
		if (checkbox.checked) {
			const row = checkbox.closest("tr");
			const report = {
				contactName: row
					.querySelector("td:nth-child(2)")
					.textContent.trim(),
				recipientPhone: row
					.querySelector("td:nth-child(3)")
					.ariaLabel.trim(),
			};
			selectedReports.push(report);
		}
	});

	// Send the data to the backend
	fetch("/api/reports/create-broadcast", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			reports: selectedReports,
			attributes: contact.masterExtra,
			contactListId: contact.contactId,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.success) {
				location.href = "/reports/campaign-list/broadcast";
			} else {
				toast("error",data.message);
			}
		})
		.catch((error) => {
			console.error("Error broadcasting reports:", error);
			toast("error", error);
		});
});

const uploadCSV = document.getElementById("exportCSV");

uploadCSV.addEventListener("click", function () {
	const table = document.querySelector("table");

	let csv = [];

	// Get table headers (excluding checkbox column)
	const headers = [];
	table.querySelectorAll("thead td:not(:first-child)").forEach((header) => {
		headers.push(header.textContent.trim());
	});
	csv.push(headers.join(","));

	// Get table rows
	table.querySelectorAll("tbody tr").forEach((row) => {
		const cells = [];
		const tds = row.querySelectorAll("td");

		tds.forEach((cell, index) => {
			if (index === 0) return; // Skip checkbox column

			let value = "";

			// Phone number (masked)
			if (index === 2) {
				value = cell.textContent.trim();
			}
			// Message Template (strip read more/read less)
			else if (index === 7) {
				const messageEl = cell.querySelector(".messageText");
				if (messageEl) {
					value = messageEl.textContent
						.replace(/Read more|Read less/g, "")
						.replace(/\n/g, "")
						.trim();
				}
			}
			// All other cells
			else {
				value = cell.textContent
					.replace(/Read more|Read less/g, "")
					.replace(/\n/g, "")
					.trim();
			}

			// Escape for CSV (wrap in quotes and escape internal quotes)
			const safeValue = `"${value.replace(/"/g, '""')}"`;
			cells.push(safeValue);
		});

		// Only add row if it has data (skip blank/thank-you rows)
		if (cells.some((cell) => cell.replace(/"/g, "").trim() !== "")) {
			csv.push(cells.join(","));
		}
	});

	const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });

	const downloadLink = document.createElement("a");
	downloadLink.download = "campaign_reports.csv";
	downloadLink.href = window.URL.createObjectURL(csvFile);
	downloadLink.style.display = "none";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
});


function toggleReadMore(event) {
	const readMoreBtn = event.target;
	const messageText = readMoreBtn.closest("td").querySelector(".messageText");
	if (!messageText) return; // Guard against null

	messageText.classList.toggle("whitespace-normal");
	messageText.classList.toggle("whitespace-nowrap");
	messageText.classList.toggle("overflow-hidden");

	readMoreBtn.innerText = messageText.classList.contains("whitespace-normal")
		? "Read less"
		: "Read more";
}


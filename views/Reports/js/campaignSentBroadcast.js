// Select elements

// console.log(contacts);

const selectAllCheckbox = document.querySelector(
	'thead input[type="checkbox"]',
);
const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
const broadcastButton = document.getElementById("broadcast");
const uploadCSV = document.getElementById("exportCSV");

// Initially disable the broadcast button
broadcastButton.disabled = true;
broadcastButton.classList.add("bg-blue-200");
broadcastButton.classList.toggle("hover:bg-blue-600");

// Helper function to check if any checkbox is selected
function isAnyCheckboxSelected() {
	return [...checkboxes].some((checkbox) => checkbox.checked);
}

// Function to enable/disable broadcast button
function toggleBroadcastButton() {
	if (isAnyCheckboxSelected()) {
		broadcastButton.disabled = false;
		broadcastButton.classList.toggle("hover:cursor-not-allowed");
		broadcastButton.classList.toggle("hover:bg-blue-600");
		broadcastButton.classList.remove("bg-blue-200");
	} else {
		broadcastButton.disabled = true;
		broadcastButton.classList.add("bg-blue-200");
		broadcastButton.classList.toggle("hover:bg-blue-600");
		broadcastButton.classList.toggle("hover:cursor-not-allowed");
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
				alert("Failed to initiate broadcast");
			}
		})
		.catch((error) => {
			console.error("Error broadcasting reports:", error);
			alert("An error occurred");
		});
});

uploadCSV.addEventListener("click", function () {
	const table = document.querySelector("table");

	// Initialize an empty array to store rows
	let csv = [];

	// Get table headers, skipping the first checkbox column
	const headers = [];
	table.querySelectorAll("thead td:not(:first-child)").forEach((header) => {
		headers.push(header.textContent.trim());
	});
	csv.push(headers.join(","));

	// Get table rows
	table.querySelectorAll("tbody tr").forEach((row) => {
		const cells = [];
		row.querySelectorAll("td").forEach((cell, index) => {
			// Exclude checkboxes and handle contact differently
			if (index !== 0) {
				// Skip the first checkbox column
				if (index === 2) {
					// Contact column: get the real phone number from the aria-label
					const phoneNumber = cell.getAttribute("aria-label");
					cells.push(phoneNumber);
				} else {
					cells.push(cell.textContent.trim());
				}
			}
		});
		csv.push(cells.join(","));
	});

	// Create CSV Blob
	const csvFile = new Blob([csv.join("\n")], { type: "text/csv" });

	// Create a link element and trigger the download
	const downloadLink = document.createElement("a");
	downloadLink.download = "campaign_reports.csv";
	downloadLink.href = window.URL.createObjectURL(csvFile);
	downloadLink.style.display = "none";

	document.body.appendChild(downloadLink);
	downloadLink.click();
	document.body.removeChild(downloadLink);
});

function toggleReadMore() {
	const messageText = document.getElementById("messageText");
	const readMoreBtn = document.getElementById("readMoreBtn");

	// Toggle the class to show or hide the full text
	messageText.classList.toggle("whitespace-normal");
	messageText.classList.toggle("whitespace-nowrap");
	messageText.classList.toggle("overflow-hidden");

	// Change the button text to "Read less" or "Read more"
	if (messageText.classList.contains("whitespace-normal")) {
		readMoreBtn.innerText = "Read less";
	} else {
		readMoreBtn.innerText = "Read more";
	}
}

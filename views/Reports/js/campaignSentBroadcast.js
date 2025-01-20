// Select elements

// console.log(contacts);

const selectAllCheckbox = document.querySelector(
	'thead input[type="checkbox"]',
);
const checkboxes = document.querySelectorAll('tbody input[type="checkbox"]');
const broadcastButton = document.getElementById("broadcast");

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

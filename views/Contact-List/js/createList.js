const modal = document.getElementById("campaignModal");
const createModal = modal.querySelector(".bg-white");
const showModalBtn = document.getElementById("create-List");
const createcloseBtn = modal.querySelector(".close");
const contactListForm = document.getElementById("contactListForm");
const downloadBtn = document.getElementById("downloadTemplate");
const fileInput = document.getElementById("contactFile");

function showModal() {
	// First make the modal visible but transparent
	modal.classList.remove("pointer-events-none");
	// Trigger reflow
	modal.offsetHeight;
	// Add opacity and scale
	modal.classList.add("opacity-100");
	createModal.classList.remove("scale-95");
	createModal.classList.add("scale-100");
}

function hideModal() {
	// Start fade out animation
	modal.classList.remove("opacity-100");
	createModal.classList.remove("scale-100");
	createModal.classList.add("scale-95");
	// Wait for animation to finish before hiding completely
	setTimeout(() => {
		modal.classList.add("pointer-events-none");
	}, 300);
}

// Show modal
showModalBtn.addEventListener("click", showModal);

// Close modal
createcloseBtn.addEventListener("click", hideModal);

// Close modal when clicking outside
modal.addEventListener("click", function (event) {
	if (event.target === modal || event.target === modal.firstElementChild) {
		hideModal();
	}
});

// Handle file selection
fileInput.addEventListener("change", function (e) {
	const fileName = e.target.files[0]?.name;
	if (fileName) {
		const fileLabel = this.parentElement;
		fileLabel.innerHTML = `<i class="pg-icon pr-1">upload</i> ${fileName}`;
	}
});

// Handle form submission
contactListForm.addEventListener("submit", function (e) {
	e.preventDefault();

	const file = fileInput?.files[0];
	if (!file) {
		alert("Please upload a file.");
		return;
	}

	let formData = {};

	formData.countryCode = document.getElementById("countryCode").value;
	formData.listName = document.getElementById("listName").value;

	// Read the file and parse it
	const reader = new FileReader();

	reader.onload = function (event) {
		const fileContent = event.target.result;
		let parsedData;

		// Check file type and parse accordingly
		if (file.type === "text/csv") {
			// If it's a CSV file
			parsedData = Papa.parse(fileContent, { header: true }).data;
		} else if (
			file.type ===
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
			file.type === "application/vnd.ms-excel"
		) {
			// If it's an Excel file (XLSX/XLS)
			const workbook = XLSX.read(fileContent, { type: "binary" });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			parsedData = XLSX.utils.sheet_to_json(worksheet);
		} else {
			alert("Unsupported file type");
			return;
		}

		// Check if first two columns are "Name" and "WhatsApp"
		const firstRow = parsedData[0];
		if (!firstRow || !firstRow.Name || !firstRow.WhatsApp) {
			alert(
				"The first two columns must be 'Name' and 'WhatsApp'. Please correct the file.",
			);
			return;
		}

		// Add the parsed data to the form data
		formData.fileData = JSON.stringify(parsedData);

		// Send the data to the backend
		fetch("/api/contact-list/createList", {
			method: "POST",
			headers: {
				"Content-Type": "application/json", // Add this header
			},
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					hideModal();
					// Refresh the contact list or show success message
					window.location.reload();
				} else {
					alert(data.message);
				}
			})
			.catch((error) => {
				alert(error);
				console.error(error);
			});
	};

	// Read the file as binary string for XLSX/XLS files or text for CSV
	if (file.type === "text/csv") {
		reader.readAsText(file);
	} else {
		reader.readAsBinaryString(file);
	}
});


// Handle template download

document.querySelectorAll(".edit-btn").forEach((button) => {
	button.addEventListener("click", (e) => {
		const contactData = JSON.parse(e.target.dataset.contact);
		const { id, name, countryCode, participantCount } = contactData;

		// Populate your edit modal with the contact data
		document.getElementById("editName").value = name;
		document.getElementById("editCountryCode").value = countryCode;
		// Assuming you have a hidden input for the id of the contact to edit
		document.getElementById("editContactId").value = id;
	});
});

document.querySelectorAll(".delete-btn").forEach((button) => {
	button.addEventListener("click", (e) => {
		const contactId = e.target.dataset.contactId;

		fetch(`/api/contact-list/deleteList/${contactId}`, {
			method: "DELETE",
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					alert("Contact list deleted successfully");
					window.location.reload(); // Refresh to update the list
				} else {
					alert("Error: " + data.message);
				}
			})
			.catch((error) => {
				console.error("Error deleting contact list", error);
				alert("Error deleting contact list");
			});
	});
});

downloadBtn.addEventListener("click", function () {
	fetch("/api/contact-list/template", {
		method: "GET",
	})
		.then((response) => response.blob()) // Convert the response to a Blob
		.then((blob) => {
			// Create a temporary anchor element to trigger the download
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "sample.csv"; // Specify the filename for download
			document.body.appendChild(a); // Append the anchor to the body (not visible)
			a.click(); // Trigger the click to download the file
			document.body.removeChild(a); // Clean up the DOM by removing the anchor
			window.URL.revokeObjectURL(url); // Revoke the URL object to free memory
		})
		.catch((error) => {
			console.error("Error downloading file:", error);
			alert("There was an error downloading the file.");
		});
});

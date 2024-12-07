const modal = document.getElementById("campaignModal");
const modalContent = modal.querySelector(".bg-white");
const showModalBtn = document.getElementById("create-List");
const closeBtn = modal.querySelector(".close");
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
	modalContent.classList.remove("scale-95");
	modalContent.classList.add("scale-100");
}

function hideModal() {
	// Start fade out animation
	modal.classList.remove("opacity-100");
	modalContent.classList.remove("scale-100");
	modalContent.classList.add("scale-95");
	// Wait for animation to finish before hiding completely
	setTimeout(() => {
		modal.classList.add("pointer-events-none");
	}, 300);
}

// Show modal
showModalBtn.addEventListener("click", showModal);

// Close modal
closeBtn.addEventListener("click", hideModal);

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
	console.log(file);
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
		console.log(fileContent);
		let parsedData;

		// Check file type and parse accordingly
		if (file.type === "text/csv") {
			// If it's a CSV file
			parsedData = Papa.parse(fileContent, { header: true }).data;
			console.log(parsedData);
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

		// Add the parsed data to the FormData
		formData.fileData = JSON.stringify(parsedData);
		console.log(formData);
		// Send the data to the backend
		fetch("/api/contact-list/createList", {
			method: "POST",
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					hideModal();
					// Refresh the contact list or show success message
					window.location.reload();
				} else {
					alert("Error: " + data.message);
				}
			})
			.catch((error) => {
				alert("Error: " + error);
				console.error("Error:", error);
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

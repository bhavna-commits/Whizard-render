const modal = document.getElementById("campaignModal");
const createModal = modal.querySelector(".bg-white");
const showModalBtn = document.getElementById("create-List");
const createcloseBtn = modal.querySelector(".close");
const contactListForm = document.getElementById("contactListForm");
const downloadBtn = document.getElementById("downloadTemplate");
const fileInput = document.getElementById("contactFile");
const previewSection = document.getElementById("previewSection");
const fileUploadSection = document.getElementById("fileUploadSection");
const errorMessage = document.getElementById("errorMessage");
const reUpload = document.getElementById("reUpload");

// Show modal with animation
function showModal() {
	modal.classList.remove("pointer-events-none");
	modal.offsetHeight;
	modal.classList.add("opacity-100");
	createModal.classList.remove("scale-95");
	createModal.classList.add("scale-100");
}

// Hide modal with animation
function hideModal() {
	modal.classList.remove("opacity-100");
	createModal.classList.remove("scale-100");
	createModal.classList.add("scale-95");
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
		fileLabel.innerHTML = `<i class="fa-solid fa-upload pr-2"></i> ${fileName}`;
	}
});

// Form submission and file validation
contactListForm.addEventListener("submit", async function (e) {
	e.preventDefault();

	const formData = new FormData(contactListForm);
	const file = fileInput?.files[0];
	if (!file) {
		alert("Please upload a file.");
		return;
	}

	let parsedData;
	const reader = new FileReader();

	reader.onload = async function (event) {
		const fileContent = event.target.result;

		// Determine file type and parse accordingly
		if (file.type === "text/csv") {
			parsedData = Papa.parse(fileContent, { header: true }).data;
		} else if (
			file.type ===
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
			file.type === "application/vnd.ms-excel"
		) {
			const workbook = XLSX.read(fileContent, { type: "binary" });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];
			parsedData = XLSX.utils.sheet_to_json(worksheet);
		} else {
			alert("Unsupported file type");
			return;
		}

		// Send data to the backend
		formData.append("fileData", JSON.stringify(parsedData));

		try {
			const response = await fetch(
				"/api/contact-list/previewContactList",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						listName: document.getElementById("listName").value,
						countryCode:
							document.getElementById("countryCode").value,
						fileData: parsedData,
					}),
				},
			);

			const data = await response.json();
			if (data.success) {
				previewSection.classList.remove("hidden");
				previewSection.innerHTML = data.tableHtml; // Inject table HTML
				fileUploadSection.classList.add("hidden");
			} else {
				displayErrors(data);
			}
		} catch (error) {
			console.error("Error processing file: ", error);
		}
	};

	if (file.type === "text/csv") {
		reader.readAsText(file);
	} else {
		reader.readAsBinaryString(file);
	}
});

// Error handling and displaying
function displayErrors(result) {
	errorMessage.innerHTML = "";

	if (result.missingColumns.length > 0) {
		errorMessage.innerHTML += `<p>Missing columns: ${result.missingColumns.join(
			", ",
		)}</p>`;
	}

	if (result.invalidColumns.length > 0) {
		errorMessage.innerHTML += `<p>Invalid columns: ${result.invalidColumns.join(
			", ",
		)}</p>`;
	}

	if (result.emptyFields.length > 0) {
		errorMessage.innerHTML += `<p>Empty fields found in rows: ${result.emptyFields
			.map((field) => `Row ${field.row}, Column ${field.column}`)
			.join(", ")}</p>`;
	}
}

// Re-upload logic
reUpload.addEventListener("click", function () {
	fileUploadSection.classList.remove("hidden");
	previewSection.classList.add("hidden");
});

// Handle template download
downloadBtn.addEventListener("click", function () {
	fetch("api/contact-list/sampleCSV")
		.then((response) => response.blob())
		.then((blob) => {
			const filename = "sample.csv";
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		})
		.catch((error) => {
			console.error("Error downloading file:", error);
			alert("There was an error downloading the file.");
		});
});

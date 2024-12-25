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
const mainDiv = document.getElementById("campaignModalDiv");
const previewButton = document.getElementById("previewButton");
const submitButton = document.getElementById("createList");

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
	previewSection.classList.add("hidden");
	fileUploadSection.classList.remove("hidden");
	errorMessage.classList.add("hidden");
	if (!mainDiv.classList.contains("max-w-3xl")) {
		mainDiv.classList.add("max-w-3xl");
		mainDiv.classList.add("mt-[5%]");
		mainDiv.classList.remove("mt-[2%]");
	}
	modal.classList.add("pointer-events-none");
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
		fileLabel.innerHTML = `<input type="file" id="contactFile" accept=".csv,.xls,.xlsx" class="hidden"> <i class="fa-solid fa-upload pr-2"></i> ${fileName}`;
	}
});

// Form submission and file validation
contactListForm.addEventListener("submit", async function (e) {
	e.preventDefault();

	previewSection.classList.add("hidden");
	fileUploadSection.classList.remove("hidden");

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
			parsedData = parsedData.filter((row) => {
				// Check if all values in the row are empty
				return Object.values(row).some(
					(value) => value && value.trim() !== "",
				);
			});
		} else if (
			file.type ===
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
			file.type === "application/vnd.ms-excel"
		) {
			const workbook = XLSX.read(fileContent, { type: "binary" });
			const sheetName = workbook.SheetNames[0];
			const worksheet = workbook.Sheets[sheetName];

			// Convert worksheet to JSON
			parsedData = XLSX.utils.sheet_to_json(worksheet);

			// Filter out empty rows
			parsedData = parsedData.filter((row) => {
				// Check if all values in the row are empty
				return Object.values(row).some(
					(value) => value && value.trim() !== "",
				);
			});
		} else {
			alert("Unsupported file type");
			return;
		}

		const listName = document.getElementById("listName").value;
		const countryCode = document.getElementById("countryCode").value;

		try {
			const response = await fetch(
				"/api/contact-list/previewContactList",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						fileData: JSON.stringify(parsedData),
						listName,
						countryCode,
					}),
				},
			);

			const data = await response.json();

			if (data.success) {
				previewSection.classList.remove("hidden");
				mainDiv.classList.remove("max-w-3xl");
				mainDiv.classList.remove("mt-[5%]");
				mainDiv.classList.add("mt-[2%]");
				previewSection.innerHTML = data.tableHtml;
				fileUploadSection.classList.add("hidden");
				previewButton.classList.add("hidden");
				submitButton.classList.remove("hidden");
			} else {
				if (data.message) {
					alert(data.message);
				} else {
					displayErrors(data);
				}
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

submitButton.addEventListener("click", async () => {
	try {
		const response = await fetch("/api/contact-list/create-list", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				listName: document.getElementById("listName").value,
				countryCode: document.getElementById("countryCode").value,
			}),
		});

		const data = await response.json();
		if (data.success) {
			location.reload();
		} else {
			alert(data.message);
		}
	} catch (error) {
		console.error("Error creating list:", error);
	}
});

// Error handling and displaying
function displayErrors(result) {
	errorMessage.innerHTML = "";
	previewSection.classList.remove("hidden");
	mainDiv.classList.remove("max-w-3xl");
	mainDiv.classList.remove("mt-[5%]");
	mainDiv.classList.add("mt-[2%]");
	previewSection.innerHTML = result.tableHtml;
	fileUploadSection.classList.add("hidden");

	if (result.missingColumns.length > 0) {
		errorMessage.innerHTML += `<p class="py-2"><p class="font-bold py-1">Missing columns: </p><span>${result.missingColumns.join(
			", ",
		)}</span>`;
	}

	if (result.invalidColumns.length > 0) {
		errorMessage.innerHTML += `<p class="py-2"><p class="font-bold py-1">Invalid columns: </p><span>${result.invalidColumns.join(
			", ",
		)}</span></p>`;
		errorMessage.innerHTML += `
		<button onclick="document.location='contact-list/custom-field'" type="button" class="border-2 mt-2 bg-red-100  py-2 px-2 rounded-lg transition-colors ease-in-out text-black duration-300 hover:bg-red-300 h-fit w-fit text-base font-medium">
			Manage custom fields
		</button>`;
	}

	if (result.emptyFields.length > 0) {
		errorMessage.innerHTML += `<p class="py-2"><p class="font-bold py-1">Empty fields found in rows: </p><span>${result.emptyFields
			.map((field) => `Row ${field.row}, Column ${field.column}`)
			.join(", ")}</span></p>`;
	}
}

// Re-upload logic
reUpload.addEventListener("click", function () {
	fileUploadSection.classList.remove("hidden");
	previewSection.classList.add("hidden");
});

// Handle template download
function getSampleCSV() {
	console.log("click");
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
			console.log("here");
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		})
		.catch((error) => {
			console.error("Error downloading file:", error);
			alert("There was an error downloading the file.");
		});
}

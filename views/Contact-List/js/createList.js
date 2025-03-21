const modal = document.getElementById("campaignModal");
const createModal = modal.querySelector(".bg-white");
const showModalBtn = document.getElementById("create-List");
const createcloseBtn = modal.querySelector(".close");
const contactListForm = document.getElementById("contactListForm");
const downloadBtn = document.getElementById("downloadTemplate");
const previewSection = document.getElementById("previewSection");
const fileUploadSection = document.getElementById("fileUploadSection");
const errorMessage = document.getElementById("errorMessage");
// const reUpload = document.getElementById("reUpload");
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
	// errorMessage.classList.add("hidden");

	// Reset form inputs
	fileInput.value = null;
	fileLabel.textContent = "Choose File";
	document.getElementById("listName").value = ""; // Reset list name input
	file = null; // Reset file variable

	// Reset preview and buttons
	previewSection.innerHTML = ""; // Clear the preview section
	errorMessage.innerHTML = ""; // Clear the error messages
	previewButton.classList.remove("hidden"); // Hide preview button
	submitButton.classList.add("hidden"); // Hide submit button

	// Reset main div size if needed
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

let file = null;

const fileInput = document.getElementById("contactFile");
const fileLabel = document.getElementById("fileLabel");

fileInput.addEventListener("change", function (e) {
	const fileName = e.target.files[0]?.name || "Choose File";
	fileLabel.textContent = fileName;
	file = e.target.files[0];
	previewButton.classList.remove("hidden");
	submitButton.classList.add("hidden");
});

// Form submission and file validation
contactListForm.addEventListener("submit", async function (e) {
	e.preventDefault();

	previewSection.classList.add("hidden");
	fileUploadSection.classList.remove("hidden");

	if (!file) {
		toast("info","Please upload a file.");
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
			toast("info","Unsupported file type");
			return;
		}

		const listName = document.getElementById("listName").value;

		try {
			previewButton.innerHTML = `<div class="flex justify-center items-center">
  											<div class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
										</div>`;
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
					}),
				},
			);

			errorMessage.innerHTML = "";
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
					toast("error",data.message);
				} else {
					displayErrors(data);
				}
			}
		} catch (error) {
			console.error("Error processing file: ", error);
		} finally {
			previewButton.innerHTML = "Preview";
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
		submitButton.innerHTML = `<div class="flex justify-center items-center">
  											<div class="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
										</div>`;
		errorMessage.innerHTML = "";
		const response = await fetch("/api/contact-list/create-list", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				listName: document.getElementById("listName").value,
			}),
		});

		const data = await response.json();
		if (data.success) {
			location.reload();
		} else {
			toast("error",data.message);
		}
	} catch (error) {
		console.error("Error creating list:", error);
	} finally {
		submitButton.innerHTML = "Submit";
	}
});

// Error handling and displaying
function displayErrors(result) {
	errorMessage.innerHTML = "";
	previewSection.classList.remove("hidden");
	mainDiv.classList.remove("max-w-3xl", "mt-[5%]");
	mainDiv.classList.add("mt-[2%]");
	previewSection.innerHTML = result.tableHtml;
	fileUploadSection.classList.add("hidden");

	// Create error container with better layout
	const errorContainer = document.createElement("div");
	errorContainer.className = "space-y-4 mb-6";

	// Helper function to create error sections
	const createErrorSection = (title, content, count, type) => {
		return `
        <div class="bg-red-50 p-4 rounded-lg border border-red-200 error-section cursor-pointer" onclick="toggleErrorDetails('${type}')">
            <div class="flex items-center justify-between" >
                <h3 class="font-semibold text-red-700">
                    ${title} (${count})
                </h3>
                <svg id="icon-${type}" class="w-5 h-5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </div>
            <div id="details-${type}" class="mt-2 text-sm text-red-600 hidden details-content">
                ${content}
            </div>
        </div>`;
	};

	// Build error sections
	let errorSections = "";

	// Missing Columns
	if (result.missingColumns.length > 0) {
		errorSections += createErrorSection(
			"Missing Required Columns",
			`<p>These columns are required but missing from your file:</p>
            <ul class="list-disc pl-5 mt-1">
                ${result.missingColumns.map((c) => `<li>${c}</li>`).join("")}
            </ul>`,
			result.missingColumns.length,
			"missing-columns",
		);
	}

	// Invalid Columns
	if (result.invalidColumns.length > 0) {
		errorSections += createErrorSection(
			"Invalid Columns Found",
			`<p>These columns are not recognized, please add the columns in customs fields first by clicking on the button below, before adding to the csv</p>
            <ul class="list-disc pl-5 mt-1">
                ${result.invalidColumns.map((c) => `<li>${c}</li>`).join("")}
            </ul>
            <button onclick="document.location='/contact-list/custom-field'" type="button" 
                class="mt-3 bg-red-100 border-2 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors">
                Create Custom Fields
            </button>`,
			result.invalidColumns.length,
			"invalid-columns",
		);
	}

	// Empty Fields
	if (result.emptyFields.length > 0) {
		const example = result.emptyFields[0];
		errorSections += createErrorSection(
			"Empty Fields Detected",
			`<p>Found ${result.emptyFields.length} empty fields. Example:</p>
            <p class="mt-1">Row ${example.row}, Column "${example.column}"</p>
            <p class="mt-2 text-red-700">Please fill all required fields marked in red.</p>`,
			result.emptyFields.length,
			"empty-fields",
		);
	}

	// Invalid Numbers
	if (result.invalidNumbers.length > 0) {
		const example = result.invalidNumbers[0];
		// console.log(result.invalidNumbers);
		errorSections += createErrorSection(
			"Invalid Phone Numbers",
			`<p>Found ${result.invalidNumbers.length} invalid numbers.</p>
            <p class="mt-1">Example: Row ${example.row}: "${example.value}"</p>
            <p class="mt-2 text-red-700">Phone numbers must contain only : digits, minimum 12 digits, country code without "+"(If any of these things are missing or incorrect please correct it and re-upload the file)</p>`,
			result.invalidNumbers.length,
			"invalid-numbers",
		);
	}

	// Duplicate Numbers
	if (result.duplicateNumbers.length > 0) {
		const example = result.duplicateNumbers[0];
		errorSections += createErrorSection(
			"Duplicate Phone Numbers",
			`<p>Found ${result.duplicateNumbers.length} duplicates. Example:</p>
            <p class="mt-1">Number "${example.value}" appears multiple times</p>
            <p class="mt-2 text-red-700">Each phone number must be unique.</p>`,
			result.duplicateNumbers.length,
			"duplicate-numbers",
		);
	}

	errorContainer.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-red-600">Found ${Object.values(
			result,
		).reduce(
			(acc, val) => acc + (Array.isArray(val) ? val.length : 0),
			0,
		)} Issues</h2>
        ${errorSections}
        <p class="text-sm text-gray-600 mt-4">
            Click on any error type above to see details. Fix these issues and re-upload your file.
        </p>`;

	errorMessage.appendChild(errorContainer);
}

// Toggle error details visibility
function toggleErrorDetails(type) {
	const details = document.getElementById(`details-${type}`);
	const icon = document.getElementById(`icon-${type}`);

	details.classList.toggle("hidden");
	icon.classList.toggle("rotate-180");
}

// Re-upload logic
// reUpload.addEventListener("click", function () {
// 	fileUploadSection.classList.remove("hidden");
// 	previewSection.classList.add("hidden");
// });

// Handle template download
function getSampleCSV() {
	console.log("click");
	fetch("/api/contact-list/sampleCSV")
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
			toast("error","There was an error downloading the file.");
		});
}

const searchInput = document.getElementById("searchInput");
const contactListTable = document.getElementById("contactListTable");

let debounceTimer;

searchInput.addEventListener("input", function () {
	const query = searchInput.value;

	// Clear existing timer
	clearTimeout(debounceTimer);

	// Show loading spinner immediately
	contactListTable.innerHTML = `
        <div class="flex justify-center items-center h-96">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
        </div>
    `;

	// Set new timer
	debounceTimer = setTimeout(async () => {
		try {
			const response = await fetch(
				`/api/contact-list/search?query=${encodeURIComponent(query)}`,
			);

			if (response.ok) {
				const data = await response.text();
				contactListTable.innerHTML = data;
			} else {
				contactListTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-red-500 py-4 h-full w-full">
                            Error loading results
                        </td>
                    </tr>
                `;
			}
		} catch (error) {
			console.error("Error making the request", error);
			contactListTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-red-500 py-4 h-full w-full">
                        Network error - failed to fetch results
                    </td>
                </tr>
            `;
		}
	}, 300); // 300ms delay after typing stops
});

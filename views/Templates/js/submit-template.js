async function submit() {
	const submitButton = document.getElementById("submitTemplate");
	const originalText = submitButton.innerHTML;

	// Show loading spinner
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
	submitButton.disabled = true;

	try {
		const templateData = collectTemplateData();
		console.log(templateData);
		if (!templateData) return;
		// Validate curly braces in header, body, and footer
		let headerValidation = { isValid: true, error: null, numbers: [] };

		// Validate curly braces in header only if the header type is 'text'
		if (templateData.header.type === "text") {
			headerValidation = validateCurlyBraces(templateData.header.content);
		}
		const bodyValidation = validateCurlyBraces(templateData.body);
		const footerValidation = validateCurlyBraces(templateData.footer);

		if (
			!headerValidation.isValid ||
			!bodyValidation.isValid ||
			!footerValidation.isValid
		) {
			throw new Error(
				headerValidation.error ||
					bodyValidation.error ||
					footerValidation.error,
			);
		}

		// Collect all dynamic variables
		const dynamicVariables = [
			...headerValidation.numbers,
			...bodyValidation.numbers,
			...footerValidation.numbers,
		].sort((a, b) => a - b);

		// Create FormData for file upload
		const formData = new FormData();
		formData.append(
			"templateData",
			JSON.stringify({
				...templateData,
				dynamicVariables,
			}),
		);

		if (templateData.header.content instanceof File) {
			formData.append("headerFile", templateData.header.content);
		}
		console.log("FormData:", Array.from(formData.entries()));
		const response = await fetch("/api/templates/createTemplate", {
			method: "POST",
			body: formData,
		});

		// Parse response data to populate modal content
		const responseData = await response.json();
		console.log(responseData);

		// Assuming the response contains templateData
		if (responseData.templateData) {
			const previewHead = document.getElementById("previewHead");
			previewHead.innerHTML = "";
			const templateData = responseData.templateData;
			// Check if the header content is of type "media"
			const header = templateData.header;
			if (header?.type === "text") {
				// Display text preview
				previewHead.textContent =
					header.content || "Header Text Preview";
			} else if (header?.type === "media" && header.content) {
				if (
					header?.content.includes(".jpg") ||
					header?.content.includes(".png") ||
					header?.content.includes(".jpeg") ||
					header?.content.includes(".webp")
				) {
					// Image preview
					const img = document.createElement("img");
					img.src = `/uploads/${templateData.owner}/${header.content}`;
					console.log(img.src);
					img.style.width = "200px";
					img.style.height = "100px";
					previewHead.appendChild(img);
				} else if (header.content.includes(".mp4")) {
					// Video preview
					const video = document.createElement("video");
					video.src = `/uploads/${templateData.owner}/${header.content}`;
					video.controls = true;
					video.style.width = "200px";
					video.style.height = "100px";
					previewHead.appendChild(video);
				} else if (header?.content.includes(".pdf")) {
					// Document preview (PDF)
					const iframe = document.createElement("iframe");
					iframe.src = `/uploads/${templateData.owner}/${header.content}`;
					iframe.style.width = "200px";
					iframe.style.height = "100px";
					previewHead.appendChild(iframe);
				} else {
					// For other document types (e.g., DOCX, CSV), just display the file name
					previewHead.textContent =
						"Uploaded File: " + header.content;
				}
			}

			const modalTitle = document.getElementById("templateModalLabel");
			const previewForm = document.getElementById("previewForm");
			const previewBody = document.getElementById("previewBod");
			console.log(previewBody);
			const previewFooter = document.getElementById("previewFoot");

			modalTitle.innerHTML = responseData.templateData.templateName;

			previewForm.innerHTML = responseData.templateData.dynamicVariables
				.map(
					(variable) => `
        				<div class="form-group py-1">
            				<label class="font-semibold">Choose Attributes for ${variable}</label>
            				<input type="text" class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="Enter ${variable}">
        				</div>`,
				)
				.join("");

			if (responseData.templateData.header) {
				if (responseData.templateData.header.type === "text") {
					previewHead.innerHTML =
						responseData.templateData.header.content.replace(
							/(\r\n|\n|\r)/g,
							"<br>",
						);
				}
			}

			previewBody.innerHTML = responseData.templateData.body.replace(
				/(\r\n|\n|\r)/g,
				"<br>",
			);
			console.log(previewBody.innerHTML);
			previewFooter.innerHTML = `<small class="text-muted leading-3">${responseData.templateData.footer.replace(
				/(\r\n|\n|\r)/g,
				"<br>",
			)}</small>`;
			generatePreviewWebsite(templateData);
			generatePreviewCall(templateData);
			// Show the modal using Tailwind by removing the 'hidden' class
			const customModal = document.getElementById("customModal");
			customModal.classList.remove("hidden");
		}
	} catch (error) {
		alert(error.message);
	} finally {
		// Restore button state
		submitButton.innerHTML = originalText;
		submitButton.disabled = false;
	}
}

function generatePreviewWebsite(templateData) {
	const previewButtons = document.getElementById("previewButton");
	let url = templateData?.buttons?.filter((d) =>
		d.urlPhone.startsWith("http"),
	);
	if (!url) return;
	let label = url.length > 0 && url[0].text ? url[0].text : "Visit Now";

	let preview = `
        <button class="btn  btn-secondary me-2" id="websiteBt" onclick="window.open('${url.urlPhone}', '_blank')" style="color: #6A67FF;">
            <i class="fa fa-external-link mx-2"></i>${label}
        </button>
    `;

	if (previewButtons) {
		previewButtons.outerHTML = preview;
	} else {
		previewButtons.innerHTML += preview;
	}
}

// Generate Call Button Preview with FA icon
function generatePreviewCall(templateData) {
	const previewButtons = document.getElementById("previewButton");
	let url = templateData.buttons.filter(
		(d) => !d.urlPhone.startsWith("http"),
	);
	if (url) return;
	let label = url.length > 0 && url[0].text ? url[0].text : "Call Now";

	let preview = `
        <button class="btn btn-secondary me-2" id="callBt" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
            <i class="fa fa-phone mx-2"></i>${label}
        </button>
    `;

	if (previewButtons) {
		previewButtons.outerHTML = preview;
	} else {
		previewButtons.innerHTML += preview;
	}
}

// Function to show the modal
function openModal(templateData) {
	// Show the modal
	document.getElementById("customModal").classList.remove("hidden");

	// Set template name
	document.getElementById("templateModalLabel").innerText =
		templateData.templateName;

	// Generate and insert dynamic attributes
	const previewForm = document.getElementById("previewForm");
	previewForm.innerHTML = ""; // Clear existing form content

	templateData.dynamicVariables.forEach((variable) => {
		const formGroup = document.createElement("div");
		formGroup.className = "form-group py-1";

		formGroup.innerHTML = `
      <label class="font-semibold">Choose Attributes for ${variable}</label>
      <input type="text" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm">
    `;

		previewForm.appendChild(formGroup);
	});

	// Generate and insert iPhone preview
	const iphoneContainer = document.querySelector(".iphone-container");
	iphoneContainer.innerHTML = `
    <div class="card bg-gray-100 p-4 rounded-md shadow-lg">
      <h3 class="text-lg font-bold">iPhone Preview</h3>
      <p class="mt-4">${templateData.body}</p>
    </div>
  `;
}

// Function to close the modal
function closeModal() {
	document.getElementById("customModal").classList.add("hidden");
}

// Attach close button event
document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

// Example usage
const sampleTemplateData = {
	templateName: "Sample Template",
	dynamicVariables: ["Name", "WhatsApp"],
	body: "This is the body of the template preview.",
};

// Validate curly braces format and extract numbers
function validateCurlyBraces(text) {
	if (!text) return { isValid: true, numbers: [] };

	const regex = /\{(\d+)\}/g;
	const matches = text.match(regex) || [];
	const numbers = [];
	let isValid = true;

	// Check for invalid curly brace formats
	const invalidFormatRegex = /\{[^\d}]*\}|\{[\d]*[^\d}]+[\d]*\}|\{(?!\d+\})/g;
	if (text.match(invalidFormatRegex)) {
		return { isValid: false, error: "Invalid curly braces format" };
	}

	// Extract numbers and check for duplicates
	matches.forEach((match) => {
		const num = parseInt(match.replace(/[{}]/g, ""));
		if (numbers.includes(num)) {
			isValid = false;
		} else {
			numbers.push(num);
		}
	});

	return {
		isValid,
		numbers: isValid ? numbers : [],
		error: !isValid ? "Duplicate numbers in curly braces" : null,
	};
}

// Collect all template data
function collectTemplateData() {
	const templateData = {};

	// Helper function to display error messages
	function showError(message) {
		alert(message);
		return false;
	}

	// Validate template name
	const templateNameInput = document.querySelector(
		'input[placeholder="Give new template a name"]',
	);
	if (!templateNameInput || !templateNameInput.value.trim()) {
		return showError("Please provide a valid template name.");
	}
	templateData.templateName = templateNameInput.value.trim();

	// Validate category selection
	const categoryText = document
		.getElementById("categoryButton")
		.textContent.trim();
	if (categoryText === "Choose category") {
		return showError("Please select a valid category.");
	}
	templateData.category = categoryText;

	// Validate body input
	const bodyInput = document.getElementById("bodyInput").innerText.trim();
	if (!bodyInput) {
		return showError("Body content cannot be empty.");
	}
	templateData.body = bodyInput;

	// Validate footer input
	const footerInput = document.getElementById("footerInput");
	if (!footerInput || !footerInput.value.trim()) {
		return showError("Footer content cannot be empty.");
	}
	templateData.footer = footerInput.value.trim();

	// Validate buttons
	const buttonElements = document.getElementById("buttonOptions").children;
	templateData.buttons = Array.from(buttonElements).map((btn, index) => {
		let buttonData = { text: "", urlPhone: "" };

		// Check for 'Visit Now' (Website) button
		let websiteText = btn
			.querySelector('input[placeholder="Visit Now"]')
			?.value?.trim();
		let websiteUrl = btn
			.querySelector('input[placeholder="example.com"]')
			?.value?.trim();

		// Check for 'Call Now' (Phone Call) button
		let callText = btn
			.querySelector('input[placeholder="Call Now"]')
			?.value?.trim();
		let phoneNumber = btn
			.querySelector('input[placeholder="9999999999"]')
			?.value?.trim();

		// If website fields exist, handle 'Visit Now' button validation
		if (websiteText !== undefined || websiteUrl !== undefined) {
			buttonData.text = websiteText || "Visit Now"; // Default to 'Visit Now' if text is empty

			// Validate URL
			if (!websiteUrl || !websiteUrl.startsWith("http")) {
				showError(
					`Button ${
						index + 1
					}: A valid URL is required for 'Visit Now' button.`,
				);
				return null;
			}
			buttonData.urlPhone = websiteUrl;
		}

		// If phone fields exist, handle 'Call Now' button validation
		if (callText !== undefined || phoneNumber !== undefined) {
			buttonData.text = callText || "Call Now"; // Default to 'Call Now' if text is empty

			// Validate Phone Number
			if (!phoneNumber) {
				showError(
					`Button ${
						index + 1
					}: Phone number is required for 'Call Now' button.`,
				);
				return null;
			}
			buttonData.urlPhone = `tel:${phoneNumber}`; // Ensure the phone number is prefixed with 'tel:'
		}

		// If neither website nor phone data exists, alert and return null
		if (!buttonData.urlPhone) {
			showError(`Button ${index + 1}: URL or Phone number is required.`);
			return null;
		}

		return buttonData;
	});

	// Check if any button validation failed
	if (templateData.buttons.includes(null)) {
		return false; // Stop submission if any button is invalid
	}

	// Validate header input based on type
	const headerTypeDropdown = document.getElementById("mediaTypeDropdown");
	if (!headerTypeDropdown) {
		return showError("Header type is missing.");
	}

	const headerType = headerTypeDropdown.value;
	templateData.header = { type: headerType, content: null };

	// Skip header validation if the type is "none"
	if (headerType === "none") {
		// If 'none' is selected, skip header validation and keep header content as null
		templateData.header.content = null;
	} else if (headerType === "text") {
		// Validate text header
		const headerText = document.getElementById("headerInput").value.trim();
		if (!headerText) {
			return showError("Header content cannot be empty for text type.");
		}
		templateData.header.content = headerText;
	} else if (headerType === "media") {
		// Validate media header
		const fileInput = document.getElementById("file-upload");
		if (!fileInput || !fileInput.files.length) {
			return showError("Please upload a media file for the header.");
		}
		templateData.header.content = fileInput.files[0]; // Ensure file uploads are handled properly on the backend
	} else {
		// Handle invalid header types
		return showError("Invalid header type selected.");
	}

	// Return the final validated template data
	return templateData;
}

async function submit() {
	const submitButton = document.getElementById("submitTemplate");
	const originalText = submitButton.innerHTML;

	// Show loading spinner
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
	submitButton.disabled = true;

	try {
		const templateData = collectTemplateData();

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

		// Submit to API
		const response = await fetch("/api/dashboard/createTemplate", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error("Failed to create template");
		}

		// Redirect to next page
		window.location.href = "/template-preview";
	} catch (error) {
		alert(error.message);
	} finally {
		// Restore button state
		submitButton.innerHTML = originalText;
		submitButton.disabled = false;
	}
}

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
		alert(message); // Can be replaced with better UI error display, such as showing in the DOM
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
		.querySelector(".dropdown-toggle")
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
		const type = btn.dataset.type; // Identify button type (url/phone)
		let buttonData = { type, text: "", urlPhone: "" };

		if (type === "url") {
			// For 'Visit Now' button
			buttonData.text = btn
				.querySelector('input[placeholder="Visit Now"]')
				?.value?.trim();
			buttonData.urlPhone = btn
				.querySelector('input[placeholder="example.com"]')
				?.value?.trim();

			// Validate the text and URL
			if (!buttonData.text) {
				showError(
					`Button ${
						index + 1
					}: Text is required for 'Visit Now' button.`,
				);
				return null;
			}
			if (!buttonData.urlPhone) {
				showError(
					`Button ${
						index + 1
					}: URL is required for 'Visit Now' button.`,
				);
				return null;
			}
		} else if (type === "phone") {
			// For 'Call Now' button
			buttonData.text = btn
				.querySelector('input[placeholder="Call Now"]')
				?.value?.trim();
			buttonData.urlPhone = btn
				.querySelector('input[placeholder="9999999999"]')
				?.value?.trim();

			// Validate the text and phone number
			if (!buttonData.text) {
				showError(
					`Button ${
						index + 1
					}: Text is required for 'Call Now' button.`,
				);
				return null;
			}
			if (!buttonData.urlPhone) {
				showError(
					`Button ${
						index + 1
					}: Phone number is required for 'Call Now' button.`,
				);
				return null;
			}
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

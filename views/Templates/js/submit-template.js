// Helper function to retrieve input values for dynamic variables
function getDynamicValue(inputs, variable) {
	for (const input of inputs) {
		if (input.getAttribute("data-variable") == variable) {
			return input.value || `{{${variable}}}`;
		}
	}
	return `{{${variable}}}`;
}

async function submit() {
	if (!validateInputs()) {
		return; // Prevent submission if inputs are invalid
	}
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

		// Collect dynamic variables from modal input fields only if they exist
		const previewFormInputs =
			document.querySelectorAll("#previewForm input");
		const dynamicVariables = {
			body: bodyValidation.numbers.length
				? bodyValidation.numbers.map((number) => ({
						[number]: getDynamicValue(previewFormInputs, number),
				  }))
				: [],
			footer: footerValidation.numbers.length
				? footerValidation.numbers.map((number) => ({
						[number]: getDynamicValue(previewFormInputs, number),
				  }))
				: [],
			header: headerValidation.numbers.length
				? headerValidation.numbers.map((number) => ({
						[number]: getDynamicValue(previewFormInputs, number),
				  }))
				: [],
		};

		// console.log("dynamic variaebledsad",dynamicVariables)
		// Create FormData for file upload
		const formData = new FormData();
		if (templateData.header.type == "media") {
			const mediaType = document.getElementById("mediaType").value;

			if (mediaType === "image") {
				templateData.header.type = "image";
			} else if (mediaType === "video") {
				templateData.header.type = "video";
			} else if (mediaType === "document") {
				templateData.header.type = "document";
			} else if (mediaType === "location") {
				templateData.header.type = "location";
			}
		}

		const url = location.hostname;

		formData.append(
			"templateData",
			JSON.stringify({
				...templateData,
				dynamicVariables,
				selectedLanguageCode,
				url,
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
		const res = await response.json();
		console.log(res);

		if (res.success) {
			location.href = "/template";
		} else {
			alert(res.message);
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

function validateInputs() {
	const inputs = document.querySelectorAll("#previewForm input");
	let isValid = true;

	inputs.forEach((input) => {
		if (!input.value.trim()) {
			alert(
				`Please fill in the value for variable ${input.dataset.variable}`,
			);
			isValid = false;
		}
	});

	return isValid;
}

// Validate double curly braces format and extract numbers
function validateCurlyBraces(text) {
	if (!text) return { isValid: true, numbers: [] };

	// Regex to match {{number}}
	const regex = /\{\{(\d+)\}\}/g;
	const matches = text.match(regex) || [];
	const numbers = [];
	let isValid = true;

	// Check for invalid double curly brace formats
	const invalidFormatRegex =
		/\{\{[^\d}]*\}\}|\{\{[\d]*[^\d}]+[\d]*\}\}|\{\{(?!\d+\}\})/g;
	if (text.match(invalidFormatRegex)) {
		return { isValid: false, error: "Invalid double curly braces format" };
	}

	// Extract numbers and check for duplicates
	matches.forEach((match) => {
		const num = parseInt(match.replace(/[\{\}]/g, ""));
		if (numbers.includes(num)) {
			isValid = false;
		} else {
			numbers.push(num);
		}
	});

	return {
		isValid,
		numbers: isValid ? numbers : [],
		error: !isValid ? "Duplicate numbers in double curly braces" : null,
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

	if (selectedLanguageCode === null) {
		alert("Please select a language before proceeding.");
		return false;
	}

	// Validate template name
	const templateNameInput = document.querySelector(
		'input[placeholder="Give new template a name"]',
	);
	if (!templateNameInput || !templateNameInput.value.trim()) {
		return showError("Please provide a valid template name.");
	}

	// Check that the template name contains no spaces, hyphens, or underscores
	const templateName = templateNameInput.value.trim();
	if (/[^a-z0-9_]/.test(templateName)) {
		return showError(
			"Template name must be lowercase and cannot contain spaces, hyphens, or special characters (except underscores).",
		);
	}

	templateData.templateName = templateName;

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
	templateData.buttons = Array.from(buttonElements)
		.filter((btn) => btn.style.display !== "none") // Ignore buttons with display: none
		.map((btn, index) => {
			let buttonData = { text: "", type: "" };

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
			if (websiteText || websiteUrl) {
				buttonData.text = websiteText || "Visit Now"; // Default to 'Visit Now' if text is empty
				buttonData.type = "URL";

				// Validate URL
				if (!websiteUrl || !websiteUrl.startsWith("http")) {
					showError(
						`Button ${
							index + 1
						}: A valid URL is required for 'Visit Now' button.`,
					);
					return null;
				}
				buttonData.url = websiteUrl;
			}

			// If phone fields exist, handle 'Call Now' button validation
			if (callText || phoneNumber) {
				buttonData.text = callText || "Call Now"; // Default to 'Call Now' if text is empty
				buttonData.type = "PHONE_NUMBER";

				// Validate Phone Number
				if (!phoneNumber) {
					showError(
						`Button ${
							index + 1
						}: Phone number is required for 'Call Now' button.`,
					);
					return null;
				}
				buttonData.phone_number = phoneNumber;
			}

			// If neither website nor phone data exists, alert and return null
			if (!buttonData.url && !buttonData.phone_number) {
				showError(
					`Button ${index + 1}: URL or Phone number is required.`,
				);
				return null;
			}

			return buttonData;
		})
		.filter((buttonData) => buttonData !== null); // Filter out any null entries caused by validation errors

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
		templateData.header.content = null;
	} else if (headerType === "text") {
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

		templateData.header.content = fileInput.files[0];
		console.log(templateData.header.content);
	} else {
		return showError("Invalid header type selected.");
	}

	return templateData;
}
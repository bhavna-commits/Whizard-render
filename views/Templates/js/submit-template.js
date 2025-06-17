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
	let response;

	const submitButton = document.getElementById("submitTemplate");
	const originalText = submitButton.innerHTML;

	// Show loading spinner
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
	submitButton.disabled = true;

	try {
		const templateData = collectTemplateData();
		// console.log(templateData);
		if (!templateData) return;

		if (templateData.category === "Authentication") {
			try {
				const buttonComponent = templateData.components.find(
					(comp) => comp.type?.toUpperCase() === "BUTTONS",
				);

				const firstButton = buttonComponent?.buttons?.[0] || {};

				const dynamicVariables = {
					body: [
						{
							text: document.getElementById("previewBody")
								.innerHTML,
						},
					],
					footer: [
						{
							text: document.getElementById("previewFooter")
								.innerHTML,
						},
					],
					buttons: [
						{
							auto: templateData.supportedApps
								? firstButton.autofill_text || "Autofill"
								: "",
							copy: firstButton.text || "Copy code",
						},
					],
				};

				const formData = new FormData();
				formData.append(
					"templateData",
					JSON.stringify({
						...templateData,
						dynamicVariables,
					}),
				);

				response = await fetch("/api/templates/createTemplate", {
					method: "POST",
					body: formData,
				});

				const res = await response.json();

				if (res.success) {
					location.href = "/template";
				} else {
					toast("error", res.message);
				}
			} catch (error) {
				toast("error", error.message || error);
				console.log(error);
			} finally {
				submitButton.innerHTML = originalText;
				submitButton.disabled = false;
			}
			return;
		}

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

		const url = `https://${location.hostname}`;

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

		const editURL = location.href.split("/")[4];

		if (editURL === "edit") {
			const url = location.href.split("/");
			const templateId = url[url.length - 2];

			// Log formData contents
			// for (let [key, value] of formData.entries()) {
			// 	console.log(`${key}: ${value}`);
			// }

			response = await fetch(
				`/api/templates/editTemplate/${templateId}`,
				{
					method: "POST",
					body: formData, // Send FormData directly
				},
			);
		} else {
			response = await fetch("/api/templates/createTemplate", {
				method: "POST",
				body: formData,
			});
		}

		// Parse response data to populate modal content
		const res = await response.json();

		if (res.success) {
			location.href = "/template";
		} else {
			toast("error", res.message);
		}
	} catch (error) {
		toast("error", error.message || error);
		console.log(error);
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
			toast(
				"error",
				`Please fill in the value for variable ${input.dataset.variable}`,
			);
			isValid = false;
		}
	});

	return isValid;
}

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

function collectTemplateData() {
	const templateData = {};

	if (selectedLanguageCode === null) {
		toast("info", "Please select a language before proceeding.");
		return null;
	}

	const templateNameInput = document.querySelector(
		'input[placeholder="Give new template a name"]',
	);
	if (!templateNameInput || !templateNameInput.value.trim()) {
		toast("info", "Please provide a valid template name.");
		return null;
	}

	const templateName = templateNameInput.value.trim();
	if (/[^a-z0-9_]/.test(templateName)) {
		toast(
			"info",
			"Template name must be lowercase and cannot contain spaces, hyphens, or special characters (except underscores).",
		);
		return null;
	}
	templateData.templateName = templateName;

	const categoryText = document
		.getElementById("categoryButton")
		.textContent.trim();

	if (categoryText === "Authentication") {
		return collectAuthData(templateData);
	}

	templateData.category = categoryText;

	const bodyInput = document.getElementById("bodyInput").innerText.trim();
	if (!bodyInput) {
		toast("info", "Body content cannot be empty.");
		return null;
	}
	templateData.body = bodyInput;

	const footerInput = document.getElementById("footerInput");
	if (footerInput.value.trim()) {
		templateData.footer = footerInput.value.trim();
	}

	const buttonElements = document.getElementById("buttonOptions").children;
	templateData.buttons = Array.from(buttonElements)
		.filter((btn) => btn.style.display !== "none")
		.map((btn, index) => {
			let buttonData = { text: "", type: "" };
			let websiteText = btn
				.querySelector('input[placeholder="Visit Now"]')
				?.value?.trim();
			let websiteUrl = btn
				.querySelector('input[placeholder="example.com"]')
				?.value?.trim();
			let callText = btn
				.querySelector('input[placeholder="Call Now"]')
				?.value?.trim();
			let phoneNumber = btn
				.querySelector('input[placeholder="9999999999"]')
				?.value?.trim();

			if (websiteText || websiteUrl) {
				buttonData.text = websiteText || "Visit Now";
				buttonData.type = "URL";

				if (!websiteUrl || !websiteUrl.startsWith("https://")) {
					toast(
						"info",
						`Button ${
							index + 1
						}: A valid URL is required for 'Visit Now' button.`,
					);
					return null;
				}
				buttonData.url = websiteUrl;
			}

			if (callText || phoneNumber) {
				buttonData.text = callText || "Call Now";
				buttonData.type = "PHONE_NUMBER";

				if (!phoneNumber) {
					toast(
						"info",
						`Button ${
							index + 1
						}: Phone number is required for 'Call Now' button.`,
					);
					return null;
				}
				buttonData.phone_number = phoneNumber;
			}

			if (!buttonData.url && !buttonData.phone_number) {
				toast(
					"info",
					`Button ${index + 1}: URL or Phone number is required.`,
				);
				return null;
			}

			return buttonData;
		});

	if (templateData.buttons.includes(null)) return null;

	const headerTypeDropdown = document.getElementById("mediaTypeDropdown");
	if (!headerTypeDropdown) {
		toast("info", "Header type is missing.");
		return null;
	}

	const headerType = headerTypeDropdown.value;
	templateData.header = { type: headerType, content: null };

	if (headerType === "none") {
		templateData.header.content = null;
	} else if (headerType === "text") {
		const headerText = document.getElementById("headerInput").value.trim();
		if (!headerText) {
			toast("info", "Header content cannot be empty for text type.");
			return null;
		}
		templateData.header.content = headerText;
	} else if (headerType === "media") {
		const fileInput = document.getElementById("file-upload");
		if (!fileInput || !fileInput.files.length) {
			toast("info", "Please upload a media file for the header.");
			return null;
		}
		templateData.header.content = fileInput.files[0];
	} else {
		toast("info", "Invalid header type selected.");
		return null;
	}

	return templateData;
}

function collectAuthData(templateData) {
	const otpType = document.querySelector(
		'input[name="codeDelivery"]:checked',
	)?.value;
	const addSecurity = document.querySelector(
		'input[name="addSecurityCheckbox"]',
	)?.checked;
	const addOtpExpiry = document.querySelector(
		'input[name="otpCheckbox"]',
	)?.checked;
	const otpExpiration = parseInt(
		document.querySelector("#otpExpiration")?.value || 0,
	);
	const copyText =
		document.querySelector('input[data-type="copycode"]')?.value || "";
	const autofillText =
		document.querySelector('input[data-type="autofill"]')?.value || "";
	const isAutoFill = otpType === "zero_tap" || otpType === "one_tap";

	const toggle = document.getElementById("customValidityToggle");
	const messageValidationDropdown = document.getElementById("validityPeriod");
	let validityPeriod;
	if (toggle.checked) {
		validityPeriod = messageValidationDropdown.value;
	}
	const supportedApps = [];
	document.querySelectorAll(".app-row").forEach((row) => {
		const packageName = row.querySelector(".package-name")?.value;
		const sigHash = row.querySelector(".signature-hash")?.value;
		if (packageName && sigHash) {
			supportedApps.push({
				package_name: packageName,
				signature_hash: sigHash,
			});
		}
	});

	templateData.validityPeriod = validityPeriod;
	templateData.category = "Authentication";
	templateData.components = [];

	const bodyComponent = { type: "BODY" };

	if (addSecurity) bodyComponent.add_security_recommendation = true;

	templateData.components.push(bodyComponent);

	if (addOtpExpiry && otpExpiration > 0 && otpExpiration <= 90) {
		templateData.components.push({
			type: "FOOTER",
			code_expiration_minutes: otpExpiration,
		});
	}

	const buttonComponent = {
		type: "BUTTONS",
		buttons: [
			{
				type: "otp",
				otp_type: otpType,
			},
		],
	};

	if (isAutoFill) {
		buttonComponent.buttons[0].supported_apps = supportedApps;
	}

	if (otpType === "zero_tap") {
		buttonComponent.buttons[0].zero_tap_terms_accepted = true;
	}

	if (copyText.trim()) buttonComponent.buttons[0].text = copyText.trim();
	if (autofillText.trim() && isAutoFill)
		buttonComponent.buttons[0].autofill_text = autofillText.trim();

	templateData.components.push(buttonComponent);

	return templateData;
}

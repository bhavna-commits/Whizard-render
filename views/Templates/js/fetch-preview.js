function openModal() {
	const templateData = collectTemplateData();
	if (!templateData) return;

	document.getElementById("customModal").classList.remove("hidden");
	document.getElementById("templateModalLabel").innerText =
		templateData.templateName;

	const variables = initializePreview(templateData);
	createVariableInputs(variables);

	// Add event listeners
	const previewForm = document.getElementById("previewForm");
	previewForm.addEventListener("input", handleInputChange);

	// Initial preview update
	updatePreview();

	// console.error("Error initializing preview:", error);
	// alert(error.message);
}
// Function to close the modal
function closeModal() {
	document.getElementById("customModal").classList.add("hidden");
}

// Attach close button event
document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

// Template preview functionality
let originalTemplateData = {};
let currentTemplateData = {};

function initializePreview(templateData) {
	originalTemplateData = {
		header: templateData.header.content || "",
		body: templateData.body || "",
		footer: templateData.footer || "",
		headerType: templateData.header.type || "none",
	};

	currentTemplateData = { ...originalTemplateData };
	let headerValidation = { isValid: true, error: null, numbers: [] };
	if (templateData.header.type == "text") {
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

	return [
		...new Set([
			...headerValidation.numbers,
			...bodyValidation.numbers,
			...footerValidation.numbers,
		]),
	].sort();
}

function createVariableInputs(variables) {
	const previewForm = document.getElementById("previewForm");
	previewForm.innerHTML = "";

	variables.forEach((variable, index) => {
		const formGroup = document.createElement("div");
		formGroup.className = "form-group py-1";
		formGroup.innerHTML = `
      <label class="font-semibold">Choose Attributes for ${variable}</label>
      <input 
        type="text" 
        class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" 
        data-variable="${variable}" 
        data-index="${index}"
      >
    `;
		previewForm.appendChild(formGroup);
	});
}

function updatePreview() {
	const sections = {
		header: document.getElementById("previewHead"),
		body: document.getElementById("previewBod"),
		footer: document.getElementById("previewFoot"),
	};

	Object.entries(sections).forEach(([key, element]) => {
		console.log(currentTemplateData[key]);
		if (element && currentTemplateData[key]) {
			element.innerHTML = currentTemplateData[key].replace(/\n/g, "<br>");
		}
	});
}

function handleInputChange(event) {
	const variable = event.target.dataset.variable;
	const value = event.target.value.trim();

	if (originalTemplateData.headerType === "text") {
		currentTemplateData.header = replaceVariableWithSpan(
			originalTemplateData.header,
			variable,
			value,
		);
	}

	currentTemplateData.body = replaceVariableWithSpan(
		originalTemplateData.body,
		variable,
		value,
	);
	currentTemplateData.footer = replaceVariableWithSpan(
		originalTemplateData.footer,
		variable,
		value,
	);

	updatePreview();
}

function replaceVariableWithSpan(templatePart, variable, value) {
	if (!templatePart) return "";

	const regex = new RegExp(`{{\\s*${variable}\\s*}}`, "g");
	// const spanTemplate = `<span id="${variable}">${

	// }</span>`;

	return templatePart.replace(regex, value || `{{${variable}}}`);
}

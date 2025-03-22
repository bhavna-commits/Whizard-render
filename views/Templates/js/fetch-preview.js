function openModal() {
	const templateData = collectTemplateData();
	if (!templateData) return;

	const variables = initializePreview(templateData);
	if (!variables) return;

	document.getElementById("customModal").classList.remove("hidden");
	document.getElementById("templateModalLabel").innerText =
		templateData.templateName;
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

function initializePreview(templateData) {
	originalTemplateData = {
		body: templateData.body || "",
	};

	const bodyValidation = validateCurlyBraces(templateData.body);

	if (!bodyValidation.isValid) {
		toast("info",bodyValidation.error);
		return false;
	}

	return [...new Set([...bodyValidation.numbers])].sort();
}

function handleInputChange(event) {
	const variable = event.target.dataset.variable;
	const value = event.target.value.trim();
	let span = document.getElementById(`dynamic_${variable}`);

	if (span) {
		const newSpan = `<span class="bg-transparent" id="dynamic_${variable}">${
			value || `{{${variable}}}`
		}</span>`;

		originalTemplateData.body = originalTemplateData.body.replace(
			span.outerHTML,
			newSpan,
		);
	} else {
		const newSpan = `<span class="bg-transparent" id="dynamic_${variable}">${
			value || `{{${variable}}}`
		}</span>`;

		// Find the placeholder in the template body using regex and replace it with the new span
		const regex = new RegExp(`{{\\s*${variable}\\s*}}`, "g");
		originalTemplateData.body = originalTemplateData.body.replace(
			regex,
			newSpan,
		);
	}

	updatePreview();
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
		// console.log(currentTemplateData[key]);
		if (element && originalTemplateData[key]) {
			element.innerHTML = originalTemplateData[key].replace(
				/\n/g,
				"<br>",
			);
		}
	});
}

// function replaceVariableWithSpan(templatePart, variable, value) {
// 	if (!templatePart) return "";

// 	// Preserve existing values
// 	const regex = new RegExp(`{{\\s*${variable}\\s*}}`, "g");
// 	const spanTemplate = <input class="bg-transparent" id="${variable}" value="${value}" />;

// 	// Replace only the specific variable while preserving others
// 	return templatePart.replace(regex, spanTemplate);
// }

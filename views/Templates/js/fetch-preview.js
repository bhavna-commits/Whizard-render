let originalTemplateData = { body: "" };
let variableValues = {}; // keep input values separately

function openModal() {
	const templateData = collectTemplateData();
	if (!templateData) return;

	const variables = initializePreview(templateData);
	if (!variables) return;

	document.getElementById("customModal").classList.remove("hidden");
	document.getElementById("templateModalLabel").innerText =
		templateData.templateName;
	createVariableInputs(variables);

	// 🔥 reattach listener after clearing form
	const previewForm = document.getElementById("previewForm");
	previewForm.addEventListener("input", handleInputChange);

	updatePreview();
}

function closeModal() {
	document.getElementById("customModal").classList.add("hidden");
}

document.getElementById("modalCloseBtn").addEventListener("click", closeModal);

function initializePreview(templateData) {
	originalTemplateData = {
		// If backend sends preformatted body_preview (with <b>, <i>), use that
		body: templateData.body_preview || templateData.body || "",
	};

	const bodyValidation = validateCurlyBraces(templateData.body);
	if (!bodyValidation.isValid) {
		toast("info", bodyValidation.error);
		return false;
	}

	return [...new Set([...bodyValidation.numbers])].sort();
}

function handleInputChange(event) {
	const variable = event.target.dataset.variable;
	const value = event.target.value.trim();

	// store separately instead of mutating template string
	variableValues[variable] = value;

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
	let updatedBody = originalTemplateData.body;

	// 🔥 replace placeholders with typed values
	Object.entries(variableValues).forEach(([variable, value]) => {
		const safeValue = value || `{{${variable}}}`;
		const regex = new RegExp(`{{\\s*${variable}\\s*}}`, "g");
		updatedBody = updatedBody.replace(regex, safeValue);
	});

	// ✅ preserve formatting (bold/italic/strike)
	document.getElementById("previewBod").innerHTML = updatedBody.replace(
		/\n/g,
		"<br>",
	);

	if (originalTemplateData.header) {
		document.getElementById("previewHead").innerHTML =
			originalTemplateData.header;
	}
	if (originalTemplateData.footer) {
		document.getElementById("previewFoot").innerHTML =
			originalTemplateData.footer;
	}
}

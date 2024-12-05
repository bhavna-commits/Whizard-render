async function submit() {
	const submitButton = document.getElementById("submitTemplate");
	const originalText = submitButton.innerHTML;

	// Show loading spinner
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin"></i> Submitting...';
	submitButton.disabled = true;

	try {
		const templateData = collectTemplateData();

		// Validate curly braces in header, body, and footer
		const headerValidation = validateCurlyBraces(
			templateData.header.content,
		);
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
    return { isValid: false, error: 'Invalid curly braces format' };
  }

  // Extract numbers and check for duplicates
  matches.forEach(match => {
    const num = parseInt(match.replace(/[{}]/g, ''));
    if (numbers.includes(num)) {
      isValid = false;
    } else {
      numbers.push(num);
    }
  });

  return {
    isValid,
    numbers: isValid ? numbers : [],
    error: !isValid ? 'Duplicate numbers in curly braces' : null
  };
}

// Collect all template data
function collectTemplateData() {
  const templateData = {
    templateName: document.querySelector('input[placeholder="Give new template a name"]').value,
    category: document.querySelector('.dropdown-toggle').textContent.trim(),
    languages: Array.from(document.querySelector('select[multiple]').selectedOptions).map(opt => opt.value),
    header: {
      type: document.getElementById('mediaTypeDropdown').value,
      content: null
    },
    body: document.getElementById('bodyInput').innerText,
    footer: document.getElementById('footerInput').value,
    buttons: Array.from(document.getElementById('buttonOptions').children).map(btn => ({
      type: btn.dataset.type,
      text: btn.querySelector('input[placeholder="Button text"]').value,
      url: btn.querySelector('input[placeholder*="URL"]')?.value,
      phone: btn.querySelector('input[placeholder*="Phone"]')?.value
    }))
  };

  // Handle header content based on type
  if (templateData.header.type === 'text') {
    templateData.header.content = document.getElementById('headerInput').value;
  } else if (templateData.header.type === 'media') {
    const fileInput = document.getElementById('file-upload');
    templateData.header.content = fileInput.files[0];
  }

  return templateData;
}
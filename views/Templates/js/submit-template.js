async function submit() {
	const submitButton = document.getElementById("submitTemplate");
	const originalText = submitButton.innerHTML;

	// Show loading spinner
	submitButton.innerHTML =
		'<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';
	submitButton.disabled = true;

	try {
		const templateData = collectTemplateData();
		// console.log(templateData);
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
		const response = await fetch("/api/templates/createTemplate", {
			method: "POST",
			body: formData,
		});

		if (!response.ok) {
			throw new Error("Failed to create template");
		}

		// Parse response data to populate modal content
		const responseData = await response.json();
		console.log(responseData);
		// Assuming the response contains templateData
		if (responseData.templateData) {
			// Set the modal data dynamically based on the response
			const modalTitle = document.getElementById("templateModalLabel");
			const previewForm = document.getElementById("previewForm");
			const previewHeader = document.getElementById("previewHeader");
			console.log(previewHeader);
			const previewBody = document.getElementById("previewBody");
			console.log(previewBody.value);
			const previewFooter = document.getElementById("previewFooter");
			

			//
			// Set the modal title
			modalTitle.innerHTML = responseData.templateData.templateName;

			// Populate the dynamic variables form
			previewForm.innerHTML = responseData.templateData.dynamicVariables
				.map(
					(variable) => `
        <div class="form-group py-1">
            <label class="font-semibold">Choose Attributes for ${variable}</label>
            <input type="text" class="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="Enter ${variable}">
        </div>
    `,
				)
				.join("");

			// Update the iPhone preview sections
			if (responseData.templateData.header) {
				if (responseData.templateData.header.type === "text") {
					previewHeader.innerHTML =
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
			console.log(previewBody.innerHTML)
			previewFooter.innerHTML = `<small class="text-muted border leading-6">${responseData.templateData.footer.replace(
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
	const previewButtons = document.getElementById("previewButtons");
	let url = templateData?.buttons?.filter((d) => d.urlPhone.startsWith("http"));
	if (!url) return;
	let label = url.length > 0 && url[0].text ? url[0].text : "Visit Now";

	let preview = `
        <button class="btn  btn-secondary me-2" id="websiteBtn" onclick="window.open('${url.urlPhone}', '_blank')" style="color: #6A67FF;">
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
	const previewButtons = document.getElementById("previewButtons");
	let url = templateData.buttons.filter((d) => !d.urlPhone.startsWith("http"));
	if (url) return;
	let label = url.length > 0 && url[0].text ? url[0].text : "Call Now";

	let preview = `
        <button class="btn btn-secondary me-2" id="callBtn" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
            <i class="fa fa-phone mx-2"></i>${label}
        </button>
    `;

	let existingBtn = document.getElementById("callBtn_" + id);
	if (existingBtn) {
		existingBtn.outerHTML = preview;
	} else {
		document.getElementById("previewButtons").innerHTML += preview;
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

// Open the modal when needed

// function generateModalBody(templateData) {
// 	// Generate the modal's HTML structure
// 	return `
//     <div class="flex space-x-4 p-4"> <!-- Flex container for left and right sections -->

//       <!-- Left Side: Form for Dynamic Variables -->
//       <div class="w-1/2 p-4 border-r"> <!-- 50% width for the left side with padding and border -->
//        <!-- Template name on top -->
//         <form id="previewForm">
//           ${templateData.dynamicVariables
// 				.map(
// 					(variable) => `
//             <div class="form-group py-2">
//               <label class="font-semibold">Choose Attributes for ${variable}</label>
//              <input type="text" class="w-full" onchange="updateAttribute()" />
//             </div>
//           `,
// 				)
// 				.join(
// 					"",
// 				)} <!-- Join dynamic form elements into the structure -->
//         </form>
//       </div>

//       <!-- Right Side: iPhone Preview -->
//       <div class="w-1/2 flex justify-center items-center"> <!-- 50% width for the right side -->
//         <div class="iphone-container">
//           <div class="iphone-screen">
//             <div class="card">

//               <!-- Header Section -->
//               ${
// 					templateData.header &&
// 					templateData.header.type !== "none" &&
// 					templateData.header.content
// 						? `
//                 ${
// 					templateData.header.contentType === "image"
// 						? `
//                   <img src="${templateData.header.content}" class="card-img-top img-fluid" alt="Header Image" />
//                 `
// 						: templateData.header.contentType === "pdf"
// 						? `
//                   <embed src="${templateData.header.content}#page=1" type="application/pdf" width="100%" height="500px" />
//                 `
// 						: templateData.header.contentType === "docx"
// 						? `
//                   <iframe src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
// 						templateData.header.content,
// 					)}" width="100%" height="500px" frameborder="0"></iframe>
//                 `
// 						: templateData.header.contentType === "video"
// 						? `
//                   <video controls class="card-img-top" width="100%">
//                     <source src="${templateData.header.content}" type="video/mp4" />
//                     Your browser does not support the video tag.
//                   </video>
//                 `
// 						: templateData.header.contentType === "location"
// 						? `
//                   <iframe width="100%" height="300px" src="https://www.google.com/maps/embed/v1/place?key=YOUR_GOOGLE_MAPS_API_KEY&q=${encodeURIComponent(
// 						templateData.header.content,
// 					)}" frameborder="0" style="border: 0" allowfullscreen=""></iframe>
//                 `
// 						: templateData.header.type === "text"
// 						? `
//                   <p class="card-text text-sm font-bold pb-2" id="previewHead">
//                     ${templateData.header.content.replace(
// 						/(\r\n|\n|\r)/g,
// 						"<br>",
// 					)}
//                   </p>
//                   <img src="https://via.placeholder.com/360x180" class="card-img-top" alt="Image" />
//                 `
// 						: ""
// 				}
//               `
// 						: ""
// 				}

//               <!-- Body and Footer Section -->
//               <div class="card-body">
//                 <p class="card-text text-sm" id="previewBody">
//                   ${templateData.body.replace(/(\r\n|\n|\r)/g, "<br>")}
//                 </p>
//                 <p class="card-text text-sm" id="previewFooter">
//                   <small class="text-muted">${templateData.footer.replace(
// 						/(\r\n|\n|\r)/g,
// 						"<br>",
// 					)}</small>
//                 </p>

//                 <!-- Dynamic Buttons -->
//                 ${templateData.buttons
// 					.map(
// 						(button) => `
//                   <a href="${
// 						button.urlPhone.startsWith("http")
// 							? button.urlPhone
// 							: "tel:" + button.urlPhone
// 					}" class="btn btn-sm btn-outline-primary">
//                     <i class="pr-1 ${
// 						button.urlPhone.startsWith("http")
// 							? "fa-solid fa-arrow-up-right-from-square"
// 							: "fa-solid fa-phone"
// 					}"></i>
//                     ${
// 						button.text ||
// 						(button.urlPhone.startsWith("http")
// 							? "Visit Now"
// 							: "Call Now")
// 					}
//                   </a>
//                 `,
// 					)
// 					.join("")}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   `;
// }

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

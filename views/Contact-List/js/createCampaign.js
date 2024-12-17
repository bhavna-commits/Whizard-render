// API service for handling data fetching
async function fetchTemplates() {
	const response = await fetch("/getTemplates");
	return response.json();
}

async function fetchContactLists() {
	const response = await fetch("/contact-list/getContactList");
	return response.json();
}

async function fetchTemplateById(templateId) {
	const response = await fetch(`/api/templates/${templateId}`);
	return response.json();
}

async function fetchContactListContacts(contactListId) {
	const response = await fetch(`/api/contact-list/${contactListId}/contacts`);
	return response.json();
}

class AttributeManager {
	constructor(container, onAttributeChange) {
		this.container = container;
		this.onAttributeChange = onAttributeChange;
	}

	update(template, contacts) {
		if (!template?.dynamicVariables || !contacts.length) {
			this.container.innerHTML =
				'<p class="text-center p-2 text-gray-500">No attributes available</p>';
			return;
		}

		const attributes = contacts[0]?.additionalAttributes || {};
		const options = this.generateAttributeOptions(Object.keys(attributes));

		this.container.innerHTML = template.dynamicVariables
			.map(
				(variable) => `
                <div class=" mt-3">
                    <label class="w-full">Variable: {${variable}}</label>
                    <select class="attribute-select w-full" data-variable="${variable}">
                        ${options
							.map(
								(opt) => `
                            <option value="${opt.value}">${opt.label}</option>
                        `,
							)
							.join("")}
                    </select>
                </div>
            `,
			)
			.join("");

		// Initialize Select2 on new dropdowns
		$(this.container)
			.find(".attribute-select")
			.select2()
			.on("change", () => this.handleSelection());
	}

	generateAttributeOptions(attributes, includeUserName = true) {
		const options = includeUserName ? ["userName"] : [];
		return [...options, ...attributes].map((attr) => ({
			value: attr,
			label: attr.charAt(0).toUpperCase() + attr.slice(1),
		}));
	}

	handleSelection() {
		const variables = {};
		$(this.container)
			.find(".attribute-select")
			.each(function () {
				const variable = $(this).data("variable");
				variables[variable] = $(this).val();
			});

		this.onAttributeChange(variables);
	}
}

class Preview {
	constructor(container) {
		this.container = container;
	}

	update(template) {
		console.log(template);
		if (!template) {
			this.container.innerHTML =
				'<p class="text-center text-gray-500">Select a template to preview</p>';
			return;
		}

		const { header, body, footer, buttons } = template;
		console.log(body);
		let headerContent = "";
		// Assuming base path for uploaded files
		const baseFilePath = `/uploads/${template.owner}/`;

		if (header?.type === "media") {
			// Check the type of media and render accordingly
			const fileName = header?.content; // Get the file name from header.content
			const fileExtension = fileName.split(".").pop().toLowerCase(); // Extract the file extension
			const fileUrl = baseFilePath + fileName;
			console.log(fileUrl);
			if (["jpg", "jpeg", "png", "gif", "svg"].includes(fileExtension)) {
				headerContent = `<img src="${fileUrl}" alt="Header Image" class="custom-card-img">`;
			} else if (["mp4", "mov", "avi", "mkv"].includes(fileExtension)) {
				headerContent = `<video controls class="custom-card-img"><source src="${fileUrl}" type="video/${fileExtension}">Your browser does not support the video tag.</video>`;
			} else if (["pdf"].includes(fileExtension)) {
				headerContent = `<embed src="${fileUrl}" type="application/pdf" width="100%" height="400px" />`;
			} else if (["docx", "xlsx", "csv"].includes(fileExtension)) {
				headerContent = `<a href="${fileUrl}" target="_blank">Download Document</a>`;
			} else {
				headerContent = `<p>Unsupported media format.</p>`;
			}
		} else {
			headerContent = "";
		}

		this.container.innerHTML = `
    ${headerContent}
   <p class="text-lg py-1">${body.replace(/\n/g, "<br>")}</p>
    <p class="text-base text-gray-500 py-1">${footer.replace(/\n/g, "<br>")}</p>
    <div>
        ${buttons
			.map((button) => {
				let buttonContent = "";
				// Check if it's an HTTP URL (for web links)
				if (button.urlPhone.startsWith("http")) {
					let label = button.text || "Visit Now";
					buttonContent = `
                        <button class="border-t w-full mt-2 pt-1 text-center me-2 text-base" onclick="window.open('${button.urlPhone}', '_blank')" style="color: #6A67FF;">
                            <i class="fa fa-external-link mx-2"></i><span class="text-lg">${label}</span>
                        </button>
                    `;
				}
				// Check if it's a phone number (for call links)
				else {
					let label = button.text || "Call Now";
					let phone = button.urlPhone.replace("tel:", ""); // Extract phone number
					buttonContent = `
                        <button class="border-t w-full mt-2 pt-1 text-center  me-2 text-base" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
                            <i class="fa fa-phone mx-2"></i><span class="text-lg">${label}</span>
                        </button>
                    `;
				}
				return buttonContent;
			})
			.join("")}
    </div>
`;
	}
}

class TemplateManager {
	constructor() {
		this.templateSelect = $("#template-select");
		this.recipientSelect = $("#recipient-select");
		this.previewContainer = document.getElementById("preview-container");
		this.attributesForm = document.getElementById("attributes-form");
		this.campaignForm = document.getElementById("campaign-form");

		this.preview = new Preview(this.previewContainer);
		this.attributeManager = new AttributeManager(
			this.attributesForm,
			this.handleAttributeSelection.bind(this),
		);

		this.currentTemplate = null;
		this.currentContacts = [];

		this.init();
	}

	async init() {
		try {
			await Promise.all([this.loadTemplates(), this.loadContactLists()]);

			// Initialize Select2 and bind events
			this.templateSelect
				.select2()
				.on("change", (e) => this.handleTemplateChange(e));
			this.recipientSelect
				.select2()
				.on("change", (e) => this.handleContactListChange(e));

			// Form submit handler
			$(this.campaignForm).on("submit", (e) => this.handleFormSubmit(e));

			this.previewContainer.innerHTML =
				'<p class="text-center text-gray-500">Select a template to preview</p>';

			this.attributesForm.innerHTML =
				'<p class="text-center p-2 text-gray-500">Select a template and a recipient list</p>';
		} catch (error) {
			console.error("Error initializing:", error);
		}
	}

	async loadTemplates() {
		try {
			const templates = await fetchTemplates();
			this.templateSelect
				.empty()
				.append('<option value="">Select a template...</option>');

			templates.forEach((template) => {
				this.templateSelect.append(
					new Option(template.templateName, template._id),
				);
			});
		} catch (error) {
			console.error("Error loading templates:", error);
		}
	}

	async loadContactLists() {
		try {
			const contactLists = await fetchContactLists();
			this.recipientSelect
				.empty()
				.append('<option value="">Select recipients...</option>');

			contactLists.forEach((list) => {
				this.recipientSelect.append(
					new Option(list.ContactListName, list._id),
				);
			});
		} catch (error) {
			console.error("Error loading contact lists:", error);
		}
	}

	async handleTemplateChange(event) {
		const templateId = event.target.value;
		// console.log("Template changed:", templateId);

		if (!templateId) {
			this.currentTemplate = null;
			this.preview.update(null);
			return;
		}

		try {
			const { template } = await fetchTemplateById(templateId);
			console.log(template);
			this.currentTemplate = template;
			this.preview.update(template);
			this.attributeManager.update(template, this.currentContacts);
		} catch (error) {
			console.error("Error loading template:", error);
		}
	}

	async handleContactListChange(event) {
		const contactListId = event.target.value;
		console.log("Contact list changed:", contactListId);

		if (!contactListId) {
			this.currentContacts = [];
			this.attributeManager.update(this.currentTemplate, []);
			return;
		}

		try {
			this.currentContacts = await fetchContactListContacts(
				contactListId,
			);
			this.attributeManager.update(
				this.currentTemplate,
				this.currentContacts,
			);
		} catch (error) {
			console.error("Error loading contacts:", error);
		}
	}

	handleAttributeSelection(variables) {
		console.log("Attributes selected:", variables);
	}

	async handleFormSubmit(event) {
		event.preventDefault();

		const formData = new FormData(this.campaignForm);
		formData.append("templateId", this.templateSelect.val());
		formData.append("contactListId", this.recipientSelect.val());

		const selectedAttributes = {};
		$(this.attributesForm)
			.find(".attribute-select")
			.each(function () {
				const variable = $(this).data("variable");
				selectedAttributes[variable] = $(this).val();
			});

		formData.append("variables", JSON.stringify(selectedAttributes));

		try {
			const response = await fetch("/api/campaigns", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();
			if (response.ok) {
				alert("Campaign created successfully!");
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch (error) {
			console.error("Error submitting campaign:", error);
			alert("An error occurred while creating the campaign.");
		}
	}
}

// Initialize the TemplateManager once the DOM is fully loaded
$(document).ready(() => {
	new TemplateManager();
	// JavaScript for toggling the button visibility and switch behavior
	const toggleSwitch = document.getElementById("toggleSwitch");
	const toggleKnob = document.getElementById("toggleKnob");
	const scheduleSection = document.getElementById("scheduleSection");
	const scheduleButton = document.getElementById("scheduleButton");
	const sendNowButton = document.getElementById("sendNowButton");

	let isScheduled = false;

	toggleSwitch.addEventListener("click", function () {
		isScheduled = !isScheduled;

		// Toggle the knob position
		if (isScheduled) {
			toggleKnob.classList.add("translate-x-full"); // Moves the knob to the right

			// Show the schedule section smoothly
			scheduleSection.classList.remove("max-h-0");
			scheduleSection.classList.add("max-h-[500px]");

			// Update button visibility
			scheduleButton.classList.remove("hidden");
			sendNowButton.classList.add("hidden");
		} else {
			toggleKnob.classList.remove("translate-x-full"); // Moves the knob back to the left

			// Hide the schedule section smoothly
			scheduleSection.classList.add("max-h-0");
			scheduleSection.classList.remove("max-h-[500px]");

			// Update button visibility
			scheduleButton.classList.add("hidden");
			sendNowButton.classList.remove("hidden");
		}
	});


	// Initialize Flatpickr
	flatpickr("#datePicker", {
		dateFormat: "d/m/Y",
		defaultDate: "01/01/2025",
		allowInput: true,
	});

	flatpickr("#timePicker", {
		enableTime: true,
		noCalendar: true,
		dateFormat: "h:i K",
		defaultDate: "13:00",
		allowInput: true,
	});
});

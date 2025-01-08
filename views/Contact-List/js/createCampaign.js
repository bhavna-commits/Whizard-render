// API service for handling data fetching
async function fetchTemplates() {
	const response = await fetch("/getCampaignTemplates");
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
		// console.log(template?.dynamicVariables);
		if (!template?.dynamicVariables || !contacts.length) {
			this.container.innerHTML =
				'<p class="text-center p-2 text-gray-500">No attributes available</p>';
			return;
		}

		const attributes = contacts[0]?.masterExtra || {};
		const options = this.generateAttributeOptions(Object.keys(attributes));

		console.log(template?.dynamicVariables);

		this.container.innerHTML = "";

		// Process HEADER dynamic variables
		this.container.innerHTML += template?.dynamicVariables?.header
			?.map((variableObj, index) => {
				const variableKey = Object.keys(variableObj)[0]; // Get the variable key, e.g., '1'
				return `
                <div class=" mt-3">
                    <label class="w-full">Variable: {${variableKey}}</label>
                    <select class="attribute-select w-full" data-variable="${variableKey}">
                        ${options
							.map(
								(opt) => `
                            <option value="${opt.value}">${opt.label}</option>
                        `,
							)
							.join("")}
                    </select>
                </div>
            `;
			})
			.join("");

		// Process BODY dynamic variables
		this.container.innerHTML += template?.dynamicVariables?.body
			?.map((variableObj, index) => {
				const variableKey = Object.keys(variableObj)[0]; // Get the variable key, e.g., '1'
				return `
                <div class=" mt-3">
                    <label class="w-full">Variable: {${variableKey}}</label>
                    <select class="attribute-select w-full" data-variable="${variableKey}">
                        ${options
							.map(
								(opt) => `
                            <option value="${opt.value}">${opt.label}</option>
                        `,
							)
							.join("")}
                    </select>
                </div>
            `;
			})
			.join("");

		// Process FOOTER dynamic variables
		this.container.innerHTML += template?.dynamicVariables?.footer
			?.map((variableObj, index) => {
				const variableKey = Object.keys(variableObj)[0]; // Get the variable key, e.g., '1'
				return `
                <div class=" mt-3">
                    <label class="w-full">Variable: {${variableKey}}</label>
                    <select class="attribute-select w-full" data-variable="${variableKey}">
                        ${options
							.map(
								(opt) => `
                            <option value="${opt.value}">${opt.label}</option>
                        `,
							)
							.join("")}
                    </select>
                </div>
            `;
			})
			.join("");

		// Initialize Select2 on new dropdowns
		$(this.container)
			.find(".attribute-select")
			.select2()
			.on("change", () => this.handleSelection());
	}

	generateAttributeOptions(attributes, includeUserName = true) {
		const options = includeUserName ? ["Name"] : [];
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

		// Extract components from the template
		const { components } = template;

		let headerContent = "";
		let bodyContent = "";
		let footerContent = "";
		let buttonContent = "";

		// Filter components for header, body, footer, and buttons
		components.forEach((component) => {
			if (component.type === "HEADER") {
				if (component.format === "IMAGE") {
					// Handle image format
					let fileUrl = component.example.header_handle[0].replace(
						/\\/g,
						"/",
					);

					// console.log(fileUrl);
					headerContent = `<img src="/${fileUrl}" alt="Header Image" class="custom-card-img">`;
				} else if (component.format === "VIDEO") {
					// Handle video format
					let fileUrl = component.example.header_handle[0].replace(
						/\\/g,
						"/",
					);
					const fileExtension = fileUrl
						.split(".")
						.pop()
						.toLowerCase();
					headerContent = `
                    <video controls class="custom-card-img">
                        <source src="/${fileUrl}" type="video/${fileExtension}">
                        Your browser does not support the video tag.
                    </video>
                `;
				} else if (component.format === "DOCUMENT") {
					// Handle document format (PDF, DOCX, etc.)
					let fileUrl = component.example.header_handle[0].replace(
						/\\/g,
						"/",
					);
					headerContent = `<a href="/${fileUrl}" target="_blank">Download Document</a>`;
				} else {
					headerContent = component.text || "";
				}
			} else if (component.type === "BODY") {
				bodyContent = component.text;
			} else if (component.type === "FOOTER") {
				footerContent = component.text;
				// console.log("fotter")
			} else if (component.type === "BUTTON") {
				const buttonText = component.text;
				const buttonUrl = component.example.header_handle[0];

				let buttonLabel = buttonText || "Click Here";
				if (buttonUrl && buttonUrl.startsWith("http")) {
					buttonContent += `
                    <button class="border-t w-full mt-2 pt-1 text-center me-2 text-base" onclick="window.open('${buttonUrl}', '_blank')" style="color: #6A67FF;">
                        <i class="fa fa-external-link mx-2"></i><span class="text-lg">${buttonLabel}</span>
                    </button>
                `;
				} else if (buttonUrl && buttonUrl.startsWith("tel:")) {
					const phoneNumber = buttonUrl.replace("tel:", "");
					buttonContent += `
                    <button class="border-t w-full mt-2 pt-1 text-center me-2 text-base" onclick="window.location.href='tel:${phoneNumber}'" style="color: #6A67FF;">
                        <i class="fa fa-phone mx-2"></i><span class="text-lg">${buttonLabel}</span>
                    </button>
                `;
				}
			}
		});
		// console.log("button", buttonContent);
		this.container.innerHTML = `
        ${
			headerContent
				? `<div class="header-container">${headerContent}</div>`
				: ""
		}
        <p class="text-lg py-2">${bodyContent.replace(/\n/g, "<br>")}</p>
        <p class="text-base text-gray-500 py-1">${footerContent.replace(
			/\n/g,
			"<br>",
		)}</p>
        <div>
            ${buttonContent}
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

			document
				.getElementById("sendNowButton")
				.addEventListener("click", (e) =>
					this.handleFormSubmit(e, "sendNow"),
				);
			document
				.getElementById("scheduleButton")
				.addEventListener("click", (e) =>
					this.handleFormSubmit(e, "schedule"),
				);

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

			templates.data.forEach((template) => {
				this.templateSelect.append(
					new Option(template.name, template.unique_id),
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
					new Option(list.contalistName, list.contactId),
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
			// console.log(this.currentContacts);
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

	
	convertDateFormat(dateString) {
		return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, "$2/$1/$3");
	}

	async handleFormSubmit(event, actionType) {
		event.preventDefault();

		// Get the target button
		const button = event.target;
		const loader = button.querySelector(".loader");
		const buttonText = button.querySelector(".button-text");

		// Disable the button and show the spinner
		button.disabled = true;
		loader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		// Create form data
		const formData = new FormData(this.campaignForm);
		formData.append("templateId", this.templateSelect.val());
		formData.append("contactListId", this.recipientSelect.val());
		formData.append("name", document.getElementById("campaign-name").value);

		// Check if scheduling or sending immediately
		if (actionType === "schedule") {
			const selectedDate = document.getElementById("datePicker").value;
			const selectedTime = document.getElementById("timePicker").value;

			// Make sure the user selected a valid date and time for scheduling
			if (selectedDate && selectedTime) {
				const convertedDateString =
					this.convertDateFormat(selectedDate);
				const dateTimeString = `${convertedDateString} ${selectedTime}`;
				const dateTime = new Date(dateTimeString);
				console.log(dateTime);
				if (!isNaN(dateTime.getTime())) {
					const unixTimestamp = Math.floor(dateTime.getTime() / 1000);
					formData.append("schedule", unixTimestamp); // Append the schedule timestamp
				} else {
					alert("Invalid date or time. Please check your selection.");
					resetButton(button, loader, buttonText);
					return;
				}
			} else {
				alert("Please select both date and time for scheduling.");
				resetButton(button, loader, buttonText);
				return;
			}
		} else if (actionType === "sendNow") {
			// If "Send Now" is clicked, make sure schedule is null
			formData.append("schedule", null);
		}

		// Add selected attributes to form data
		const selectedAttributes = {};
		$(this.attributesForm)
			.find(".attribute-select")
			.each(function () {
				const variable = $(this).data("variable");
				selectedAttributes[variable] = $(this).val();
			});

		if (Object.keys(selectedAttributes).length > 0) {
			formData.append("variables", JSON.stringify(selectedAttributes));
		}

		// Submit the form
		try {
			const response = await fetch("/api/contact-list/create-campaign", {
				method: "POST",
				body: formData,
			});

			const result = await response.json();
			if (response.ok) {
				alert("Campaign created successfully!");
				location.href = "/reports/campaign-list";
			} else {
				alert(`Error: ${result.message}`);
			}
		} catch (error) {
			console.error("Error submitting campaign:", error);
			alert("An error occurred while creating the campaign.");
		} finally {
			resetButton(button, loader, buttonText);
		}
	}

	// Helper function to reset button state after form submission
}
$(document).ready(() => {
	new TemplateManager();

	const toggleSwitch = document.getElementById("toggleSwitch");
	const toggleKnob = document.getElementById("toggleKnob");
	const scheduleSection = document.getElementById("scheduleSection");
	const scheduleButton = document.getElementById("scheduleButton");
	const sendNowButton = document.getElementById("sendNowButton");
	const date = document.getElementById("datePicker").value;

	console.log(date);

	let isScheduled = false;

	// Toggle function
	function toggleSwitchState() {
		isScheduled = !isScheduled;

		// Toggle the knob position
		if (isScheduled) {
			toggleKnob.style.transform = "translateX(100%)"; // Moves the knob to the right
			toggleSwitch.children[0].classList.replace(
				"bg-gray-300",
				"bg-red-300",
			); // Smooth background change

			// Show the schedule section smoothly
			scheduleSection.classList.remove("max-h-0");
			scheduleSection.classList.add("max-h-[500px]");

			// Update button visibility
			scheduleButton.classList.remove("hidden");
			sendNowButton.classList.add("hidden");
		} else {
			toggleKnob.style.transform = "translateX(0)"; // Moves the knob back to the left
			toggleSwitch.children[0].classList.replace(
				"bg-red-300",
				"bg-gray-300",
			); // Smooth background change

			// Hide the schedule section smoothly
			scheduleSection.classList.add("max-h-0");
			scheduleSection.classList.remove("max-h-[500px]");

			// Update button visibility
			scheduleButton.classList.add("hidden");
			sendNowButton.classList.remove("hidden");
		}
	}

	// Attach click event listener to the entire toggle switch container
	toggleSwitch.addEventListener("click", toggleSwitchState);

	// Initialize Flatpickr for date and time pickers
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
function resetButton(button, loader, buttonText) {
	button.disabled = false;
	loader.classList.add("hidden");
	buttonText.classList.remove("hidden");
}
function schedule() {}

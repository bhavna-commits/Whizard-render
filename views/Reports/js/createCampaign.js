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

	update(template) {
		// console.log(template?.dynamicVariables);
		if (!template?.dynamicVariables) {
			this.container.innerHTML =
				'<p class="text-center p-2 text-gray-500">No attributes available</p>';
			return;
		}

		// const attributes = contacts[0]?.masterExtra || {};
		const options = this.generateAttributeOptions(Object.keys(attributes));

		this.container.innerHTML = "";

		// Process BODY dynamic variables
		this.container.innerHTML += template?.dynamicVariables?.body
			?.map((variableObj, index) => {
				const variableKey = Object.keys(variableObj)[0]; // Get the variable key, e.g., '1'
				return `
                <div class=" mt-3">
                    <label class="w-full text-gray-400 border-gray-400">Attribute ${variableKey}</label>
                    <select class="attribute-select w-full text-gray-400" data-variable="${variableKey}">
						<option disabled selected>Select a value</option>
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

		let uploadSection = "";

		// Filter components for header, body, footer, and buttons
		components.forEach((component) => {
			if (
				component.type === "HEADER" &&
				["IMAGE", "VIDEO", "DOCUMENT"].includes(component.format)
			) {
				const fileUrl = component.example?.header_url
					?.split("/")
					.slice(3)
					.join("/");

				// Create dynamic label & accept types based on format
				let acceptType = "";
				let formatLabel = component.format.toLowerCase();
				if (formatLabel === "image") acceptType = "image/*";
				else if (formatLabel === "video") acceptType = "video/*";
				else acceptType = ".pdf,.doc,.docx,.xls,.txt,.xlsx,.ppt,.pptx";

				uploadSection = `
			<div class="my-4">
				<div class="flex items-center gap-8">
					<button class="px-3 py-1 border text-gray-700 rounded sample-btn" data-file="/${fileUrl}">Use Sample ${formatLabel}</button>
					<div class="upload-label px-3 py-1 bg-black text-white rounded cursor-pointer">
						Upload New ${formatLabel}
					</div>
					<input type="file" class="hidden upload-input" accept="${acceptType}" data-format="${component.format}" />
				</div>
			</div>
		`;
			}
			if (component.type === "HEADER") {
				if (component.format === "IMAGE") {
					// Handle image format
					let fileUrl = component.example?.header_url
						?.split("/")
						.slice(3)
						.join("/");

					// console.log(fileUrl);
					headerContent = `<img src="/${fileUrl}" alt="Header Image" class="custom-card-img max-h-96" />`;
				} else if (component.format === "VIDEO") {
					// Handle video format
					let fileUrl = component.example?.header_url
						?.split("/")
						.slice(3)
						.join("/");
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
					let fileUrl = component.example?.header_url
						?.split("/")
						.slice(3)
						.join("/");
					headerContent = `<iframe src="/${fileUrl}" class="max-w-full h-auto object-contain"></iframe>`;
				} else {
					headerContent = component.text || "";
				}
			} else if (component.type === "BODY") {
				bodyContent = template?.body_preview || component.text;
			} else if (component.type === "FOOTER") {
				footerContent = component.text;
				// console.log("fotter")
			} else if (component.type === "BUTTONS") {
				const buttonText = component.text;
				const buttons = component.buttons;

				buttons.forEach((button) => {
					if (button.type == "PHONE_NUMBER") {
						let buttonLabel = button.text;
						const buttonUrl = button.url;
						buttonContent += `
                    <button class="border-t w-full mt-2 pt-1 text-center me-2 text-base" onclick="window.open('${buttonUrl}', '_blank')" style="color: #6A67FF;">
                        <i class="fa fa-external-link mx-2"></i><span class="text-lg">${buttonLabel}</span>
                    </button>
                `;
					} else {
						let buttonLabel = button.text;
						const phoneNumber = button.phone_number;
						buttonContent += `
                    <button class="border-t w-full mt-2 pt-1 text-center me-2 text-base" onclick="window.location.href='tel:${phoneNumber}'" style="color: #6A67FF;">
                        <i class="fa fa-phone mx-2"></i><span class="text-lg">${buttonLabel}</span>
                    </button>
                `;
					}
				});
			}
		});

		//  Preview creation

		this.container.innerHTML = `
		${uploadSection}
		<div class="font-semibold text-lg uploaded-preview">
			${headerContent}
		</div>
		<p class="text-lg py-2">${bodyContent.replace(/\n/g, "<br>")}</p>
		<p class="text-base text-gray-500 py-1">${footerContent.replace(
			/\n/g,
			"<br>",
		)}</p>
		<div>${buttonContent}</div>
	`;

		// Upload new options

		const fileInput = this.container.querySelector(".upload-input");
		const sampleBtn = this.container.querySelector(".sample-btn");
		const previewDiv = this.container.querySelector(".uploaded-preview");

		const uploadTrigger = this.container.querySelector(".upload-label");
		const uploadInput = this.container.querySelector(".upload-input");

		uploadTrigger?.addEventListener("click", () => {
			uploadInput?.click();
		});

		if (fileInput) {
			fileInput.addEventListener("change", (e) => {
				const file = e.target.files?.[0];
				const format = e.target.dataset.format;

				if (!file || !format) return;

				// validate
				const { ok, message } = validateFileForFormat(file, format);
				if (!ok) {
					toast("error", message);
					e.target.value = ""; 
					selectedSource = null;
					selectedSamplePath = null;
					previewDiv.innerHTML = "";
					return;
				}

				// valid: mark as upload and show preview
				selectedSource = "upload";
				selectedSamplePath = null;

				const reader = new FileReader();
				reader.onload = function (event) {
					let previewHTML = "";
					const fileURL = event.target.result;

					if (format === "IMAGE") {
						previewHTML = `<img src="${fileURL}" class="custom-card-img max-h-96" />`;
					} else if (format === "VIDEO") {
						previewHTML = `
					<video controls class="custom-card-img">
						<source src="${fileURL}" type="${file.type}">
						Your browser does not support the video tag.
					</video>
				`;
					} else if (format === "DOCUMENT") {
						previewHTML = `<iframe src="${fileURL}" class="w-full h-[500px]"></iframe>`;
					}

					previewDiv.innerHTML = previewHTML;
				};

				reader.readAsDataURL(file); // Triggers reader.onload
			});
		}

		if (sampleBtn) {
			sampleBtn.addEventListener("click", (e) => {
				const filePath = e.target.dataset.file;
				const format = fileInput?.dataset.format;
				let previewHTML = "";

				// clear any uploaded file (so form won't send it)
				if (fileInput) fileInput.value = "";

				// mark sample selected
				selectedSource = "sample";
				selectedSamplePath = filePath;

				if (format === "IMAGE") {
					previewHTML = `<img src="${filePath}" class="custom-card-img max-h-96" />`;
				} else if (format === "VIDEO") {
					const fileExtension = filePath.split(".").pop();
					previewHTML = `
				<video controls class="custom-card-img">
					<source src="${filePath}" type="video/${fileExtension}">
					Your browser does not support the video tag.
				</video>
			`;
				} else if (format === "DOCUMENT") {
					previewHTML = `<iframe src="${filePath}" class="w-full h-[500px]"></iframe>`;
				}

				previewDiv.innerHTML = previewHTML;
			});
		}
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
			// this.recipientSelect
			// 	.select2()
			// 	.on("change", (e) => this.handleContactListChange(e));

			document
				.getElementById("campaign-form")
				.addEventListener("submit", async (e) => {
					e.preventDefault();

					const submitterButton = e.submitter; // This gets the clicked button

					const actionType = submitterButton.value; // Retrieve value of clicked button (schedule/sendNow)
					await this.handleFormSubmit(e, actionType, submitterButton);
				});
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
				.append(
					"<option disabled selected>Select a template...</option>",
				);

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
			// Clear the select and add a default disabled option.
			this.recipientSelect
				.empty()
				.append(
					'<option value="" disabled selected>List of recipients</option>',
				);

			// Loop through contactLists and add each option as disabled.
			contactLists.forEach((list) => {
				const option = new Option(
					list.contactName,
					list.recipientPhone,
				);
				option.disabled = true; // Disable this option.
				this.recipientSelect.append(option);
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
			// console.log(template);
			this.currentTemplate = template;
			this.preview.update(template);
			this.attributeManager.update(template, this.currentContacts);
		} catch (error) {
			console.error("Error loading template:", error);
		}
	}

	async handleContactListChange(event) {
		const contactListId = event.target.value;

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
		// console.log("Attributes selected:", variables);
	}

	convertDateFormat(dateString) {
		return dateString.replace(/(\d{2})\/(\d{2})\/(\d{4})/g, "$2/$1/$3");
	}

	async handleFormSubmit(event, actionType, button) {
		event.preventDefault();

		const loader = button.querySelector(".loader-submit");
		const buttonText = button.querySelector(".button-text");

		button.disabled = true;
		loader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		// FORM DATA FOR TESTING
		const testFormData = new FormData(this.campaignForm);
		testFormData.append("templateId", this.templateSelect.val());
		testFormData.append("contactListId", contactListId);
		testFormData.append(
			"name",
			document.getElementById("campaign-name").value,
		);
		testFormData.append("contactList", JSON.stringify(contactLists));
		testFormData.append("url", `https://${location.hostname}`);

		// FORM DATA FOR ACTUAL BROADCAST
		const formData = new FormData();
		formData.append("templateId", this.templateSelect.val());
		formData.append("contactListId", contactListId);
		formData.append("name", document.getElementById("campaign-name").value);
		formData.append("contactList", JSON.stringify(contactLists));

		const fileInput = document.querySelector(".upload-input");

		if (fileInput?.files?.length > 0) {
			const uploadedFile = fileInput.files[0];
			formData.append("headerFile", uploadedFile);
			testFormData.append("headerFile", uploadedFile);
		}

		// Handle schedule logic
		if (actionType === "schedule") {
			const selectedDate = document.getElementById("datePicker").value;
			const selectedTime = document.getElementById("timePicker").value;

			if (!selectedDate || !selectedTime) {
				toast(
					"info",
					"Please select both date and time for scheduling.",
				);
				resetButton(button, loader, buttonText);
				return;
			}

			const convertedDateString = this.convertDateFormat(selectedDate);
			const dateTime = new Date(`${convertedDateString} ${selectedTime}`);
			if (isNaN(dateTime.getTime())) {
				toast(
					"info",
					"Invalid date or time. Please check your selection.",
				);
				resetButton(button, loader, buttonText);
				return;
			}

			const unixTimestamp = Math.floor(dateTime.getTime() / 1000);
			formData.append("schedule", unixTimestamp);
			testFormData.append("schedule", unixTimestamp);
			testFormData.append("test", null);
		} else if (actionType === "sendNow") {
			formData.append("schedule", "");
			testFormData.append("schedule", "");
			testFormData.append("test", null);
		}

		// Validate attributes
		let isValid = true;
		const selectedAttributes = {};

		$(this.attributesForm)
			?.find(".attribute-select")
			?.each(function () {
				const variable = $(this).data("variable");
				const value = $(this).val();
				if (!value || value === "Select a value") {
					isValid = false;
					toast(
						"info",
						`Please select a value for variable: {${variable}}`,
					);
					resetButton(button, loader, buttonText);
					return false;
				}
				selectedAttributes[variable] = value;
			});

		if (!isValid) return;

		if (Object.keys(selectedAttributes).length > 0) {
			formData.append("variables", JSON.stringify(selectedAttributes));
			testFormData.append(
				"variables",
				JSON.stringify(selectedAttributes),
			);
		}

		// TEST MODE
		if (actionType === "test") {
			testFormData.set(
				"test",
				document.getElementById("testNumber").value,
			);

			try {
				const response = await fetch(
					"/api/contact-list/create-campaign",
					{
						method: "POST",
						body: testFormData,
					},
				);
				const result = await response.json();

				if (response.ok) {
					toast("success", "Test campaign sent successfully!");
				} else {
					toast("error", result.message);
				}
			} catch (error) {
				console.error("Test campaign error:", error);
				toast("error", error.message || "Test failed");
			} finally {
				resetButton(button, loader, buttonText);
			}
			return;
		}

		// REAL BROADCAST
		try {
			const response = await fetch("/api/reports/broadcast", {
				method: "POST",
				body: formData,
			});
			const result = await response.json();

			if (response.ok) {
				toast("success", "Campaign created successfully!");
				setTimeout(() => {
					location.href = "/reports/campaign-list";
				}, 1000);
			} else {
				toast("error", result.message);
			}
		} catch (error) {
			console.error("Broadcast campaign error:", error);
			toast("error", error.message || "Broadcast failed");
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

	// console.log(date);

	let isScheduled = false;

	let testError = document.getElementById("testError");
	const testButton = document.querySelector("button[value='test']");

	document
		.getElementById("testNumber")
		.addEventListener("input", function (e) {
			const phoneInput = e.target;
			let value = phoneInput.value;

			// Remove any non-numeric characters
			value = value.replace(/\D/g, "");

			// Update the input field with only numbers
			phoneInput.value = value;

			if (value.length == 0) {
				testError.classList.add("hidden");
			}
			if (value.length < 12 && value.length > 0) {
				testError.classList.remove("hidden");
				testButton.disabled = true;
				// testButton.classList.add(
				// 	"text-gray-400",
				// 	"border",
				// 	"hover:cursor-not-allowed",
				// 	"bg-white",
				// );
				// testButton.classList.remove("text-white", "bg-black");
			} else if (value.length < 11) {
				// console.log("ds");
				testButton.disabled = true;
				// testButton.classList.add(
				// 	"text-gray-400",
				// 	"border",
				// 	"hover:cursor-not-allowed",
				// 	"bg-white",
				// );
				// testButton.classList.remove("text-white", "bg-black");
			} else if (value.length > 11) {
				testButton.disabled = false;
				// testButton.classList.remove(
				// 	"text-[#959595]",
				// 	"border",
				// 	"hover:cursor-not-allowed",
				// 	"bg-white",
				// );
				// testButton.classList.add("text-white", "bg-black");
				testError.classList.add("hidden");
			} else {
				testError.classList.add("hidden");
			}
		});
	// Toggle function
	function toggleSwitchState() {
		isScheduled = !isScheduled;

		// Toggle the knob position
		// Toggle the knob position
		if (isScheduled) {
			toggleKnob.style.transform = "translateX(100%)"; // Moves the knob to the right
			toggleSwitch.children[0].classList.replace(
				"bg-gray-500",
				"bg-black",
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
				"bg-black",
				"bg-gray-500",
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
		defaultDate: "today",
		minDate: "today", 
		allowInput: true,
	});

	flatpickr("#timePicker", {
		enableTime: true,
		noCalendar: true,
		dateFormat: "h:i K",
		defaultDate: currentTime(),
		minTime: current24HourTime(),
		allowInput: true,
	});
});

function resetButton(button, loader, buttonText) {
	button.disabled = false;
	loader.classList.add("hidden");
	buttonText.classList.remove("hidden");
}

const currentTime = () => {
	const now = new Date();
	let hours = now.getHours();
	let minutes = now.getMinutes();

	// Format hours and minutes to be in "h:i K" format
	const isPM = hours >= 12;
	hours = hours % 12 || 12; // Convert 24-hour to 12-hour format
	minutes = minutes < 10 ? `0${minutes}` : minutes; // Add leading zero to minutes if needed
	const ampm = isPM ? "PM" : "AM";

	return `${hours}:${minutes} ${ampm}`;
};

const current24HourTime = () => {
	const now = new Date();
	let hours = now.getHours();
	let minutes = now.getMinutes();

	// Format hours and minutes to be in "H:i" format (24-hour format)
	minutes = minutes < 10 ? `0${minutes}` : minutes; // Add leading zero to minutes if needed

	return `${hours}:${minutes}`;
};

function bytesToMB(bytes) {
	return +(bytes / (1024 * 1024)).toFixed(2);
}

function validateFileForFormat(file, format) {
	const ext = (file.name.split(".").pop() || "").toLowerCase();
	const mime = (file.type || "").toLowerCase();
	const size = file.size;

	const rules = {
		IMAGE: {
			exts: ["jpeg", "jpg", "png"],
			mimes: ["image/jpeg", "image/png"],
			maxBytes: 5 * 1024 * 1024, // 5 MB
		},
		VIDEO: {
			exts: ["mp4", "3gp"],
			mimes: ["video/mp4", "video/3gpp"],
			maxBytes: 16 * 1024 * 1024, // 16 MB
		},
		DOCUMENT: {
			exts: [
				"txt",
				"xls",
				"xlsx",
				"doc",
				"docx",
				"ppt",
				"pptx",
				"pdf",
			],
			mimes: [
				"text/plain",
				"application/vnd.ms-excel",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"application/vnd.ms-powerpoint",
				"application/vnd.openxmlformats-officedocument.presentationml.presentation",
				"application/pdf",
			],
			maxBytes: 100 * 1024 * 1024, // 100 MB
		},
	};

	const cfg = rules[format];
	if (!cfg)
		return { ok: false, message: `Unsupported format: ${format}` };

	// Prefer extension check (file.type can be empty or unreliable in some browsers)
	const extOk = cfg.exts.includes(ext);
	const mimeOk =
		cfg.mimes.length === 0 ? true : cfg.mimes.includes(mime);

	if (!extOk && !mimeOk) {
		return {
			ok: false,
			message: `Invalid file type. Allowed extensions: ${cfg.exts.join(
				", ",
			)}.`,
		};
	}

	if (size > cfg.maxBytes) {
		return {
			ok: false,
			message: `File too large (${bytesToMB(
				size,
			)} MB). Max ${bytesToMB(cfg.maxBytes)} MB allowed.`,
		};
	}

	return { ok: true };
}
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

		const { header, body, footer, buttons, image } = template;

		this.container.innerHTML = `
            <img src="${
				image ||
				"https://media.licdn.com/dms/image/v2/C560BAQGeY0JtR6JxpA/company-logo_200_200/company-logo_200_200/0/1630588885858?e=2147483647&v=beta&t=dMDDABvAomoeydN01wwlKcuEwws2PVsP8YGCfUIShcI"
			}" 
                 alt="Card Image" 
                 class="custom-card-img">
            <h5 class="custom-card-title">${header?.content || "Header"}</h5>
            <p class="custom-card-subtitle">${body || "Body"}</p>
            <p>${footer || "Footer"}</p>
            <div>
                ${(buttons || [])
					.map(
						(button) => `
                    <a href="#" class="custom-btn">
                        <i class="${
							button.icon || "fas fa-external-link-alt"
						}"></i> ${button.text}
                    </a>
                `,
					)
					.join("")}
            </div>
        `;
	}
}

class AttributeManager {
	constructor(container, onAttributeChange) {
		this.container = container;
		this.onAttributeChange = onAttributeChange;
	}

	update(template, contacts) {
		if (!template?.dynamicVariables || !contacts.length) {
			this.container.innerHTML =
				'<p class="text-center text-gray-500">No attributes available</p>';
			return;
		}

		const attributes = contacts[0]?.additionalAttributes || {};
		const options = this.generateAttributeOptions(Object.keys(attributes));

		this.container.innerHTML = template.dynamicVariables
			.map(
				(variable) => `
                <div class="form-group mt-3">
                    <label>Variable: {${variable}}</label>
                    <select class="full-width select2-hidden-accessible" data-variable="${variable}">
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

		this.setupEventListeners();

		// Initialize Select2 on new dropdowns
		$(this.container).find("select").select2();
	}

	generateAttributeOptions(attributes, includeUserName = true) {
		const options = includeUserName ? ["userName"] : [];
		return [...options, ...attributes].map((attr) => ({
			value: attr,
			label: attr.charAt(0).toUpperCase() + attr.slice(1),
		}));
	}

	setupEventListeners() {
		this.container.querySelectorAll("select").forEach((select) => {
			select.addEventListener("change", () => this.handleSelection());
		});
	}

	handleSelection() {
		const variables = {};
		this.container.querySelectorAll("select").forEach((select) => {
			const variable = select.dataset.variable;
			variables[variable] = select.value;
		});

		this.onAttributeChange(variables);
	}
}

class TemplateManager {
	constructor() {
		// Initialize DOM elements with new IDs
		this.templateSelect = document.getElementById("template-select");
		this.recipientSelect = document.getElementById("recipient-select");
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

		// Bind methods
		this.handleTemplateChange = this.handleTemplateChange.bind(this);
		this.handleContactListChange = this.handleContactListChange.bind(this);
		this.handleFormSubmit = this.handleFormSubmit.bind(this);

		this.init();
	}

	async init() {
		try {
			await Promise.all([this.loadTemplates(), this.loadContactLists()]);
			this.setupEventListeners();

			// Initialize Select2 on the dropdowns
			$(this.templateSelect).select2();
			$(this.recipientSelect).select2();
		} catch (error) {
			console.error("Error initializing:", error);
		}
	}

	async loadTemplates() {
		try {
			const templates = await fetchTemplates();
			this.templateSelect.innerHTML = `
                <option value="">Select a template...</option>
                ${templates
					.map(
						(template) =>
							`<option value="${template._id}">${template.templateName}</option>`,
					)
					.join("")}
            `;
		} catch (error) {
			console.error("Error loading templates:", error);
		}
	}

	async loadContactLists() {
		try {
			const contactLists = await fetchContactLists();
			this.recipientSelect.innerHTML = `
                <option value="">Select recipients...</option>
                ${contactLists
					.map(
						(list) =>
							`<option value="${list._id}">${list.ContactListName}</option>`,
					)
					.join("")}
            `;
		} catch (error) {
			console.error("Error loading contact lists:", error);
		}
	}

	setupEventListeners() {
		this.templateSelect.addEventListener(
			"change",
			this.handleTemplateChange,
		);
		this.recipientSelect.addEventListener(
			"change",
			this.handleContactListChange,
		);
		this.campaignForm.addEventListener("submit", this.handleFormSubmit);
	}

	async handleTemplateChange() {
		const templateId = this.templateSelect.value;
		console.log("Template changed:", templateId);

		if (!templateId) {
			this.currentTemplate = null;
			this.preview.update(null);
			return;
		}

		try {
			const { template } = await fetchTemplateById(templateId);
			this.currentTemplate = template;
			this.preview.update(template);
			this.attributeManager.update(template, this.currentContacts);
		} catch (error) {
			console.error("Error loading template:", error);
		}
	}

	async handleContactListChange() {
		const contactListId = this.recipientSelect.value;
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
		if (!this.currentTemplate) return;

		const updatedTemplate = {
			...this.currentTemplate,
			header: {
				content: this.replaceTemplateVariables(
					this.currentTemplate.header?.content || "",
					variables,
				),
			},
			body: this.replaceTemplateVariables(
				this.currentTemplate.body || "",
				variables,
			),
			footer: this.replaceTemplateVariables(
				this.currentTemplate.footer || "",
				variables,
			),
		};

		this.currentTemplate = updatedTemplate;
		this.preview.update(updatedTemplate);
	}

	replaceTemplateVariables(content, variables) {
		return content.replace(
			/\{(\w+)\}/g,
			(match, key) => variables[key] || match,
		);
	}

	handleFormSubmit(event) {
		event.preventDefault();
		const campaignName = document.getElementById("campaign-name").value;
		const templateId = this.templateSelect.value;
		const recipientListId = this.recipientSelect.value;

		if (!campaignName || !templateId || !recipientListId) {
			alert("Please fill in all required fields");
			return;
		}

		// Here you can add the logic to submit the campaign
		console.log("Submitting campaign:", {
			campaignName,
			templateId,
			recipientListId,
		});
	}
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	new TemplateManager();
});

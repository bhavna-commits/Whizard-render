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
            this.container.innerHTML = '<p class="text-center text-gray-500">Select a template to preview</p>';
            return;
        }

        const { header, body, footer, buttons, image } = template;
        
        this.container.innerHTML = `
            <img src="${image || 'https://media.licdn.com/dms/image/v2/C560BAQGeY0JtR6JxpA/company-logo_200_200/company-logo_200_200/0/1630588885858?e=2147483647&v=beta&t=dMDDABvAomoeydN01wwlKcuEwws2PVsP8YGCfUIShcI'}" 
                 alt="Card Image" 
                 class="custom-card-img">
            <h5 class="custom-card-title">${header?.content || 'Header'}</h5>
            <p class="custom-card-subtitle">${body || 'Body'}</p>
            <p>${footer || 'Footer'}</p>
            <div>
                ${(buttons || []).map(button => `
                    <a href="#" class="custom-btn">
                        <i class="${button.icon || 'fas fa-external-link-alt'}"></i> ${button.text}
                    </a>
                `).join('')}
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
            this.container.innerHTML = '<p class="text-center text-gray-500">No attributes available</p>';
            return;
        }

        const attributes = contacts[0]?.additionalAttributes || {};
        const options = this.generateAttributeOptions(Object.keys(attributes));

        this.container.innerHTML = template.dynamicVariables
            .map(variable => `
                <div class="form-group mt-3">
                    <label>Variable: {${variable}}</label>
                    <select class="attribute-select" data-variable="${variable}">
                        ${options.map(opt => `
                            <option value="${opt.value}">${opt.label}</option>
                        `).join('')}
                    </select>
                </div>
            `).join('');

        // Initialize Select2 on new dropdowns
        $(this.container).find('.attribute-select').select2().on('change', () => this.handleSelection());
    }

    generateAttributeOptions(attributes, includeUserName = true) {
        const options = includeUserName ? ['userName'] : [];
        return [...options, ...attributes].map(attr => ({
            value: attr,
            label: attr.charAt(0).toUpperCase() + attr.slice(1)
        }));
    }

    handleSelection() {
        const variables = {};
        $(this.container).find('.attribute-select').each(function() {
            const variable = $(this).data('variable');
            variables[variable] = $(this).val();
        });

        this.onAttributeChange(variables);
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

			console.log("Initialization complete");
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
		// Handle attribute selection here, e.g., update the campaign with the selected variables
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
});



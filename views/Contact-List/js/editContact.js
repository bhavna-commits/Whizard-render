// Function to open the edit modal and populate fields

function openEditModal(contactData) {
	const contact = JSON.parse(contactData);
	// console.log(contact);
	// Set the existing fields
	document.getElementById("edit-contact-id").value = contact.keyId;
	document.getElementById("edit-contact-name").value = contact.Name;
	document.getElementById("edit-contact-whatsapp").value = contact.wa_id;
	document.getElementById("edit-contact-tags").value = contact.tags;

	// Get the form container
	const dynamicFieldsContainer = document.getElementById(
		"dynamicFieldsContainer",
	);
	// Loop through contact object and dynamically create form fields for other keys
	Object.keys(contact.masterExtra).forEach((key) => {
		// Check if the field already exists (in case the form is opened multiple times)
		if (!document.getElementById(`edit-contact-${key}`)) {
			// Create a new form group div
			const formGroup = document.createElement("div");
			formGroup.classList.add("form-group");

			// Create a label for the new input field
			const label = document.createElement("label");
			label.setAttribute("for", `edit-contact-${key}`);
			label.textContent = key.charAt(0).toUpperCase() + key.slice(1);

			// Create a new input field
			const input = document.createElement("input");
			input.setAttribute("type", "text");
			input.setAttribute("id", `edit-contact-${key}`);
			input.setAttribute("name", `masterExtra.${key}`);
			input.setAttribute("class", "date-input");
			input.value = contact.masterExtra[key];

			// Append label and input to form group
			formGroup.appendChild(label);
			formGroup.appendChild(input);

			// Append the form group to the form
			dynamicFieldsContainer.appendChild(formGroup);
		}
	});

	// Show the sidebar and overlay
	document.getElementById("editContactSidebar").classList.add("open");
	document.getElementById("editContactOverlay").classList.add("active");
}

// Function to close the Edit Contact sidebar
function closeEditContact() {
	document.getElementById("editContactSidebar").classList.remove("open");
	document.getElementById("editContactOverlay").classList.remove("active");
}
document
	.getElementById("editContactOverlay")
	.addEventListener("click", closeEditContact);

// Handle the form submission for editing a contact
document
	.getElementById("editContactForm")
	.addEventListener("submit", function (event) {
		event.preventDefault();

		const contactId = document.getElementById("edit-contact-id").value;
		let formData = new FormData(this);

		const saveButton = this.querySelector("button[type='submit']");
		const originalButtonText = saveButton.innerHTML;
		saveButton.disabled = true; // Disable button
		saveButton.innerHTML =
			'<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';

		// Perform the PUT request to update the contact
		fetch(`/api/contact-list/contacts/${contactId}`, {
			method: "PUT",
			body: formData,
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					location.reload();
				} else {
					// Show error message near the save button
					saveButton.innerHTML = originalButtonText; // Reset button text
					saveButton.disabled = false;
					const errorMessage = document.createElement("div");
					errorMessage.className = "text-danger mt-2";
					errorMessage.innerText =
						"Error updating contact: " + data.message;
					saveButton.parentNode.appendChild(errorMessage);
				}
			})
			.catch((err) => {
				// Handle any network or other errors
				console.error("Error:", err);
				saveButton.innerHTML = originalButtonText; // Reset button text
				saveButton.disabled = false;
				const errorMessage = document.createElement("div");
				errorMessage.className = "text-danger mt-2";
				errorMessage.innerText = "An error occurred. Please try again.";
				saveButton.parentNode.appendChild(errorMessage);
			});
	});

// Handle the delete confirmation button click
function openDeleteModal(id) {
	// Show the confirmation modal
	const deleteModal = new bootstrap.Modal(
		document.getElementById("deleteModal"),
	);
	deleteModal.show();

	// Get the confirmation button element
	const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

	// Handle the confirmation button click
	confirmDeleteBtn.onclick = function () {
		// Proceed with the deletion
		fetch(`/api/contact-list/contacts/${id}`, {
			method: "DELETE",
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					deleteModal.hide(); // Hide the modal after successful deletion
					location.reload(); // Reload the page after deletion
				} else {
					alert("Error deleting contact: " + data.message);
				}
			})
			.catch((err) => console.error("Error:", err));
	};
}

function closeDeleteContact() {
	const deleteModal = new bootstrap.Modal(
		document.getElementById("deleteModal"),
	);
	deleteModal.hide();
}

// Assuming these elements are defined
const contactListInput = document.getElementById("contactListName");
const saveChangesBtn = document.getElementById("saveChangesBtn");
let originalValue = contactListInput.value;

contactListInput.addEventListener("input", function () {
	if (contactListInput.value !== originalValue) {
		// Enable the button and change styling
		saveChangesBtn.disabled = false;
		saveChangesBtn.classList.remove("opacity-50", "cursor-not-allowed");
		saveChangesBtn.classList.add("hover:bg-gray-100");
	} else {
		// Disable the button and change styling back
		saveChangesBtn.disabled = true;
		saveChangesBtn.classList.add("opacity-50", "cursor-not-allowed");
		saveChangesBtn.classList.remove("hover:bg-gray-100");
	}
});

// Handle the Save Changes button click to send the updated data to the backend
saveChangesBtn.addEventListener("click", function () {
	const updatedValue = contactListInput.value;
	// Extract the contact list ID from the URL
	const contactListId = window.location.pathname.split("/").pop();
	// Send the updated value to the backend, including the contact list ID from the URL
	fetch(`/api/contact-list/${contactListId}/updateName`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ updatedValue }), // Send the updated value and contact list ID
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.success) {
				alert("Changes saved successfully!");
				originalValue = updatedValue; // Update the original value
				saveChangesBtn.disabled = true;
				saveChangesBtn.classList.add(
					"opacity-50",
					"cursor-not-allowed",
				);
				saveChangesBtn.classList.remove("hover:bg-gray-100");
			} else {
				alert("Error saving changes: " + data.message);
			}
		})
		.catch((err) => {
			console.error("Error:", err);
			alert("An error occurred. Please try again.");
		});
});

function openAddContact() {
	document.getElementById("addContactSidebar").classList.add("open");
	document.getElementById("overlay").classList.add("active");
}

function closeAddContact() {
	document.getElementById("addContactSidebar").classList.remove("open");
	document.getElementById("overlay").classList.remove("active");
}

// Form submission logic here


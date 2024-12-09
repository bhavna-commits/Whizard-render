// Function to open the edit modal and populate fields
function openEditModal(contactData) {
	const contact = JSON.parse(contactData);

	// Populate fields with contact data
	document.getElementById("edit-contact-id").value = contact._id;
	document.getElementById("edit-contact-name").value = contact.userName;
	console.log(document.getElementById("edit-contact-id").value);
	// Set the value for the tags dropdown based on the contact data
	const tagsDropdown = document.getElementById("edit-contact-tags");
	tagsDropdown.value = contact.tags;

	// Mask WhatsApp number initially
	document.getElementById("edit-contact-whatsapp").value = "XXXXXXXXXX";

	// Show the edit modal
	$("#editModal").modal("show");

	// Remove any existing event listener to avoid duplication and infinite alerts
	const whatsappInput = document.getElementById("edit-contact-whatsapp");
	whatsappInput.removeEventListener("focus", handleWhatsAppPrivacyWarning); // Prevent re-adding

	// Add a single event listener to handle WhatsApp privacy warning
	whatsappInput.addEventListener(
		"focus",
		handleWhatsAppPrivacyWarning.bind(null, contact.whatsApp),
		{ once: true },
	);
}

function handleWhatsAppPrivacyWarning(whatsAppNumber) {
	const confirmReveal = confirm(
		"For privacy reasons, WhatsApp numbers are hidden. Do you want to reveal this number?",
	);
	if (confirmReveal) {
		document.getElementById("edit-contact-whatsapp").value = whatsAppNumber; // Reveal the WhatsApp number
	}
}

// Function to open the Delete Contact modal and confirm the deletion
function openDeleteModal(contactId, contactListName) {
	// Set the contact ID in the delete confirmation modal
	document.getElementById("delete-contact-id").value = contactId;

	// Show the modal (Bootstrap modal)
	const deleteModal = new bootstrap.Modal(
		document.getElementById("deleteModal"),
	);
	deleteModal.show();
}

// Handle the form submission for editing a contact
document
	.getElementById("editContactForm")
	.addEventListener("submit", function (event) {
		event.preventDefault(); // Prevent default form submission

		const contactId = document.getElementById("edit-contact-id").value;
		const originalWhatsApp = document.getElementById(
			"edit-contact-whatsapp",
		).dataset.originalValue; // Store original value
		let formData = new FormData(this);

		// Check if the user has revealed and edited the WhatsApp number
		const updatedWhatsApp = document.getElementById(
			"edit-contact-whatsapp",
		).value;
		if (updatedWhatsApp === "XXXXXXXXXX") {
			// If the number was not revealed or changed, remove it from formData
			formData.delete("validated");
		} else if (updatedWhatsApp === originalWhatsApp) {
			// If the number matches the original, also don't update it
			formData.delete("validated");
		}

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
					// Close the modal after 0.5 seconds
					setTimeout(() => {
						// Use new bootstrap.Modal to get the modal instance
						const editModalElement =
							document.getElementById("editModal");
						const editModal = new bootstrap.Modal(editModalElement);
						editModal.hide();

						location.reload(); // Reload page after closing the modal
					}, 500);
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

function showPhoneNumber() {
	const phoneInput = document.getElementById("edit-contact-whatsapp");
	const phoneNumber = phoneInput.dataset.originalValue; // Get the original phone number

	if (phoneInput.readOnly) {
		// If the input is read-only, prompt the user to reveal the phone number
		const showNumber = confirm("Do you want to reveal the phone number?");
		if (showNumber) {
			// Set the input as editable and show the real phone number
			phoneInput.readOnly = false;
			phoneInput.value = phoneNumber;
		}
	} else {
		// If the input is editable, prevent it from being asked again
		phoneInput.readOnly = true;
		phoneInput.value = "XXXXXXXXXX"; // Mask the phone number again
	}
}

// Handle the delete confirmation button click
document
	.getElementById("confirmDeleteBtn")
	.addEventListener("click", function () {
		const contactId = document.getElementById("delete-contact-id").value;

		// Perform the DELETE request to remove the contact
		fetch(`/api/contact-list/contacts/${contactId}`, {
			method: "DELETE",
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					// For Bootstrap 5
					const deleteModal = new bootstrap.Modal(
						document.getElementById("deleteModal"),
					);
					deleteModal.hide(); // Hide the modal after successful deletion

					location.reload(); // Reload page after closing the modal
				} else {
					alert("Error deleting contact: " + data.message);
				}
			})
			.catch((err) => console.error("Error:", err));
	});

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

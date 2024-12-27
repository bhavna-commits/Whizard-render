// Function to open the edit modal and populate fields

function openEditModal(contactData) {
	const contact = JSON.parse(contactData);
	// console.log(contact);
	// Populate fields with contact data
	document.getElementById("edit-contact-id").value = contact.keyId;
	// 
	// console.log(contact.Name);
	document.getElementById("edit-contact-name").value = contact.Name;
	console.log(document.getElementById("edit-contact-name").value);
	document.getElementById("edit-contact-whatsapp").value = contact.wa_id;

	// Set the value for the tags dropdown based on the contact data
	const tagsDropdown = document.getElementById("edit-contact-tags");
	tagsDropdown.value = contact.tags;

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
		event.preventDefault(); // Prevent default form submission

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
					// Close the modal after 0.5 seconds
					setTimeout(() => {
						closeEditContact();
						location.reload(); // Reload page after closing the sidebar
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
document
	.getElementById("addContactForm")
	.addEventListener("submit", function (event) {
		event.preventDefault();

		// Collect form data
		const name = document.getElementById("contactName").value;
		const number = document.getElementById("contactNumber").value;
		// const tags = document.getElementById("contactTags").value;

		// Perform backend call to add the new contact here
		// For now, just close the sidebar
		closeAddContact();

		// You can reset the form or provide feedback to the user
		document.getElementById("addContactForm").reset();
	});

function openEditModal(contact) {
	console.log(contact);
	const editModal = document.getElementById("editContactModal");
	const modalContent = editModal.querySelector(".bg-white");

	document.getElementById("editCountryCode").value = contact.countryCode;
	document.getElementById("editWhatsAppNumber").value = contact.whatsApp;
	document.getElementById("editCity").value = contact.cityId;
	document.getElementById("editUserName").value = contact.userName;

	// Show modal
	editModal.classList.remove("pointer-events-none", "opacity-0");
	modalContent.classList.remove("scale-95");
	modalContent.classList.add("scale-100");
}

// Function to close the modal
function hideEditModal() {
	const editModal = document.getElementById("editContactModal");
	const modalContent = editModal.querySelector(".bg-white");

	// Start fade out animation
	editModal.classList.add("opacity-0");
	modalContent.classList.remove("scale-100");
	modalContent.classList.add("scale-95");

	setTimeout(() => {
		editModal.classList.add("pointer-events-none");
	}, 300);
}

// Submit form for contact edit
document
	.getElementById("editContactForm")
	.addEventListener("submit", function (e) {
		e.preventDefault();

		const formData = {
			countryCode: document.getElementById("editCountryCode").value,
			whatsApp: document.getElementById("editWhatsAppNumber").value,
			cityId: document.getElementById("editCity").value,
			userName: document.getElementById("editUserName").value,
		};

		fetch("/api/contacts/update", {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(formData),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					hideEditModal();
					window.location.reload();
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	});

// Function to open delete modal
// Open Delete Modal
function openDeleteModal(contactId, contactName) {
	console.log(contactId, contactName); // For debugging
	// Set the contact name in the modal
	document.getElementById("deleteContactName").textContent = contactName;
	// Set the contactId in the hidden input field
	document.getElementById("deleteContactId").value = contactId;

	// Show the modal
	const deleteModal = new bootstrap.Modal(
		document.getElementById("deleteModal"),
	);
	deleteModal.show();

	// Add event listener to the "Cancel" button to dismiss the modal
	document
		.getElementById("cancelDeleteBtn")
		.addEventListener("click", function () {
			deleteModal.hide(); // Manually hide the modal
		});

	// Get the "Delete" button
	const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");

	// Add event listener to the delete button
	confirmDeleteBtn.onclick = function () {
		// Proceed with the deletion
		fetch(`/api/contact-list/deleteList/${contactId}`, {
			method: "DELETE",
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					deleteModal.hide(); // Hide the modal after successful deletion
					window.location.reload(); // Reload the page
				} else {
					alert("Error deleting contact: " + data.message);
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	};
}


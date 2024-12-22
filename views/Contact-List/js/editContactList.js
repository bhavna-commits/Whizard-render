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

// Close modal when clicking the close button
document
	.querySelector(".edit-modal-close-btn")
	.addEventListener("click", hideEditModal);

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
function openDeleteModal(contactId, contactName) {
	console.log(contactId, contactName);
	document.getElementById("deleteContactId").value = contactId;
	document.getElementById("deleteContactName").textContent = contactName;
	new bootstrap.Modal(document.getElementById("deleteModal")).show();
}

// Submit form for contact delete
document
	.getElementById("deleteContactForm")
	.addEventListener("submit", function (e) {
		e.preventDefault();

		const contactId = document.getElementById("deleteContactId").value;

		fetch(`/api/contact-list/deleteList/${contactId}`, {
			method: "DELETE",
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					window.location.reload();
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	});

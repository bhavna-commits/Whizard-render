// Function to open Edit Modal and populate it with data
function openEditModal(contactData) {
	const contact = JSON.parse(contactData);
	const editModal = document.getElementById("editContactModal");
	const modalContent = editModal.querySelector(".bg-white");

	// Populate form fields
	document.getElementById("editCountryCode").value = contact.countryCode;
	document.getElementById("editWhatsAppNumber").value = contact.whatsApp;
	document.getElementById("editCity").value = contact.cityId;
	document.getElementById("editUserName").value = contact.userName;

	// Show modal
	editModal.classList.remove("pointer-events-none");
	editModal.classList.add("opacity-100");
	modalContent.classList.remove("scale-95");
	modalContent.classList.add("scale-100");
}

// Function to close the modal
function hideEditModal() {
	const editModal = document.getElementById("editContactModal");
	const modalContent = editModal.querySelector(".bg-white");

	// Start fade out animation
	editModal.classList.remove("opacity-100");
	modalContent.classList.remove("scale-100");
	modalContent.classList.add("scale-95");

	// Wait for animation to finish before hiding completely
	setTimeout(() => {
		editModal.classList.add("pointer-events-none");
	}, 300);
}

// Close modal when clicking the close button
const closeBtn = document.querySelector(".edit-modal-close-btn");
if (closeBtn) {
	closeBtn.addEventListener("click", function () {
		hideEditModal();
	});
}

// Close modal when clicking outside of the modal content
const editModal = document.getElementById("editContactModal");
if (editModal) {
	editModal.addEventListener("click", function (event) {
		const modalContent = editModal.querySelector(".bg-white");
		if (!modalContent.contains(event.target)) {
			hideEditModal();
		}
	});
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

		// Send the updated contact data to the backend
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
					window.location.reload(); // Reload the page to reflect changes
				}
			})
			.catch((error) => {
				console.error("Error:", error);
			});
	});

const editModal = document.getElementById("editContactModal");
const modalContent = editModal.querySelector(".bg-white");
const editButtons = document.querySelectorAll(".edit-contact-btn");
const closeBtn = editModal.querySelector(".close");
const editContactForm = document.getElementById("editContactForm");

function showModal() {
	// First make the modal visible but transparent
	editModal.classList.remove("pointer-events-none");
	// Trigger reflow
	editModal.offsetHeight;
	// Add opacity and scale
	editModal.classList.add("opacity-100");
	modalContent.classList.remove("scale-95");
	modalContent.classList.add("scale-100");
}

function hideModal() {
	// Start fade out animation
	editModal.classList.remove("opacity-100");
	modalContent.classList.remove("scale-100");
	modalContent.classList.add("scale-95");
	// Wait for animation to finish before hiding completely
	setTimeout(() => {
		editModal.classList.add("pointer-events-none");
	}, 300);
}

// Show modal and populate form
editButtons.forEach((button) => {
	button.addEventListener("click", function () {
		const contactData = JSON.parse(this.dataset.contact);

		// Populate form fields
		document.getElementById("editCountryCode").value =
			contactData.countryCode;
		document.getElementById("editWhatsAppNumber").value =
			contactData.whatsappNumber;
		document.getElementById("editCity").value = contactData.cityId;
		document.getElementById("editUserName").value = contactData.userName;

		// Show modal
		showModal();
	});
});

// Close modal
closeBtn.addEventListener("click", hideModal);

// Close modal when clicking outside
editModal.addEventListener("click", function (event) {
	if (
		event.target === editModal ||
		event.target === editModal.firstElementChild
	) {
		hideModal();
	}
});

// Handle form submission
editContactForm.addEventListener("submit", function (e) {
	e.preventDefault();

	const formData = {
		countryCode: document.getElementById("editCountryCode").value,
		whatsappNumber: document.getElementById("editWhatsAppNumber").value,
		cityId: document.getElementById("editCity").value,
		userName: document.getElementById("editUserName").value,
	};

	// Send to your backend endpoint
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
				hideModal();
				// Refresh the contact list or update the row
				window.location.reload();
			}
		})
		.catch((error) => {
			console.error("Error:", error);
		});
});

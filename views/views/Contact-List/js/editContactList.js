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
	let url = location.pathname;
	url = url
		.split("/")
		.filter((i) => i)
		.pop();

	if (url === "archive") {
		toastConfirm(
			`Are you sure you want to un-archive list ${contactName}?`,
			"Un-archive",
		).then((confirmation) => {
			if (confirmation) {
				fetch(`/api/contact-list/deleteList/${contactId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ archive: false }),
				})
					.then((response) => response.json())
					.then((data) => {
						if (data.success) {
							toast(
								"success",
								`Contact ${contactName} un-archived successfully`,
							);
							window.location.reload();
						} else {
							toast("error", data.message);
						}
					})
					.catch((error) => {
						console.error("Error:", error);
						toast("error", error);
					});
			}
			// If the user clicked "Cancel" or outside the modal, do nothing
		});
	} else {
		toastConfirm(
			`Are you sure you want to archive list ${contactName}?`,
			"Archive",
		).then((confirmation) => {
			if (confirmation) {
				// If the user confirmed "Delete"
				fetch(`/api/contact-list/deleteList/${contactId}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ archive: true }),
				})
					.then((response) => response.json())
					.then((data) => {
						if (data.success) {
							toast(
								"success",
								`Contact ${contactName} archived successfully`,
							);
							window.location.reload();
						} else {
							toast("error", data.message);
						}
					})
					.catch((error) => {
						console.error("Error:", error);
						toast("error", error);
					});
			}
			// If the user clicked "Cancel" or outside the modal, do nothing
		});
	}
}

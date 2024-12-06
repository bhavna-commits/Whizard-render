document.addEventListener("DOMContentLoaded", function () {
	const modal = document.getElementById("campaignModal");
	const modalContent = modal.querySelector(".bg-white");
	const showModalBtn = document.getElementById("create-List");
	const closeBtn = modal.querySelector(".close");
	const contactListForm = document.getElementById("contactListForm");
	const downloadBtn = document.getElementById("downloadTemplate");
	const fileInput = document.getElementById("contactFile");

	function showModal() {
		// First make the modal visible but transparent
		modal.classList.remove("pointer-events-none");
		// Trigger reflow
		modal.offsetHeight;
		// Add opacity and scale
		modal.classList.add("opacity-100");
		modalContent.classList.remove("scale-95");
		modalContent.classList.add("scale-100");
	}

	function hideModal() {
		// Start fade out animation
		modal.classList.remove("opacity-100");
		modalContent.classList.remove("scale-100");
		modalContent.classList.add("scale-95");
		// Wait for animation to finish before hiding completely
		setTimeout(() => {
			modal.classList.add("pointer-events-none");
		}, 300);
	}

	// Show modal
	showModalBtn.addEventListener("click", showModal);

	// Close modal
	closeBtn.addEventListener("click", hideModal);

	// Close modal when clicking outside
	modal.addEventListener("click", function (event) {
		if (
			event.target === modal ||
			event.target === modal.firstElementChild
		) {
			hideModal();
		}
	});

	// Handle file selection
	fileInput.addEventListener("change", function (e) {
		const fileName = e.target.files[0]?.name;
		if (fileName) {
			const fileLabel = this.parentElement;
			fileLabel.innerHTML = `<i class="pg-icon">upload</i> ${fileName}`;
		}
	});

	// Handle form submission
	contactListForm.addEventListener("submit", function (e) {
		e.preventDefault();

		const formData = new FormData();
		formData.append(
			"countryCode",
			document.getElementById("countryCode").value,
		);
		formData.append("listName", document.getElementById("listName").value);
		formData.append("file", fileInput.files[0]);

		// Send to your backend endpoint
		fetch("/api/contact-list/createList", {
			method: "POST",
			body: formData,
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.success) {
					hideModal();
					// Refresh the contact list or show success message
					window.location.reload();
				}
			})
			.catch((error) => {
				alert(error);
				console.error("Error:", error);
			});
	});

	// Handle template download
        // downloadBtn.addEventListener("click", function () {
        //     window.location.href = "/api/contact-list/template";
        // });
});

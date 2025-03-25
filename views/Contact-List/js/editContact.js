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
				toast("success", "Changes saved successfully!");
				originalValue = updatedValue; // Update the original value
				saveChangesBtn.disabled = true;
				saveChangesBtn.classList.add(
					"opacity-50",
					"cursor-not-allowed",
				);
				saveChangesBtn.classList.remove("hover:bg-gray-100");
			} else {
				toast("error", data.message);
			}
		})
		.catch((err) => {
			console.error("Error editing contact:", err);
			toast("error", err);
		});
});

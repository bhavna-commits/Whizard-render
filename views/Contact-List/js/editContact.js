// Select the modal and form elements
const editModal = document.getElementById("editModal");
const editContactForm = document.getElementById("editContactForm");

// Event listener for when the modal is opened
editModal.addEventListener("show.bs.modal", function (event) {
	const button = event.relatedTarget; // Button that triggered the modal
	const contact = JSON.parse(button.getAttribute("data-contact")); // Extract the contact data from data-* attribute

	// Populate the form fields with the contact data
	document.getElementById("edit-contact-id").value = contact._id;
	document.getElementById("edit-contact-name").value = contact.name;
	document.getElementById("edit-contact-tags").value = contact.tags;
	document.getElementById("edit-contact-whatsapp").value = contact.validated;
});

// Handle the form submission for saving changes
editContactForm.addEventListener("submit", async function (event) {
	event.preventDefault(); // Prevent the default form submission

	// Extract data from the form
	const contactId = document.getElementById("edit-contact-id").value;
	const updatedData = {
		name: document.getElementById("edit-contact-name").value,
		tags: document.getElementById("edit-contact-tags").value,
		validated: document.getElementById("edit-contact-whatsapp").value,
	};

	try {
		// Send the updated data to the server via a PUT request
		const response = await fetch(`/contact-list/overview/${contactId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(updatedData),
		});

		const result = await response.json();

		if (result.success) {
			// Optionally refresh the page or update the table row with new data
			window.location.reload(); // Reload the page to reflect changes
		} else {
			alert("Error updating contact: " + result.message);
		}
	} catch (error) {
		console.error("Error:", error);
		alert("An error occurred while updating the contact.");
	}
});

// Get references to the modal and delete button
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

// Event listener for when the delete modal is shown
deleteModal.addEventListener('show.bs.modal', function (event) {
  const button = event.relatedTarget; // Button that triggered the modal
  const contactId = button.getAttribute('data-contact-id'); // Extract contact ID from data-* attribute

  // Set the contact ID in the hidden input field
  document.getElementById('delete-contact-id').value = contactId;
});

// Handle the delete confirmation button click
confirmDeleteBtn.addEventListener('click', async function () {
  const contactId = document.getElementById('delete-contact-id').value;

  try {
    // Send a DELETE request to the server to delete the contact
    const response = await fetch(`/contact-list/${contactId}`, {
      method: 'DELETE',
    });

    const result = await response.json();

    if (result.success) {
      // Optionally refresh the page or remove the row from the table
      window.location.reload(); // Reload the page to reflect changes
    } else {
      alert('Error deleting contact: ' + result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('An error occurred while deleting the contact.');
  }
});

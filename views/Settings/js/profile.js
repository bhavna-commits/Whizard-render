function previewImage(event) {
	const input = event.target;
	const preview = document.getElementById("dpPreview");
	const userInitial = document.getElementById("userInitial");

	// Make sure the preview element exists
	if (!preview) {
		console.error("Preview element not found");
		return;
	}
	console.log("preview element exists");

	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = function (e) {
			// Set the src of the img tag to the base64 image string
			preview.src = e.target.result;

			// Show the profile image and hide the user's initial
			preview.classList.remove("hidden");
			userInitial.classList.add("hidden");
		};
		reader.readAsDataURL(input.files[0]);
	}
}

function removePhoto() {
	const input = document.getElementById("profilePhoto");
	const profilePreview = document.getElementById("profilePreview");
	const userInitial = document.getElementById("userInitial");
	const removeButton = document.getElementById("removePhotoButton");

	// Clear the input file and hide the profile photo
	input.value = "";
	profilePreview.classList.add("hidden");
	userInitial.classList.remove("hidden");

	// Hide the remove photo button
	removeButton.classList.add("hidden");
}

document
	.getElementById("saveChanges")
	.addEventListener("click", async function (event) {
		event.preventDefault();

		const formData = new FormData();
		formData.append(
			"profilePhoto",
			document.getElementById("profilePhoto").files[0],
		);
		formData.append(
			"name",
			document.querySelector('input[name="name"]').value,
		);
		formData.append(
			"language",
			document.querySelector('select[name="language"]').value,
		);

		try {
			// Send the form data via Axios
			const res = await fetch("/api/settings/profile", {
				method: "POST",
				body: formData,
			});
			const response = await res.json();
			// Handle success response
			if (response.success) {
				document.getElementById(
					"message",
				).innerHTML = `<p class="text-green-500">Profile updated successfully!</p>`;

				setTimeout(() => {
					document.getElementById(
						"message",
					).innerHTML = '';
				}, 2000);
			} else {
				document.getElementById(
					"message",
				).innerHTML = `<p class="text-red-500">Error updating profile: ${
					response.message || "An error occurred"
					}</p>`;
				setTimeout(() => {
					document.getElementById("message").innerHTML = "";
				}, 2000);
			}
		} catch (error) {
			// Handle error response
			document.getElementById(
				"message",
			).innerHTML = `<p class="text-red-500">Error updating profile: ${
				error.message || "An error occurred"
				}</p>`;
			setTimeout(() => {
				document.getElementById("message").innerHTML = "";
			}, 2000);
		}
	});

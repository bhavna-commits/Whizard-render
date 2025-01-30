function handleFileChange(event) {
	const input = event.target;
	const label = document.getElementById("fileLabel");

	// Update label text with filename
	if (input.files && input.files[0]) {
		label.textContent = input.files[0].name;
	} else {
		label.textContent = "Upload";
	}

	// Call the original preview function
	previewImage(event);
}

function previewImage(event) {
	const input = event.target;
	const preview = document.getElementById("dpPreview");
	const userInitial = document.getElementById("userInitial");

	if (!preview) {
		console.error("Preview element not found");
		return;
	}

	if (input.files && input.files[0]) {
		const reader = new FileReader();
		reader.onload = function (e) {
			preview.src = e.target.result;
			preview.classList.remove("hidden");
			userInitial.classList.add("hidden");
		};
		reader.readAsDataURL(input.files[0]);
	}
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
					document.getElementById("message").innerHTML = "";
					location.reload();
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

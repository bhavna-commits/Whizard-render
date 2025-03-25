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
				toast("success", "Profile updated successfully!");

				setTimeout(() => {
					location.reload();
				}, 2000);
			} else {
				toast("error", response.message);
			}
		} catch (error) {
			toast("error", response.message);
		}
	});

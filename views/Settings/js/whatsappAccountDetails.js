document.addEventListener("DOMContentLoaded", function () {
	const form = document.getElementById("signUpForm");
	const fields = [
		"about",
		"description",
		"address",
		"email",
		"name",
		"industry",
		"website",
	];

	// Word count logic
	document.querySelectorAll("textarea").forEach((textarea) => {
		const wrapper = textarea.closest("div.relative");
		const counter = wrapper?.querySelector(".wordCount");
		const maxLength = textarea.getAttribute("maxlength");

		if (!counter || !maxLength) return;

		const updateCount = () => {
			const currentLength = textarea.value.length;
			counter.textContent = `${currentLength}/${maxLength}`;
		};

		updateCount();
		textarea.addEventListener("input", updateCount);
	});

	// Handle form submission
	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		const submitBtn = document.getElementById("submitBtn");
		const errorMessage = document.getElementById("errorMessage");

		submitBtn.disabled = true;
		submitBtn.innerHTML = `<div class="loading-spinner"></div>`;

		// Collect form values from name attributes
		const plainData = fields.reduce((acc, field) => {
			acc[field] =
				document
					.querySelector(
						`input[name="${field}"], textarea[name="${field}"]`,
					)
					?.value?.trim() || "";
			return acc;
		}, {});

		const formData = new FormData();
		for (const key in plainData) {
			formData.append(key, plainData[key]);
		}

		const fileInput = document.getElementById("profilePhoto");
		if (fileInput?.files?.[0]) {
			formData.append("profilePhoto", fileInput.files[0]);
		}

		try {
			const response = await fetch(
				"/api/settings/whatsapp-account-details",
				{
					method: "POST",
					body: formData,
				},
			);

			const result = await response.json();

			if (!response.ok)
				throw new Error(result.message || "Error saving information");

			errorMessage.classList.remove("hidden", "text-red-500");
			errorMessage.classList.add("text-green-500");
			errorMessage.innerText = result.message;

			setTimeout(() => {
				errorMessage.classList.add("hidden");
				errorMessage.classList.remove("text-green-500");
			}, 2000);
		} catch (error) {
			errorMessage.classList.remove("hidden", "text-green-500");
			errorMessage.classList.add("text-red-500");
			errorMessage.innerText = error.message;

			setTimeout(() => {
				errorMessage.classList.add("hidden");
				errorMessage.classList.remove("text-red-500");
			}, 2000);
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerHTML = "Save Changes";
		}
	});
});

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

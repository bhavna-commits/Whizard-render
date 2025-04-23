document.addEventListener("DOMContentLoaded", function () {
	const countrySelectorButton = document.getElementById(
		"countrySelectorButton",
	);
	const countryDropdown = document.getElementById("countryDropdown");
	const countryOptions = document.querySelectorAll(".country-option");
	const countrySearch = document.getElementById("countrySearch");
	const selectedFlag = document.getElementById("selectedFlag");
	const selectedDialCode = document.getElementById("selectedDialCode");
	const successMessage = document.getElementById("successMessage"); // Make sure it's defined
	const errorMessage = document.getElementById("errorMessage"); // Similarly for error

	const phoneInput = document.getElementById("phone");
	const phoneError = document.getElementById("phone-error");

	phoneInput.addEventListener("input", function () {
		const phoneValue = phoneInput.value;

		// Remove any non-numeric characters
		const cleanedPhoneValue = phoneValue.replace(/\D/g, "");

		// Update the input field with only numeric values
		phoneInput.value = cleanedPhoneValue;

		// Validate phone length
		if (cleanedPhoneValue.length < 10 || cleanedPhoneValue.length > 12) {
			phoneError.style.display = "block";
		} else {
			phoneError.style.display = "none";
		}
	});

	// Toggle country dropdown
	countrySelectorButton.addEventListener("click", function (e) {
		e.preventDefault();
		countryDropdown.classList.toggle("hidden");
	});

	// Handle country selection
	countryOptions.forEach((option) => {
		option.addEventListener("click", function () {
			const flag = this.querySelector(".country-flag").textContent;
			const dialCode =
				this.querySelector(".country-dial-code").textContent;

			selectedFlag.textContent = flag;
			selectedDialCode.value = dialCode;
			countryDropdown.classList.add("hidden");
		});
	});

	// Password field toggle
	const passwordInput = document.getElementById("password");
	const visiblePasswordIcon = document.getElementById("visiblePassword");
	const notVisiblePasswordIcon =
		document.getElementById("notVisiblePassword");

	// Show password when visible icon is clicked
	visiblePasswordIcon.addEventListener("click", function () {
		passwordInput.type = "text"; // Show password
		visiblePasswordIcon.style.display = "none"; // Hide the visible icon
		notVisiblePasswordIcon.style.display = "inline"; // Show the slashed eye icon
	});

	// Hide password when slashed eye icon is clicked
	notVisiblePasswordIcon.addEventListener("click", function () {
		passwordInput.type = "password"; // Hide password
		notVisiblePasswordIcon.style.display = "none"; // Hide the slashed eye icon
		visiblePasswordIcon.style.display = "inline"; // Show the visible icon
	});

	// Confirm password field toggle
	const confirmPasswordInput = document.getElementById("confirmPassword");
	const visibleConfirmPasswordIcon = document.getElementById(
		"visibleConfirmPassword",
	);
	const notVisibleConfirmPasswordIcon = document.getElementById(
		"notVisibleConfirmPassword",
	);

	// Show confirm password when visible icon is clicked
	visibleConfirmPasswordIcon.addEventListener("click", function () {
		confirmPasswordInput.type = "text"; // Show confirm password
		visibleConfirmPasswordIcon.style.display = "none"; // Hide the visible icon
		notVisibleConfirmPasswordIcon.style.display = "inline"; // Show the slashed eye icon
	});

	// Hide confirm password when slashed eye icon is clicked
	notVisibleConfirmPasswordIcon.addEventListener("click", function () {
		confirmPasswordInput.type = "password"; // Hide confirm password
		notVisibleConfirmPasswordIcon.style.display = "none"; // Hide the slashed eye icon
		visibleConfirmPasswordIcon.style.display = "inline"; // Show the visible icon
	});

	// Search functionality
	countrySearch.addEventListener("input", function () {
		const searchValue = this.value.toLowerCase();

		countryOptions.forEach((option) => {
			const countryName = option
				.querySelector(".country-name")
				.textContent.toLowerCase();
			const dialCode = option
				.querySelector(".country-dial-code")
				.textContent.toLowerCase();

			if (
				countryName.includes(searchValue) ||
				dialCode.includes(searchValue)
			) {
				option.style.display = "flex";
			} else {
				option.style.display = "none";
			}
		});
	});

	// Close dropdown when clicking outside
	document.addEventListener("click", function (e) {
		if (
			!countrySelectorButton.contains(e.target) &&
			!countryDropdown.contains(e.target)
		) {
			countryDropdown.classList.add("hidden");
		}
	});

	// Form submission
	const form = document.getElementById("signUpForm");
	const submitBtn = document.getElementById("submitBtn");

	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		// Clear any old messages
		successMessage.classList.add("hidden");
		errorMessage.classList.add("hidden");

		// Disable submit button and show spinner
		submitBtn.disabled = true;
		submitBtn.innerHTML = `<div class="loading-spinner"></div>`;

		// Get user input and check email validity
    const emailInput = document.getElementById("email");
		if (!emailInput) return toast("error", "no email input found");
		try {
			const emailWarning = document.getElementById("emailWarning");
			const email = emailInput.value.trim();
			const personalEmailPattern =
				/@(gmail\.com|yahoo\.com|hotmail\.com|aol\.com|outlook\.com|icloud\.com|live\.com|msn\.com|mail\.com|zoho\.com|yandex\.com|protonmail\.com|gmx\.com|me\.com|fastmail\.com|pm\.me|mailinator\.com|tutanota\.com|10minutemail\.com|guerrillamail\.com|temp-mail\.org|getnada\.com|maildrop\.cc|trashmail\.com|fakeinbox\.com|dispostable\.com|sharklasers\.com|mailnesia\.com|yopmail\.com|throwawaymail\.com|mohmal\.com|emailondeck\.com|temporarymail\.com|tempmail\.net|luxusmail\.com|anonbox\.net|burnermail\.io|mytemp\.email)$/i;

			if (personalEmailPattern.test(email)) {
				emailWarning.classList.remove("hidden");
				return;
			} else {
				emailWarning.classList.add("hidden");
			}

			// Disable submit button and show spinner
			submitBtn.disabled = true;
			submitBtn.innerHTML = `<div class="loading-spinner"></div>`;

			// Perform password validation
			const password = document.getElementById("password").value.trim();
			const confirmPassword = document
				.getElementById("confirmPassword")
				.value.trim();
			const passwordError = document.getElementById("passwordError");
			const confirmPasswordError = document.getElementById(
				"confirmPasswordError",
			);

			const passwordRegex =
				/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

			if (!passwordRegex.test(password)) {
				passwordError.style.display = "block";
				passwordError.textContent =
					"Password must be at least 8 characters long, include 1 lowercase, 1 uppercase letter, 1 number, and 1 special character.";
				submitBtn.disabled = false;
				submitBtn.innerHTML = "Sign Up";
				return;
			} else {
				passwordError.style.display = "none"; // Hide error if valid
			}

			// Validate confirm password
			if (password !== confirmPassword) {
				confirmPasswordError.style.display = "block";
				confirmPasswordError.textContent = "Passwords do not match.";
				submitBtn.disabled = false;
				submitBtn.innerHTML = "Sign Up";
				return;
			} else {
				confirmPasswordError.style.display = "none"; // Hide error if match
			}

			// Prepare form data for submission
			const formData = {
				name: document.getElementById("name").value.trim(),
				email,
				countryCode: selectedDialCode.value,
				country: document.getElementById("countrySearch").value.trim(),
				phoneNumber: document.getElementById("phone").value.trim(),
				password,
				confirmPassword,
			};

			const response = await fetch("/api/users/generateOTP", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Display green success message
				successMessage.classList.remove("hidden");
				successMessage.textContent = result.message;

				// Redirect to the verify-email page, passing the email
				setTimeout(() => {
					window.location.href = `/verify-email?email=${encodeURIComponent(
						result.email,
					)}`;
				}, 1000);
			} else {
				// Display the error message sent from the backend
				errorMessage.classList.remove("hidden");
				errorMessage.textContent =
					result.message || "An error occurred.";
			}
		} catch (error) {
			errorMessage.classList.remove("hidden");
			errorMessage.textContent = error.message;
		} finally {
			submitBtn.disabled = false;
			submitBtn.innerHTML = "Sign Up";
		}
	});
});

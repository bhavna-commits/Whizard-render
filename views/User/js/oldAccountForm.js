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
				this.querySelector(".country-dial-code")?.textContent;

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

	const countrySelectorButton2 = document.getElementById(
		"countrySelectorButton2",
	);
	const countryDropdown2 = document.getElementById("countryDropdown2");
	const countryOptions2 = document.querySelectorAll(".country-option");
	const countrySearchInput = document.getElementById("countrySearch2");
	const selectedFlag2 = document.getElementById("selectedFlag2");
	const stateInput = document.getElementById("stateInput");
	const stateDropdown = document.getElementById("stateDropdown");
	const form = document.getElementById("signUpForm");

	let selectedCountry = null;

	// Previous country selector code remains the same...

	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		if (
			document.getElementById("confirmPassword").value !==
			document.getElementById("password").value
		) {
			document
				.getElementById("confirmPasswordError")
				.classList.remove("hidden");
			return;
		} else {
			document
				.getElementById("confirmPasswordError")
				.classList.add("hidden");
		}

		const submitBtn = document.getElementById("submitBtn");
		const errorMessage = document.getElementById("errorMessage");

		// Disable the submit button and show a loading spinner
		submitBtn.disabled = true;
		submitBtn.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 inline-block text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Submitting ...
        `;

		// Collect form data
		const formData = {
			WABA_ID: document.getElementById("WABA").value,
			phone_number_id:
				document.getElementById("FB_PHONE_NUMBER_ID").value,
			number: document.getElementById("FB_PHONE_NUMBER").value,
			friendly_name: document.getElementById("FB_PHONE_NAME").value,
			name: document.getElementById("name").value,
			email: document.getElementById("email").value,
			password: document.getElementById("confirmPassword").value,
			phoneNumber: document.getElementById("phone").value,
			companyName: document.getElementById("companyName").value,
			description: document.getElementById("description").value,
			country: document.getElementById("countrySearch2").value,
			countryCode: document.querySelector('input[name="countryCode"]')
				.value,
			state: stateDropdown.classList.contains("hidden")
				? stateInput.value
				: stateDropdown.value,
			companySize: document.getElementById("companySize").value,
			industry: document.getElementById("industry").value,
			jobRole: document.getElementById("jobRole").value,
			website: document.getElementById("website").value,
		};

		try {
			console.log(formData);
			const response = await fetch("/api/users/UdY0U6Zlfp", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			// Check if response is not OK or the result contains an error message
			if (!response.ok) {
				const errorMsg =
					result.message ||
					"Error saving information, please check the details";
				console.log(errorMsg);
				throw errorMsg;
			}

			// If the result is successful, redirect to the homepage or next page
			if (result.success) {
				toast("success", result.message);
			}
		} catch (error) {
			console.log(error);
			toast("error", error);
		} finally {
			// Re-enable the submit button and restore the original text
			submitBtn.disabled = false;
			submitBtn.innerHTML = "Complete Sign Up";
		}
	});

	// Initially disable state input and dropdown
	stateInput.disabled = true;
	stateDropdown.disabled = true;

	countrySelectorButton2.addEventListener("click", function () {
		countryDropdown2.classList.toggle("hidden");
	});

	countryOptions2.forEach((option) => {
		option.addEventListener("click", function () {
			const flagImg = this.querySelector(".country-flag").cloneNode(true);
			// Clear any old content
			selectedFlag2.innerHTML = "";

			// Insert the full <img> element
			selectedFlag2.appendChild(flagImg);

			const countryName = this.querySelector(".country-name").textContent;

			// Update selected flag and country name
			// selectedFlag.textContent = flag;
			countrySearchInput.value = countryName;
			countryDropdown2.classList.add("hidden");

			// Find the selected country data from the countries array
			selectedCountry = countries.find(
				(country) => country.name === countryName,
			);

			console.log(selectedCountry);
			// Handle state input based on whether the country has states
			if (
				selectedCountry &&
				selectedCountry.states &&
				selectedCountry.states.length > 0
			) {
				// If the country has states, show the state dropdown and populate it
				stateInput.classList.add("hidden");
				stateDropdown.classList.remove("hidden");
				stateInput.disabled = true;
				stateDropdown.disabled = false;

				// Clear the previous dropdown options
				stateDropdown.innerHTML =
					'<option value="">Select State</option>';

				// Add state options to the dropdown
				selectedCountry.states.forEach((state) => {
					const option = document.createElement("option");
					option.value = state.name;
					option.textContent = state.name;
					stateDropdown.appendChild(option);
				});
			} else {
				// If no states are available, hide the dropdown and show the manual input
				stateDropdown.classList.add("hidden");
				stateInput.classList.remove("hidden");
				stateDropdown.disabled = true;
				stateInput.disabled = false;
			}
		});
	});

	// Search functionality for country names
	countrySearchInput.addEventListener("input", function () {
		const searchValue = countrySearchInput.value.toLowerCase();

		countryOptions.forEach((option) => {
			const countryName = option
				.querySelector(".country-name")
				.textContent.toLowerCase();
			if (countryName.includes(searchValue)) {
				option.style.display = "flex";
			} else {
				option.style.display = "none";
			}
		});
	});

	const descriptionInput = document.getElementById("description");
	const wordCountDisplay = document.getElementById("wordCount");
	const maxWords = 100;

	descriptionInput.addEventListener("input", () => {
		const inputText = descriptionInput.value.trim();
		const words = inputText.split("");
		// console.log(words);
		const wordCount = words.length;
		// console.log(wordCount);
		// Update the word count display
		wordCountDisplay.textContent = `${wordCount}/${maxWords} words`;
		// console.log(descriptionInput.value);
	});
});

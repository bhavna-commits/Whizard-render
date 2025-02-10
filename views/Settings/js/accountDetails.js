document.addEventListener("DOMContentLoaded", function () {
	const countrySelectorButton = document.getElementById(
		"countrySelectorButton",
	);
	const countryDropdown = document.getElementById("countryDropdown");
	const countryOptions = document.querySelectorAll(".country-option");
	const countrySearchInput = document.getElementById("countrySearch");
	const selectedFlag = document.getElementById("selectedFlag");
	const stateInput = document.getElementById("stateInput");
	const stateDropdown = document.getElementById("stateDropdown");
	const form = document.getElementById("signUpForm");

	let selectedCountry = null;

	// Load the respective states based on the selected country on page load
	const loadStatesForSelectedCountry = () => {
		const countryName = countrySearchInput.value; // Get the selected country name
		selectedCountry = countries.find(
			(country) => country.name === countryName,
		);

		// If a country is selected and has states, load the states into the dropdown
		if (
			selectedCountry &&
			selectedCountry.states &&
			selectedCountry.states.length > 0
		) {
			stateInput.classList.add("hidden");
			stateDropdown.classList.remove("hidden");

			// Enable the state dropdown
			stateDropdown.disabled = false;

			// Clear previous state options
			// stateDropdown.innerHTML = '<option value="">Select State</option>';

			// Add state options
			selectedCountry.states.forEach((state) => {
				const option = document.createElement("option");
				option.value = state.name;
				option.textContent = state.name;
				stateDropdown.appendChild(option);
			});
		} else {
			// If no states are available, show the manual input field
			stateDropdown.classList.add("hidden");
			stateInput.classList.remove("hidden");
			stateInput.disabled = false;
		}
	};

	// Call the function to load states on page load
	loadStatesForSelectedCountry();

	// Handle form submission (existing logic)
	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		const submitBtn = document.getElementById("submitBtn");
		const errorMessage = document.getElementById("errorMessage");

		// Disable the submit button and show a loading spinner
		submitBtn.disabled = true;
		submitBtn.innerHTML = `<div class="loading-spinner"></div>`;

		// Collect form data
		const formData = {
			name: document.getElementById("name").value,
			description: document.getElementById("description").value,
			country: document.getElementById("countrySearch").value,
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
			const response = await fetch("/api/settings/account-details", {
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
				throw new Error(errorMsg);
			}

			// If the result is successful, display the success message
			if (result.success) {
				errorMessage.classList.remove("hidden");
				errorMessage.classList.add("text-green-500");
				errorMessage.innerText = result.message;
				setTimeout(() => {
					errorMessage.classList.add("hidden");
					errorMessage.classList.remove("text-green-500");
				}, 2000);
			}
		} catch (error) {
			errorMessage.classList.remove("hidden");
			errorMessage.classList.add("text-red-500");
			errorMessage.innerText = error.message;
			setTimeout(() => {
				errorMessage.classList.add("hidden");
				errorMessage.classList.remove("text-red-500");
			}, 2000);
		} finally {
			// Re-enable the submit button and restore the original text
			submitBtn.disabled = false;
			submitBtn.innerHTML = "Save Changes";
		}
	});

	// Country selection logic
	countrySelectorButton.addEventListener("click", function () {
		countryDropdown.classList.toggle("hidden");
	});

	countryOptions.forEach((option) => {
		option.addEventListener("click", function () {
			const flag = this.querySelector(".country-flag").textContent;
			const countryName = this.querySelector(".country-name").textContent;

			// Update selected flag and country name
			selectedFlag.textContent = flag;
			countrySearchInput.value = countryName;
			countryDropdown.classList.add("hidden");

			// Load respective states based on the selected country
			loadStatesForSelectedCountry();
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

	// Description word count logic (existing)
	const descriptionInput = document.getElementById("description");
	const wordCountDisplay = document.getElementById("wordCount");
	const maxWords = 100;

	descriptionInput.addEventListener("input", () => {
		const inputText = descriptionInput.value.trim();
		const words = inputText.split("");
		const wordCount = words.length;
		wordCountDisplay.textContent = `${wordCount}/${maxWords} words`;
	});
});

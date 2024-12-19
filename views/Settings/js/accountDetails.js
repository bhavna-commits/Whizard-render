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

	// Previous country selector code remains the same...

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

			// If the result is successful, redirect to the homepage or next page
			if (result.success) {
				errorMessage.classList.remove("hidden");
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

	// Initially disable state input and dropdown
	stateInput.disabled = true;
	stateDropdown.disabled = true;

	countrySelectorButton.addEventListener("click", function () {
		// console.log("lciked");
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
					option.value = state.code;
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

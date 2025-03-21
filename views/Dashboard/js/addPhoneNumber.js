const dropdownButton = document.getElementById("dropdownButton");
const dropdownMenu = document.getElementById("dropdownMenu");
const selectedOption = document.getElementById("selectedOption");
const otpInputs = document.querySelectorAll(".otp-input");
const otpInput = document.querySelectorAll(".otp-verify");
const dropdownUl = document.getElementById("dropdownUl");
const countrySelectorButton = document.getElementById("countrySelectorButton");
const countryDropdown = document.getElementById("countryDropdown");
const countryOptions = document.querySelectorAll(".country-option");
const countrySearch = document.getElementById("countrySearch");
const selectedFlag = document.getElementById("selectedFlag");
const selectedDialCode = document.getElementById("selectedDialCode");

// Toggle country dropdown
countrySelectorButton.addEventListener("click", function (e) {
	e.preventDefault();
	countryDropdown.classList.toggle("hidden");
});

// Handle country selection
countryOptions.forEach((option) => {
	option.addEventListener("click", function () {
		const flag = this.querySelector(".country-flag").textContent;
		const dialCode = this.querySelector(".country-dial-code").textContent;
        // console.log(dialCode);
		selectedFlag.textContent = flag;
		selectedDialCode.value = dialCode;
		countryDropdown.classList.add("hidden");
	});
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

document.addEventListener("click", function (e) {
	if (
		!countrySelectorButton.contains(e.target) &&
		!countryDropdown.contains(e.target)
	) {
		countryDropdown.classList.add("hidden");
	}
});

let isLoading = false;

document.getElementById("phoneNumber").addEventListener("input", validateForm);
document.getElementById("name").addEventListener("input", validateForm);
// document.getElementById("countryCode").addEventListener("input", validateForm);

// Toggle dropdown visibility
dropdownButton.addEventListener("click", async (e) => {
	e.preventDefault();
	const loader = document.querySelector(".buttonLoader");
	const text = document.getElementById("dropdownUl");
	if (!isLoading) {
		dropdownMenu.classList.toggle("hidden");
	}
	try {
		// Show the loader
		loader.classList.remove("hidden");
		text.classList.add("hidden");
		// Fetch the refreshed phone numbers partial HTML from the server
		const response = await fetch("/api/dashboard/refresh-phone-numbers");
		if (!response.ok) throw new Error("Failed to fetch phone numbers");
		const html = await response.text();

		// Update the dropdown menu's inner HTML with the refreshed list
		text.innerHTML = html;

		// Optionally toggle the dropdown visibility
		// dropdownMenu.classList.toggle("hidden");
	} catch (error) {
		console.error("Error updating phone numbers:", error);
		toast("error",error.message);
	} finally {
		loader.classList.add("hidden");
		text.classList.remove("hidden");
	}
});

otpInput.forEach((input, index) => {
	input.addEventListener("keydown", (event) => {
		// Allow backspace to go to the previous input if the current one is empty
		if (event.key == "Backspace" && input.value.length == 0 && index > 0) {
			otpInput[index - 1].focus();
		}
		checkOTPInputs();
	});
	input.addEventListener("input", (event) => {
		// Remove any non-digit characters
		input.value = input.value.replace(/\D/g, "");
		console.log();
		// Move to the next input if one digit is entered
		if (input.value.length == 1 && index < otpInput.length - 1) {
			otpInput[index + 1].focus();
		}
		checkOTPInputs();
	});
	input.addEventListener("paste", (event) => {
		// Handle paste: only take numeric values
		let pasteData = event.clipboardData.getData("text");
		// Remove all non-digit characters from the pasted data
		pasteData = pasteData.replace(/\D/g, "");
		const otpArray = pasteData.split("").slice(0, otpInput.length);

		otpArray.forEach((char, i) => {
			otpInput[i].value = char;
		});

		event.preventDefault();

		checkOTPInputs();
	});
});
// Assume otpInputs is defined as all inputs with the "otp-input" class
otpInputs.forEach((input, index) => {
	input.addEventListener("keydown", (event) => {
		// Allow backspace to go to the previous input if the current one is empty
		if (event.key == "Backspace" && input.value.length == 0 && index > 0) {
			otpInputs[index - 1].focus();
		}
		checkOTPInputs();
	});
	input.addEventListener("input", (event) => {
		// Remove any non-digit characters
		input.value = input.value.replace(/\D/g, "");
		console.log();
		// Move to the next input if one digit is entered
		if (input.value.length == 1 && index < otpInputs.length - 1) {
			otpInputs[index + 1].focus();
		}
		checkOTPInputs();
	});

	input.addEventListener("paste", (event) => {
		// Handle paste: only take numeric values
		let pasteData = event.clipboardData.getData("text");
		// Remove all non-digit characters from the pasted data
		pasteData = pasteData.replace(/\D/g, "");
		const otpArray = pasteData.split("").slice(0, otpInputs.length);

		otpArray.forEach((char, i) => {
			otpInputs[i].value = char;
		});

		event.preventDefault();

		checkOTPInputs();
	});
});

dropdownUl.addEventListener("click", (event) => {
	// Find the closest li element in case a child element was clicked
	const option = event.target.closest("li");
	if (!option) return; // Exit if the click wasn't on an li element

	// Prevent the click from propagating further
	event.stopPropagation();

	// If a loading flag is active, ignore the click
	if (isLoading) return;

	// Retrieve the selected text and other attributes
	const selectedText = option.querySelector("span").textContent;
	const phoneNumberId = option.getAttribute("data-value");
	const isVerified = option.getAttribute("data-verified") === "true";

	if (!isVerified) {
		openVerifyModal(event, phoneNumberId);
		return;
	}

	// Show spinner and update selection
	isLoading = true;
	const spinner = createSpinner();
	selectedOption.textContent = "";
	selectedOption.appendChild(spinner);
	dropdownMenu.classList.add("hidden");

	// Trigger the POST request to select the number
	fetch("/api/dashboard/select-number", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			phoneNumberId,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.success) {
				selectedOption.innerHTML = selectedText;
			} else {
				toast("error",data.message);
				selectedOption.textContent = "Select phone number";
			}
		})
		.catch((error) => {
			console.error("Error selecting phone number:", error);
			toast("error",error);
			selectedOption.textContent = "Select phone number";
		})
		.finally(() => {
			isLoading = false;
		});
});

// Close dropdown if clicked outside
document.addEventListener("click", (e) => {
	if (
		!dropdownButton.contains(e.target) &&
		!dropdownMenu.contains(e.target)
	) {
		dropdownMenu.classList.add("hidden");
	}
});

// Create a spinner element (Tailwind CSS)
const createSpinner = () => {
	const spinner = document.createElement("div");
	spinner.classList.add(
		"spinner",
		"border-2",
		"border-gray-300",
		"border-t-transparent",
		"rounded-full",
		"animate-spin",
		"h-5",
		"w-5",
		"inline-block",
		"ml-2",
	);
	return spinner;
};

// Function to check if all OTP inputs are filled
function checkOTPInputs() {
	// Convert NodeList to Array and check if every input has exactly one digit

	const allFilled = Array.from(otpInputs).every(
		(input) => input.value.length == 1,
	);
	const allfilled = Array.from(otpInput).every(
		(input) => input.value.length == 1,
	);
	// console.log(otpInputs);
	const btn = document.getElementById("verifyButton");
	const btn2 = document.getElementById("set2FAPinButton");
	// console.log(btn2);
	// console.log("here");
	if (allFilled || allfilled) {
		// console.log("here")
		btn.disabled = false;
		// Remove disabled styling and add enabled styling (adjust classes as needed)
		btn.classList.remove("bg-gray-400", "cursor-not-allowed");
		btn.classList.add("bg-blue-600", "cursor-pointer");
		btn2.disabled = false;
		// Remove disabled styling and add enabled styling (adjust classes as needed)
		btn2.classList.remove("bg-gray-400", "cursor-not-allowed");
		btn2.classList.add("bg-blue-600", "cursor-pointer");
	} else {
		// console.log("heredsds")
		btn.disabled = true;
		btn.classList.add("bg-gray-400", "cursor-not-allowed");
		btn.classList.remove("bg-blue-600", "cursor-pointer");
		btn2.disabled = true;
		btn2.classList.add("bg-gray-400", "cursor-not-allowed");
		btn2.classList.remove("bg-blue-600", "cursor-pointer");
	}
}

function openVerifyModal(e, phoneNumberId) {
	openAddNumber();
	// Set the phone number in the hidden field so the verification form knows which number to verify.
	document.getElementById("hiddenPhoneNumber").value = phoneNumberId;

	const codeMethod = "SMS"; // or "VOICE"
	const language = "en_US"; // example language

	generateOTP(e, phoneNumberId, codeMethod, language);
	// Hide the add number form and show the verify form:
	document.getElementById("addNumberForm").classList.add("hidden");
	document.getElementById("verifyNumberForm").classList.remove("hidden");
	// Finally, open the modal (for example, by removing the 'hidden' class)
	document.getElementById("addNumberModal").classList.remove("hidden");
}

// function to generateOTP to verify number
async function generateOTP(event, phoneNumberId, codeMethod, language) {
	const buttonLoader = event.target.querySelector(".buttonLoader");
	// console.log(buttonLoader);
	const buttonText = event.target.querySelector(".buttonText");
	try {
		// Show the loader and hide the button text
		buttonLoader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		const response = await fetch("/api/dashboard/send-otp", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				phoneNumberId, // the selected phone number ID
				code_method: codeMethod,
				language: language,
			}),
		});

		// Hide loader and show button text
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");

		const data = await response.json();
		if (data.success) {
			document
				.getElementById("verifyNewNumberError")
				.classList.remove("bg-red-100", "text-red-700", "hidden");
			document
				.getElementById("verifyNewNumberError")
				.classList.add("text-green-500", "bg-green-100");
			document.getElementById("verifyNewNumberError").innerText =
				"OTP sent successfully";
		} else {
			document
				.getElementById("verifyNewNumberError")
				.classList.remove("hidden");
			document.getElementById("verifyNewNumberError").innerText =
				data.message || "Failed to send OTP. Please try again.";
		}
	} catch (error) {
		document.getElementById("verifyNewNumberError").innerText =
			"An error occurred. Please try again.";
		console.error("Error sending OTP:", error);
	} finally {
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");
		setTimeout(() => {
			document
				.getElementById("verifyNewNumberError")
				.classList.add("hidden");
		}, 2000);
	}
}

// JavaScript: complete the twoFactorAuthentication function
function twoFactorAuthentication(e) {
	e.preventDefault();

	// Retrieve values from form fields
	const phoneNumberId = document.getElementById("hiddenPhoneNumber").value;
	const otpInputs = [...document.querySelectorAll(".otp-input")];
	const pin = otpInputs.map((input) => input.value).join("");
	const otpStatus = document.getElementById("set2FAPinStatus");
	const verifyButton = document.getElementById("verifyButton");
	const buttonLoader = e.target.querySelector(".buttonLoader");
	const buttonText = e.target.querySelector(".buttonText");
	// Clear any previous status message and show the loader
	otpStatus.classList.add("hidden");
	otpStatus.textContent = "";
	verifyButton.disabled = true;
	buttonLoader.classList.remove("hidden");
	buttonText.classList.add("hidden");
	// Make a POST request to verify the 2FA PIN
	fetch("/api/dashboard/set-2FA-pin", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			phoneNumberId,
			pin,
		}),
	})
		.then((response) => response.json())
		.then((data) => {
			if (data.success) {
				location.reload();
			} else {
				// Show error message
				otpStatus.textContent =
					data.message || "Verification failed. Please try again.";
				otpStatus.classList.remove("hidden");
			}
		})
		.catch((error) => {
			console.error("Error:", error);
			otpStatus.textContent =
				"An error occurred. Please try again later.";
			otpStatus.classList.remove("hidden");
		})
		.finally(() => {
			// Hide loader and re-enable the button
			verifyButton.disabled = false;
			buttonLoader.classList.add("hidden");
			buttonText.classList.remove("hidden");
		});
}

function validateForm() {
	const name = document.getElementById("name").value.trim();
	const countryCode = document
		.getElementById("selectedDialCode")
        .value.trim();
    // console.log(countryCode);
	const phoneNumber = document.getElementById("phoneNumber").value.trim();

	// Regex for country code: must start with a '+' followed by one or more digits.
	const countryCodeRegex = /^\+[0-9]+$/;
	// Regex for phone number: exactly 10-15 digits.
	const phoneRegex = /^[0-9]{10,15}$/;

	const errorBox = document.getElementById("addNewNumberError");
	let errorMessage = "";

	// Only show an error for name if the user has typed something and it's empty.
	if (name.length > 0 && name === "") {
		errorMessage += "Name is required.<br>";
	}
	// Alternatively, if you want to always require name once a user interacts,
	// you can uncomment the next line:
	// if (name.length === 0) errorMessage += "Name is required.<br>";

	// Validate country code only if the user has typed something.
	if (countryCode.length > 0 && !countryCodeRegex.test(countryCode)) {
		errorMessage +=
			"Invalid country code. Must start with '+' followed by digits.<br>";
	}

	// Validate phone number only if the user has typed something.
	if (phoneNumber.length > 0 && !phoneRegex.test(phoneNumber)) {
		errorMessage += "Invalid phone number. Must be 10-15 digits.<br>";
	}

	// Display errors only if any exist.
	if (errorMessage) {
		errorBox.innerHTML = errorMessage;
		errorBox.classList.remove("hidden");
	} else {
		errorBox.classList.add("hidden");
	}

	// The form is considered valid only if all fields are non-empty and valid.
	const isValid =
		name.length > 0 &&
		countryCodeRegex.test(countryCode) &&
		phoneRegex.test(phoneNumber);

    // console.log(isValid);
    
	const submitButton = document.getElementById("submitButton");
	if (isValid) {
		submitButton.disabled = false;
		submitButton.classList.remove("bg-gray-400", "cursor-not-allowed");
		submitButton.classList.add("bg-black", "cursor-pointer");
	} else {
		submitButton.disabled = true;
		submitButton.classList.add("bg-gray-400", "cursor-not-allowed");
		submitButton.classList.remove("bg-black", "cursor-pointer");
	}
}

function validateVerifyForm() {
	const code = document.getElementById("verificationCode").value.trim();
	const codeRegex = /^[0-9]{6}$/; // Only numbers with 6 digits

	const verifyButton = document.getElementById("verifyButton");

	if (codeRegex.test(code)) {
		verifyButton.disabled = false;
		verifyButton.classList.remove("bg-gray-400", "cursor-not-allowed");
		verifyButton.classList.add("bg-black", "cursor-pointer");
	} else {
		verifyButton.disabled = true;
		verifyButton.classList.add("bg-gray-400", "cursor-not-allowed");
		verifyButton.classList.remove("bg-black", "cursor-pointer");
	}
}

async function addPhoneNumber(event) {
	event.preventDefault();

	const name = document.getElementById("name").value;
	const countryCode = document.getElementById("selectedDialCode").value;
	const phoneNumber = document.getElementById("phoneNumber").value;

	const buttonLoader = event.target.querySelector(".buttonLoader");
	const buttonText = event.target.querySelector(".buttonText");

	try {
		// Show loader and hide button text
		buttonLoader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		let response = await fetch("/api/dashboard/add-number", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: name,
				cc: countryCode,
				phoneNumber: phoneNumber,
			}),
		});

		response = await response.json();

		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");

		if (response.success) {
			document
				.getElementById("addNewNumberError")
				.classList.add("hidden");

			// Hide add number form and show verification form
			document.getElementById("addNumberForm").classList.add("hidden");
			document
				.getElementById("verifyNumberForm")
				.classList.remove("hidden");

			// Pass phone number to hidden input in the verify form
			document.getElementById("hiddenPhoneNumber").value = response.phoneNumberId;
		} else {
			// console.log(response);
			document
				.getElementById("addNewNumberError")
				.classList.remove("hidden");
			document.getElementById("addNewNumberError").innerText =
				response.message;
		}
	} catch (error) {
		document.getElementById("addNewNumberError").classList.remove("hidden");
		document.getElementById("addNewNumberError").innerText =
			"An error occurred. Please try again.";
	} finally {
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");
	}
}

async function verifyPhoneNumber(event) {
	event.preventDefault();

    const otpInputs = [ ...document.querySelectorAll(".otp-verify") ];
    console.log(otpInputs);
    const codeInput = otpInputs.map((input) => input.value).join("");
    console.log(codeInput);
	const phoneNumberInput = document.getElementById("hiddenPhoneNumber").value;

	const buttonLoader = event.target.querySelector(".buttonLoader");
	const buttonText = event.target.querySelector(".buttonText");

	try {
		buttonLoader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		const response = await fetch("/api/dashboard/verify-number", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				code: codeInput,
				phoneNumberId: phoneNumberInput,
			}),
		});

		const data = await response.json();

		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");

		if (data.success) {
			document
				.getElementById("verifyNewNumberError")
                .classList.add("hidden");
            document.getElementById("verifyNumberForm").classList.add("hidden");
			document.getElementById("twoFactorForm").classList.remove("hidden");
		} else {
			document
				.getElementById("verifyNewNumberError")
				.classList.remove("hidden");
			document.getElementById("verifyNewNumberError").innerText =
				data.message;
		}
	} catch (error) {
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");
		document
			.getElementById("verifyNewNumberError")
			.classList.remove("hidden");
		document.getElementById("verifyNewNumberError").innerText =
			error;
	}
}

async function selectPhoneNumber(event) {
	event.preventDefault(); // Prevent default form submission
	const phoneNumberId = event.target.phoneNumberId.value;
	const buttonLoader = event.target.querySelector(".buttonLoader");
	const buttonText = event.target.querySelector(".buttonText");

	try {
		// Show loader and hide button text
		buttonLoader.classList.remove("hidden");
		buttonText.classList.add("hidden");

		const response = await fetch("/api/dashboard/select-number", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				phoneNumberId,
			}),
		});

		// Hide loader and show button text after the request
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");

		if (response.ok) {
			window.location.reload(); // Reload the page or redirect
		} else {
			alert("Failed to select phone number. Please try again.");
		}
	} catch (error) {
		// Hide loader and show button text if an error occurs

		alert(error);
	} finally {
		buttonLoader.classList.add("hidden");
		buttonText.classList.remove("hidden");
	}
}

async function deletePhoneNumber(event, phoneNumberId) {
	event.stopPropagation();

	const buttonLoader = event.currentTarget.querySelector(".buttonLoader");
	const buttonText = event.currentTarget.querySelector(".buttonText");

	// Show loader (if present)
	if (buttonLoader) buttonLoader.classList.remove("hidden");
	if (buttonText) buttonText.classList.add("hidden");

	try {
		const response = await fetch("/api/dashboard/delete-phone-number", {
			method: "DELETE",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				phoneNumberId,
			}),
		});

		// Hide loader and show button text after the request
		if (buttonLoader) buttonLoader.classList.add("hidden");
		if (buttonText) buttonText.classList.remove("hidden");

		if (response.ok) {
			window.location.reload(); // Reload the page on success
		} else {
			const errorData = await response.json();
			alert("Failed to delete phone number: " + errorData.message);
		}
	} catch (error) {
		alert(error);
	} finally {
		if (buttonLoader) buttonLoader.classList.add("hidden");
		if (buttonText) buttonText.classList.remove("hidden");
	}
}

// Open the modal with a transition
function openAddNumber() {
	const modal = document.getElementById("addNumberModal");
	const modalContent = document.getElementById("modalContent");

	// Remove the "hidden" class to make the modal visible
	modal.classList.remove("hidden");

	// Use requestAnimationFrame to ensure transition triggers after the modal is visible
	requestAnimationFrame(() => {
		modal.classList.remove("opacity-0");
		modal.classList.add("opacity-100", "backdrop-blur-sm");
		modalContent.classList.remove("opacity-0", "scale-95");
		modalContent.classList.add("opacity-100", "scale-100");
	});
}

// Close the modal with a transition
function closeAddNumber() {
	const modal = document.getElementById("addNumberModal");
	const modalContent = document.getElementById("modalContent");

	// Clear all input values
	document.querySelectorAll("input").forEach((input) => (input.value = ""));

	// Reset any text content such as error, success, or status messages
	document
		.querySelectorAll(
			"#addNewNumberError, #verifyNewNumberError, #set2FAPinStatus",
		)
		.forEach((element) => {
			element.classList.add("hidden"); // Hide any error/success messages
			element.innerHTML = ""; // Clear innerHTML content
		});

	// Hide any loaders
	document.querySelectorAll(".buttonLoader").forEach((loader) => {
		loader.classList.add("hidden"); // Hide loaders
	});

	// Reverse the transition for closing modal
	modal.classList.remove("opacity-100", "backdrop-blur-sm");
	modal.classList.add("opacity-0");

	modalContent.classList.remove("opacity-100", "scale-100");
	modalContent.classList.add("opacity-0", "scale-95");

	// Wait for the transition to complete before hiding the modal
	setTimeout(() => {
		modal.classList.add("hidden");
	}, 300); // Match the duration of the CSS transition
}

function openSet2FAPin(phoneNumberId) {
	document.getElementById("hiddenPhoneNumber").value = phoneNumberId;
	document.getElementById("addNumberForm").classList.add("hidden");
	document.getElementById("twoFactorForm").classList.remove("hidden");
	openAddNumber();
}

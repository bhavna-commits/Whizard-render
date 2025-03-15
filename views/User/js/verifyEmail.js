// Ensure spinner is hidden initially
document.addEventListener("DOMContentLoaded", () => {
	document.getElementById("verifySpinner").style.display = "none";

	// Get email from the URL
	const urlParams = new URLSearchParams(window.location.search);
	const email = urlParams.get("number");

	// Pre-fill email input
	if (email) {
		document.getElementById("email").value = email;
	}

	const otpInputs = document.querySelectorAll(".otp-input");

	otpInputs.forEach((input, index) => {
		input.addEventListener("input", () => {
			// Move to the next input if the user types something
			if (input.value.length === 1 && index < otpInputs.length - 1) {
				otpInputs[index + 1].focus();
			}
		});

		input.addEventListener("keydown", (event) => {
			// Allow backspace to go to the previous input
			if (
				event.key === "Backspace" &&
				input.value.length === 0 &&
				index > 0
			) {
				otpInputs[index - 1].focus();
			}
		});

		input.addEventListener("paste", (event) => {
			// Handle paste
			const pasteData = event.clipboardData.getData("text");
			const otpArray = pasteData.split("").slice(0, otpInputs.length); // Take first 6 digits

			otpArray.forEach((char, i) => {
				otpInputs[i].value = char;
			});

			// Prevent the default paste action
			event.preventDefault();
		});
	});
	// Handle OTP verification (unchanged)
	document.getElementById("verifyOtp").addEventListener("click", async () => {
		const otpInputs = [...document.querySelectorAll(".otp-input")];
		const otp = otpInputs.map((input) => input.value).join("");

		// Show loading spinner and disable button
		const verifyText = document.getElementById("verifyText");
		const verifySpinner = document.getElementById("verifySpinner");
		verifyText.style.display = "none";
		verifySpinner.style.display = "inline-block";
		document.getElementById("verifyOtp").disabled = true;
		console.log(document.getElementById("email").value);

		try {
			// Make API request to verify OTP
			const response = await fetch("/api/users/verify-number", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					otp,
					number: document.getElementById("email").value,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				// OTP verified, redirect or show success message
				window.location.href = "/about";
			} else {
				throw new Error(data.message);
			}
		} catch (error) {
			// Show error message from the backend
			verifyText.style.display = "inline-block";
			verifySpinner.style.display = "none";
			document.getElementById("verifyOtp").disabled = false;
			verifyText.textContent = error.message;
		}
	});

	const resendButton = document.getElementById("resendOtp");
	const messageElement = document.getElementById("resendOtpMessage");

	let timer = 30;
	let interval;

	// Initial button setup for resend OTP
	resendButton.style.color = "#f8d7da"; // Pale red
	resendButton.style.cursor = "not-allowed"; // Not-allowed cursor
	resendButton.style.pointerEvents = "none"; // Disable interaction

	interval = setInterval(() => {
		timer--;
		resendButton.textContent = `Resend (${timer}s)`;

		if (timer <= 0) {
			clearInterval(interval);

			// Enable button
			resendButton.style.color = "#dc3545"; // Red
			resendButton.style.cursor = "pointer"; // Enable pointer cursor
			resendButton.style.pointerEvents = "auto"; // Enable interaction
			resendButton.textContent = "Resend";

			// Add hover effect
			resendButton.addEventListener("mouseover", () => {
				resendButton.style.color = "#a71d2a"; // Darker red on hover
			});
			resendButton.addEventListener("mouseout", () => {
				resendButton.style.color = "#dc3545"; // Reset to red when not hovering
			});
		}
	}, 1000);

	// Resend OTP button click event
	resendButton.addEventListener("click", async () => {
		if (resendButton.style.pointerEvents === "auto") {
			try {
				// Disable resend button and reset timer
				resendButton.style.color = "#f8d7da"; // Pale red
				resendButton.style.cursor = "not-allowed"; // Disable pointer cursor
				resendButton.style.pointerEvents = "none"; // Disable interaction
				timer = 30;

				interval = setInterval(() => {
					timer--;
					resendButton.textContent = `Resend (${timer}s)`;
					if (timer <= 0) {
						clearInterval(interval);
						resendButton.style.color = "#dc3545"; // Red
						resendButton.style.cursor = "pointer"; // Enable pointer cursor
						resendButton.style.pointerEvents = "auto"; // Enable interaction
						resendButton.textContent = "Resend";
					}
				}, 1000);

				// Call backend API to resend OTP
				const response = await fetch("/api/users/resend-whatsapp-otp", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						number: document.getElementById("email").value,
					}),
				});

				const data = await response.json();

				if (!response.ok) {
					// Show error message
					messageElement.classList.add("alert-danger");
					messageElement.classList.remove("alert-success");
					messageElement.textContent = data.message;
				} else {
					// Show success message
					messageElement.classList.add("alert-success");
					messageElement.classList.remove("alert-danger");
					messageElement.textContent = "OTP sent successfully";
				}

				// Display the message and auto-hide after a few seconds
				messageElement.style.display = "block";
				setTimeout(() => {
					messageElement.style.display = "none";
				}, 5000);
			} catch (error) {
				alert(error.message); // Alert backend error message
			}
		}
	});

	// Enable email input when "Change Email" is clicked
	document.getElementById("changeEmail").addEventListener("click", () => {
		document.getElementById("email").disabled = false; // Enable email input
		document.getElementById("email").focus(); // Set focus to the email input
	});
});

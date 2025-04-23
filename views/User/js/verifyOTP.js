document.addEventListener("DOMContentLoaded", () => {
	const successMessage = document.getElementById("successMessage");
	// Reusable function to attach OTP input behavior to a set of inputs
	attachOtpListeners(".otp-input");

	// Hide all spinners initially
	const spinnerIds = [
		"verifyCombinedSpinner",
		"verifyMobileSpinner",
		"verifyEmailSpinner",
	];
	spinnerIds.forEach((id) => {
		const spinner = document.getElementById(id);
		if (spinner) spinner.style.display = "none";
	});

	// Utility: collect OTP value from a given selector (assumes inputs are ordered)
	const getOtpValue = (selector) => {
		const inputs = document.querySelectorAll(selector);
		let otp = "";
		inputs.forEach((input) => {
			otp += input.value;
		});
		return otp;
	};

	// Utility: setup resend timer
	const setupResendTimer = (buttonId) => {
		const resendButton = document.getElementById(buttonId);
		let timer = 30;

		// Disable the button and add disabled styling class.
		resendButton.disabled = true;
		resendButton.classList.add("btn-disabled");
		resendButton.textContent = `Resend (${timer}s)`;

		const interval = setInterval(() => {
			timer--;
			if (timer > 0) {
				resendButton.textContent = `Resend (${timer}s)`;
			} else {
				clearInterval(interval);
				// When timer reaches 0, enable the button and remove disabled styling.
				resendButton.textContent = "Resend";
				resendButton.disabled = false;
				resendButton.classList.remove("btn-disabled");
			}
		}, 1000);

		return interval;
	};

	setupResendTimer("resendEmailOtp");

	// Combined OTP Form (if both OTP channels are enabled)
	const combinedOtpForm = document.getElementById("combinedOtpForm");
	if (combinedOtpForm) {
		combinedOtpForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const mobileOTP = getOtpValue(".mobile-otp-input");
			const emailOTP = getOtpValue(".email-otp-input");
			const verifyButton = document.getElementById("verifyCombinedOtp");
			const verifyText = document.getElementById("verifyCombinedText");
			const verifySpinner = document.getElementById(
				"verifyCombinedSpinner",
			);
			verifyText.style.display = "none";
			verifySpinner.style.display = "inline-block";
			verifyButton.disabled = true;

			try {
				const response = await fetch("/api/users/verify-otp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "both",
						emailOTP: emailOTP,
						mobileOTP: mobileOTP,
					}),
				});
				const data = await response.json();
				if (data.success) {
					window.location.href = "/";
				} else {
					successMessage.textContent = data.message;
					successMessage.style.color = "red";
					successMessage.style.display = "block";
				}
			} catch (error) {
				verifyText.style.display = "inline-block";
				verifySpinner.style.display = "none";
				verifyButton.disabled = false;
				successMessage.textContent = error.message;
				successMessage.style.color = "red";
				successMessage.style.display = "block";
			}
		});

		const resendCombinedOtp = document.getElementById("resendCombinedOtp");
		if (resendCombinedOtp) {
			resendCombinedOtp.addEventListener("click", async () => {
				if (resendCombinedOtp.style.pointerEvents === "auto") {
					setupResendTimer(
						"resendCombinedOtp",
						"resendCombinedOtpMessage",
					);
					try {
						const response = await fetch(
							"/api/users/resend-whatsapp-otp",
							{
								method: "POST",
								headers: { "Content-Type": "application/json" },
							},
						);
						const data = await response.json();
						const messageElement = document.getElementById(
							"resendCombinedOtpMessage",
						);
						if (!data.success) {
							successMessage.textContent = data.message;
							successMessage.style.color = "red";
							successMessage.style.display = "block";
						} else {
							successMessage.textContent = data.message;
							successMessage.style.color = "green";
							successMessage.style.display = "block";
						}

						setTimeout(() => {
							successMessage.style.display = "none";
						}, 5000);
					} catch (error) {
						console.error(error);
						successMessage.textContent = error.message;
						successMessage.style.color = "red";
						successMessage.style.display = "block";
					}
				}
			});
		}
	}

	// Mobile OTP Form (if only mobile is enabled)
	const mobileOtpForm = document.getElementById("mobileOtpForm");
	if (mobileOtpForm) {
		mobileOtpForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const otp = getOtpValue(".otp-input");
			const verifyButton = document.getElementById("verifyMobileOtp");
			const verifyText = document.getElementById("verifyMobileText");
			const verifySpinner = document.getElementById(
				"verifyMobileSpinner",
			);
			verifyText.style.display = "none";
			verifySpinner.style.display = "inline-block";
			verifyButton.disabled = true;

			try {
				const response = await fetch("/api/users/verify-otp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "mobile",
						otp: otp,
					}),
				});
				const data = await response.json();
				if (data.success) {
					window.location.href = "/";
				} else {
					successMessage.textContent = data.message;
					successMessage.style.color = "red";
					successMessage.style.display = "block";
				}
			} catch (error) {
				verifyText.style.display = "inline-block";
				verifySpinner.style.display = "none";
				verifyButton.disabled = false;
				successMessage.textContent = error.message;
				successMessage.style.color = "red";
				successMessage.style.display = "block";
			}
		});

		const resendMobileOtp = document.getElementById("resendMobileOtp");
		if (resendMobileOtp) {
			resendMobileOtp.addEventListener("click", async () => {
				if (resendMobileOtp.style.pointerEvents === "auto") {
					setupResendTimer(
						"resendMobileOtp",
						"resendMobileOtpMessage",
					);

					try {
						const response = await fetch("/api/users/resend-otp", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
						});
						const data = await response.json();

						if (!data.success) {
							successMessage.textContent = data.message;
							successMessage.style.color = "red";
							successMessage.style.display = "block";
						} else {
							successMessage.textContent = data.message;
							successMessage.style.color = "green";
							successMessage.style.display = "block";
						}

						setTimeout(() => {
							successMessage.style.display = "none";
						}, 5000);
					} catch (error) {
						console.error(error);
						successMessage.textContent = error.message;
						successMessage.style.color = "red";
						successMessage.style.display = "block";
					}
				}
			});
		}
	}

	// Email OTP Form (if only email is enabled)
	const emailOtpForm = document.getElementById("emailOtpForm");
	if (emailOtpForm) {
		emailOtpForm.addEventListener("submit", async (e) => {
			e.preventDefault();
			const otp = getOtpValue(".otp-input");
			const verifyButton = document.getElementById("verifyEmailOtp");
			const verifyText = document.getElementById("verifyEmailText");
			const verifySpinner = document.getElementById("verifyEmailSpinner");
			verifyText.style.display = "none";
			verifySpinner.style.display = "inline-block";
			verifyButton.disabled = true;

			try {
				const response = await fetch("/api/users/verify-otp", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type: "email",
						otp: otp,
					}),
				});
				const data = await response.json();
				if (data.success) {
					window.location.href = "/";
				} else {
					successMessage.textContent = data.message;
					successMessage.style.color = "red";
					successMessage.style.display = "block";
				}
			} catch (error) {
				verifyText.style.display = "inline-block";
				verifySpinner.style.display = "none";
				verifyButton.disabled = false;
				successMessage.textContent = error.message;
				successMessage.style.color = "red";
				successMessage.style.display = "block";
			} finally {
				verifyText.style.display = "inline-block";
				verifySpinner.style.display = "none";
				verifyButton.disabled = false;
			}
		});

		const resendEmailOtp = document.getElementById("resendEmailOtp");
		if (resendEmailOtp) {
			resendEmailOtp.addEventListener("click", async () => {
				setupResendTimer("resendEmailOtp", "resendEmailOtpMessage");
				console.log("ghjk");
				const verifyButton = document.getElementById("verifyEmailOtp");
				const verifyText = document.getElementById("verifyEmailText");
				const verifySpinner =
					document.getElementById("verifyEmailSpinner");
				verifyText.style.display = "none";
				verifySpinner.style.display = "inline-block";
				verifyButton.disabled = true;

				try {
					const response = await fetch(
						"/api/users/resend-whatsapp-otp",
						{
							method: "POST",
							headers: { "Content-Type": "application/json" },
						},
					);
					const data = await response.json();
					if (data.success) {
						successMessage.textContent = data.message;
						successMessage.style.color = "green";
						successMessage.style.display = "block";
					} else {
						successMessage.textContent = data.message;
						successMessage.style.color = "red";
						successMessage.style.display = "block";
					}
				} catch (error) {
					verifyText.style.display = "inline-block";
					verifySpinner.style.display = "none";
					verifyButton.disabled = false;
					successMessage.textContent = error.message;
					successMessage.style.color = "red";
					successMessage.style.display = "block";
				} finally {
					verifyText.style.display = "inline-block";
					verifySpinner.style.display = "none";
					verifyButton.disabled = false;
				}
			});
		}
	}

	// Optionally, handle "Change Email" if an element with that ID exists
	const changeEmailBtn = document.getElementById("changeEmail");
	if (changeEmailBtn) {
		changeEmailBtn.addEventListener("click", () => {
			const emailInput = document.getElementById("email");
			if (emailInput) {
				emailInput.disabled = false;
				emailInput.focus();
			}
		});
	}
});

function attachOtpListeners(selector) {
	const inputs = document.querySelectorAll(selector);
	if (!inputs.length) return; // Exit if no inputs are found

	inputs.forEach((input, index) => {
		// When a user types in an input, move focus to the next input if filled.
		input.addEventListener("input", () => {
			if (input.value.length === 1 && index < inputs.length - 1) {
				inputs[index + 1].focus();
			}
		});

		// Allow backspace to move to the previous input when the current is empty.
		input.addEventListener("keydown", (event) => {
			if (
				event.key === "Backspace" &&
				input.value.length === 0 &&
				index > 0
			) {
				inputs[index - 1].focus();
			}
		});

		// Handle paste events to fill all inputs automatically.
		input.addEventListener("paste", (event) => {
			event.preventDefault();
			const pasteData = event.clipboardData.getData("text");
			const otpArray = pasteData.split("").slice(0, inputs.length); // Limit to the number of inputs
			otpArray.forEach((char, i) => {
				inputs[i].value = char;
			});
		});
	});
}

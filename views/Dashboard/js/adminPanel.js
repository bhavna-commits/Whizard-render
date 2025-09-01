// CSS

function showTab(tab) {
	const formTab = document.getElementById("formTab");
	const tableTab = document.getElementById("tableTab");
	const formBtn = document.getElementById("formTabBtn");
	const tableBtn = document.getElementById("tableTabBtn");

	if (tab === "form") {
		formTab.classList.remove("hidden");
		tableTab.classList.add("hidden");

		// Button styling
		formBtn.classList.add("bg-black", "text-white");
		formBtn.classList.remove("text-gray-800");
		tableBtn.classList.add("text-gray-800");
		tableBtn.classList.remove("bg-black", "text-white");
	} else {
		tableTab.classList.remove("hidden");
		formTab.classList.add("hidden");

		// Button styling
		tableBtn.classList.add("bg-black", "text-white");
		tableBtn.classList.remove("text-gray-800");
		formBtn.classList.add("text-gray-800");
		formBtn.classList.remove("bg-black", "text-white");
	}
}

window.onload = () => showTab("table");

// Table

const searchInput = document.querySelector('input[placeholder="name, number, email"]');
const contactListTable = document.getElementById("tableWrapper");

let debounceTimer;

searchInput.addEventListener("input", function () {
	const query = searchInput.value;
	clearTimeout(debounceTimer);

	// Show loading spinner immediately
	contactListTable.innerHTML = `
        <div class="flex justify-center items-center h-96">
            <div class="animate-spin inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full"></div>
        </div>
    `;

	// Set new timer
	debounceTimer = setTimeout(async () => {
		try {
			const response = await fetch(
				`admin-panel/search/${encodeURIComponent(
					query,
				)}`,
			);

			if (response.ok) {
				const data = await response.text();
				contactListTable.innerHTML = data;
			} else {
				contactListTable.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-red-500 py-4 h-full w-full">
                            Error loading results
                        </td>
                    </tr>
                `;
			}
		} catch (error) {
			console.error("Error making the request", error);
			contactListTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-red-500 py-4 h-full w-full">
                        Network error - failed to fetch results
                    </td>
                </tr>
            `;
		}
	}, 300); // 300ms delay after typing stops
});

async function toggleUserStatus(btn) {
	const userId = btn.dataset.userId;
	const isActive = btn.dataset.status === "active";
	document.body.classList.add("cursor-wait");

	try {
		const res = await fetch(`/api/dashboard/${userId}/toggleStatus`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ blocked: isActive }),
		});

		if (!res.ok) throw new Error("Status update failed");

		const newStatus = !isActive;
		btn.dataset.status = newStatus ? "active" : "inactive";
		btn.textContent = newStatus ? "Set In-Active" : "Set Active";
		toast("success", `User is now ${newStatus ? "Active" : "In-Active"}`);
	} catch (err) {
		console.error(err);
		toast("error", err.message);
	} finally {
		document.body.classList.remove("cursor-wait");
	}
}

async function togglePaymentPlace(toggleElement) {
	const userId = toggleElement.dataset.userId;
	const currentStatus = toggleElement.dataset.status === "Internal";
	const newStatus = currentStatus ? "External" : "Internal"; // flip the status

	document.body.classList.add("cursor-wait");

	try {
		const res = await fetch(
			`/api/dashboard/${userId}/toggle-payment-place`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ status: newStatus }),
			},
		);

		if (!res.ok) throw new Error("Status update failed");

		// Update the toggle visually
		toggleElement.dataset.status = newStatus;

		const knob = toggleElement.querySelector(".knob");
		const bg = toggleElement.querySelector(".bg-toggle");
		const label =
			toggleElement.parentElement.querySelector(".status-label");

		const isInternal = newStatus === "Internal";

		knob.classList.toggle("translate-x-6", isInternal);
		knob.classList.toggle("translate-x-0", !isInternal);

		bg.classList.toggle("bg-black", isInternal);
		bg.classList.toggle("bg-gray-300", !isInternal);

		label.textContent = isInternal ? "Internal" : "External";
		label.classList.toggle("text-black", isInternal);
		label.classList.toggle("text-gray-500", !isInternal);
	} catch (err) {
		console.error(err);
		toast("error", err.message);
	} finally {
		document.body.classList.remove("cursor-wait");
	}
}

async function togglePaymentPlan(el) {
	if (el.dataset.busy === "1") return;
	el.dataset.busy = "1";

	const userId = el.dataset.userId;
	const current = el.dataset.status === "true";
	const next = !current;

	const knob = el.querySelector(".knob");
	const bg = el.querySelector(".bg-toggle");
	const label = el.parentElement.querySelector(".status-label");

	const setUI = (on) => {
		knob.classList.toggle("translate-x-6", on);
		knob.classList.toggle("translate-x-0", !on);
		bg.classList.toggle("bg-black", on);
		bg.classList.toggle("bg-gray-300", !on);
		label.textContent = on ? "Unlimited" : "Messages";
		label.classList.toggle("text-black", on);
		label.classList.toggle("text-gray-500", !on);
	};

	setUI(next);

	try {
		const res = await fetch(
			`/api/dashboard/${userId}/toggle-payment-plan`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: next }),
			},
		);
		if (!res.ok) throw new Error("Status update failed");
		el.dataset.status = String(next);
	} catch (e) {
		setUI(current);
		el.dataset.status = String(current);
		toast("error", e.message);
	} finally {
		el.dataset.busy = "0";
	}
}


async function resetAccount(event, id) {
	const btn = event.target;
	const originalHTML = btn.innerHTML;

	btn.disabled = true;
	btn.classList.add("opacity-50", "cursor-wait");

	btn.innerHTML = `
      <svg class="animate-spin h-5 w-5 text-gray-600 inline-block mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
    `;

	try {
		const res = await fetch(`/api/dashboard/${id}/reset`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await res.json();

		if (data.success) {
			toast("success", "Account reset successfully!");

			setTimeout(() => {
				location.reload();
			}, 500);
		} else {
			toast("error", "Reset failed: " + data.message);
		}
	} catch (err) {
		console.error("Reset error:", err);
		toast("error", err);
	} finally {
		btn.innerHTML = originalHTML;
		btn.disabled = false;
		btn.classList.remove("opacity-50", "cursor-wait");
	}
}

function closeAddNumber() {
	const modal = document.getElementById("addNumberModal");
	const modalContent = document.getElementById("modalContent");

	// Clear all input values
	document.querySelectorAll("input").forEach((input) => (input.value = ""));

	// Reset any text content such as error, success, or status messages
	document.querySelectorAll("#verifyNewNumberError").forEach((element) => {
		element.classList.add("hidden");
		element.innerHTML = "";
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

	// document.getElementById("addNumberForm").classList.remove("hidden");
	// document.getElementById("twoFactorForm").classList.add("hidden");
	document.getElementById("verifyNumberForm").classList.add("hidden");

	// Wait for the transition to complete before hiding the modal
	setTimeout(() => {
		modal.classList.add("hidden");
	}, 300); // Match the duration of the CSS transition
}

// Delete

const otpInputsDelete = document.querySelectorAll(".otp-verify-delete");

otpInputsDelete.forEach((input, index) => {
	input.addEventListener("keydown", (event) => {
		if (
			event.key === "Backspace" &&
			input.value.length === 0 &&
			index > 0
		) {
			otpInputsDelete[index - 1].focus();
		}
	});

	input.addEventListener("input", () => {
		input.value = input.value.replace(/\D/g, "");
		if (input.value.length === 1 && index < otpInputsDelete.length - 1) {
			otpInputsDelete[index + 1].focus();
		}
		checkOTPInputsAdmin(otpInputsDelete, "verifyDeleteButton");
	});

	input.addEventListener("paste", (event) => {
		let pasteData = event.clipboardData.getData("text").replace(/\D/g, "");
		const otpArray = pasteData.split("").slice(0, otpInputsDelete.length);
		otpArray.forEach((char, i) => {
			otpInputsDelete[i].value = char;
		});
		event.preventDefault();
		checkOTPInputsAdmin(otpInputsDelete, "verifyDeleteButton");
	});
});

function checkOTPInputsAdmin(i, b) {
	const allFilled = Array.from(i).every((input) => input.value.length === 1);
	const btn = document.getElementById(b);
	if (btn) {
		btn.disabled = !allFilled;
		btn.classList.toggle("bg-gray-400", !allFilled);
		btn.classList.toggle("cursor-not-allowed", !allFilled);
		btn.classList.toggle("bg-black", allFilled);
		btn.classList.toggle("cursor-pointer", allFilled);
	}
}

async function deleteAccountEmail(event, id) {
	const btn = event.target;
	const originalText = btn.innerHTML;
	const confirmed = await toastConfirm(
		"Are you sure you want to delete this account?",
	);
	if (!confirmed) return;

	btn.disabled = true;
	btn.innerHTML = `
		<svg class="animate-spin h-5 w-5 text-gray-600 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
		</svg>`;

	try {
		const res = await fetch(`/api/dashboard/${id}/delete-email`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		});

		const data = await res.json();
		if (data.success) {
			document.getElementById("otpUserId").value = id;
			document
				.getElementById("addNumberModal")
				.classList.remove("hidden", "opacity-0");
			document
				.getElementById("verifyNumberForm")
				.classList.remove("hidden");
		} else {
			toast("error", data.message || "Something went wrong.");
		}
	} catch (err) {
		console.error("Error deleting account:", err);
		toast("error", "Error occurred during deletion.");
	} finally {
		btn.disabled = false;
		btn.innerHTML = originalText;
	}
}

async function verifyDeleteOTP(event) {
	event.preventDefault();
	const btn = document.getElementById("verifyDeleteButton");
	const loader = btn.querySelector(".buttonLoader");
	const btnText = btn.querySelector(".buttonText");
	btn.disabled = true;
	loader.classList.remove("hidden");
	btnText.classList.add("hidden");

	const otp = Array.from(document.querySelectorAll(".otp-verify"))
		.map((input) => input.value)
		.join("");
	const id = document.getElementById("otpUserId").value;

	try {
		const verifyRes = await fetch(`/api/dashboard/${id}/verify-delete`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ otp }),
		});

		const verifyData = await verifyRes.json();
		if (verifyData.success) {
			toast("success", "Account deleted successfully.");
			location.reload();
		} else {
			document.getElementById("verifyNewNumberError").textContent =
				verifyData.message || "Invalid OTP.";
			document
				.getElementById("verifyNewNumberError")
				.classList.remove("hidden");
		}
	} catch (err) {
		console.error("OTP Verification Error:", err);
		toast("error", "Error verifying OTP.");
	} finally {
		btn.disabled = false;
		loader.classList.add("hidden");
		btnText.classList.remove("hidden");
	}
}

// Email

function setupTogglePassword(toggleId, inputId, openId, closedId) {
	const toggle = document.getElementById(toggleId);
	const input = document.getElementById(inputId);
	const visibleIcon = document.getElementById(openId);
	const hiddenIcon = document.getElementById(closedId);

	toggle.addEventListener("click", () => {
		const isCurrentlyVisible = input.type === "text";
		input.type = isCurrentlyVisible ? "password" : "text";

		visibleIcon.classList.toggle("hidden", !isCurrentlyVisible);
		hiddenIcon.classList.toggle("hidden", isCurrentlyVisible);
	});
}

setupTogglePassword(
	"togglePassword",
	"password",
	"visibleConfirmPassword",
	"notVisibleConfirmPassword",
);

setupTogglePassword(
	"toggleConfirmPassword",
	"confirmPassword",
	"visibleConfirmIcon",
	"notVisibleConfirmIcon",
);

const otpInputsEmail = document.querySelectorAll(".otp-verify-email");

otpInputsEmail.forEach((input, index) => {
	input.addEventListener("keydown", (event) => {
		if (
			event.key === "Backspace" &&
			input.value.length === 0 &&
			index > 0
		) {
			otpInputsEmail[index - 1].focus();
		}
	});

	input.addEventListener("input", () => {
		input.value = input.value.replace(/\D/g, "");
		if (input.value.length === 1 && index < otpInputsEmail.length - 1) {
			otpInputsEmail[index + 1].focus();
		}
		checkOTPInputsAdmin(otpInputsEmail, "verifyEmailButton");
	});

	input.addEventListener("paste", (event) => {
		let pasteData = event.clipboardData.getData("text").replace(/\D/g, "");
		const otpArray = pasteData.split("").slice(0, otpInputsEmail.length);
		otpArray.forEach((char, i) => {
			otpInputsEmail[i].value = char;
		});
		event.preventDefault();
		checkOTPInputsAdmin(otpInputsEmail, "verifyEmailButton");
	});
});

async function changeSuperAdminEmail(event) {
	event.preventDefault();

	const btn = document.querySelector('button[type="submit"]');
	const loader = btn.querySelector(".buttonLoader");
	const btnText = btn.querySelector(".buttonText");
	const emailInput = document.getElementById("email");
	const passwordInput = document.getElementById("password");
	const confirmPasswordInput = document.getElementById("confirmPassword");
	const outerModal = document.getElementById("addNumberModal");
	const innerModal = document.getElementById("verifyEmailForm");

	// console.log(outerModal, innerModal);

	const email = emailInput?.value.trim();
	const password = passwordInput?.value.trim();
	const confirmPassword = confirmPasswordInput?.value.trim();

	const passwordError = document.getElementById("passwordError");
	const confirmPasswordError = document.getElementById(
		"confirmPasswordError",
	);
	const emailWarning = document.getElementById("emailWarning");

	// Start loading
	btn.disabled = true;
	loader.classList.remove("hidden");
	btnText.classList.add("hidden");

	// Validate email format
	if (!emailInput) {
		toast("error", "No email input found.");
		return resetBtn();
	}

	const personalEmailPattern =
		/@(gmail\.com|yahoo\.com|hotmail\.com|aol\.com|outlook\.com|icloud\.com|live\.com|msn\.com|mail\.com|zoho\.com|yandex\.com|protonmail\.com|gmx\.com|me\.com|fastmail\.com|pm\.me|mailinator\.com|tutanota\.com|10minutemail\.com|guerrillamail\.com|temp-mail\.org|getnada\.com|maildrop\.cc|trashmail\.com|fakeinbox\.com|dispostable\.com|sharklasers\.com|mailnesia\.com|yopmail\.com|throwawaymail\.com|mohmal\.com|emailondeck\.com|temporarymail\.com|tempmail\.net|luxusmail\.com|anonbox\.net|burnermail\.io|mytemp\.email)$/i;

	if (personalEmailPattern.test(email)) {
		emailWarning?.classList.remove("hidden");
		return resetBtn();
	} else {
		emailWarning?.classList.add("hidden");
	}

	// Password validation
	const passwordRegex =
		/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

	if (!passwordRegex.test(password)) {
		passwordError.style.display = "block";
		passwordError.textContent =
			"Password must be at least 8 characters long, include 1 lowercase, 1 uppercase letter, 1 number, and 1 special character.";
		return resetBtn();
	} else {
		passwordError.style.display = "none";
	}

	if (password !== confirmPassword) {
		confirmPasswordError.style.display = "block";
		confirmPasswordError.textContent = "Passwords do not match.";
		return resetBtn();
	} else {
		confirmPasswordError.style.display = "none";
	}

	try {
		const res = await fetch(`/api/dashboard/change-superadmin-email-otp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		const data = await res.json();

		if (data.success) {
			toast("success", data.message);
			outerModal.classList.remove("hidden", "opacity-0");
			innerModal.classList.remove("hidden");
		} else {
			toast("error", data.message || "Something went wrong.");
		}
	} catch (err) {
		console.error("Email change error:", err);
		toast("error", "Something went wrong.");
	} finally {
		resetBtn();
	}

	function resetBtn() {
		btn.disabled = false;
		loader.classList.add("hidden");
		btnText.classList.remove("hidden");
	}
}

async function verifyEmailOTP(event) {
	event.preventDefault();
	const btn = document.getElementById("verifyEmailButton");
	const loader = btn.querySelector(".buttonLoader");
	const btnText = btn.querySelector(".buttonText");
	btn.disabled = true;
	loader.classList.remove("hidden");
	btnText.classList.add("hidden");

	const otp = Array.from(document.querySelectorAll(".otp-verify-email"))
		.map((input) => input.value)
		.join("");

	try {
		const verifyRes = await fetch(
			`/api/dashboard/verify-superadmin-email`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ otp }),
			},
		);

		const verifyData = await verifyRes.json();
		if (verifyData.success) {
			toast("success", "Email changed successfully.");
			location.reload();
		} else {
			document.getElementById("verifyEmailError").textContent =
				verifyData.message || "Invalid OTP.";
			document
				.getElementById("verifyEmailError")
				.classList.remove("hidden");
		}
	} catch (err) {
		console.error("OTP Verification Error:", err);
		toast("error", "Error verifying OTP.");
	} finally {
		btn.disabled = false;
		loader.classList.add("hidden");
		btnText.classList.remove("hidden");
	}
}

async function changeSuperAdminToken(event) {
	event.preventDefault();

	const form = event.target;
	const btn = form.querySelector('button[type="submit"]');
	const loader = btn.querySelector(".buttonLoader");
	const btnText = btn.querySelector(".buttonText");
	const tokenInput = form.querySelector('input[name="token"]');

	if (!tokenInput) {
		toast("error", "Token input not found.");
		return;
	}

	const token = tokenInput.value.trim();

	if (!token) {
		toast("error", "Please enter a token.");
		return;
	}

	btn.disabled = true;
	loader.classList.remove("hidden");
	btnText.classList.add("hidden");

	try {
		const res = await fetch(`/api/dashboard/renew-admin-token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});

		const data = await res.json();

		if (data.success) {
			toast("success", data.message);
			setTimeout(() => {
				location.href = "/";
			}, 300);
		} else {
			toast("error", data.message || "Something went wrong.");
		}
	} catch (err) {
		console.error("Token change error:", err);
		toast("error", "Something went wrong.");
	} finally {
		btn.disabled = false;
		loader.classList.add("hidden");
		btnText.classList.remove("hidden");
	}
}

// Migration

const btn = document.getElementById("runMigrationBtn");
btn?.addEventListener("click", async () => {
	btn.disabled = true;
	btn.textContent = "Running...";
	try {
		const res = await fetch("/api/dashboard/run-migration");
		const data = await res.json();
		if (data.success) {
			toast("success", "Migration done ✅");
			location.reload();
		} else {
			toast("error", "Migration failed ❌");
			btn.disabled = false;
			btn.textContent = "Run Migration";
		}
	} catch (e) {
		console.error(e);
		toast("error", "Something went wrong");
		btn.disabled = false;
		btn.textContent = "Run Migration";
	}
});

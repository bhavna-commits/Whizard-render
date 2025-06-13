async function toggleUserStatus(toggleElement) {
	const userId = toggleElement.dataset.userId;
	const isActive = toggleElement.dataset.status === "active";
	document.body.classList.add("cursor-wait");

	try {
		const res = await fetch(`/api/dashboard/${userId}/toggleStatus`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ blocked: isActive }),
		});

		if (!res.ok) throw new Error("Status update failed");

		const newStatus = !isActive;
		toggleElement.dataset.status = newStatus ? "active" : "inactive";

		const knob = toggleElement.querySelector(".knob");
		const bg = toggleElement.querySelector(".bg-toggle");
		const label =
			toggleElement.parentElement.querySelector(".status-label");

		knob.classList.toggle("translate-x-6", newStatus);
		knob.classList.toggle("translate-x-0", !newStatus);

		bg.classList.toggle("bg-green-500", newStatus);
		bg.classList.toggle("bg-gray-300", !newStatus);

		label.textContent = newStatus ? "Active" : "In-Active";
		label.classList.toggle("text-green-600", newStatus);
		label.classList.toggle("text-gray-500", !newStatus);
	} catch (err) {
		console.error(err);
		toast("error", err.message);
	} finally {
		document.body.classList.remove("cursor-wait");
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

const otpInputs = document.querySelectorAll(".otp-verify");

otpInputs.forEach((input, index) => {
	input.addEventListener("keydown", (event) => {
		if (
			event.key === "Backspace" &&
			input.value.length === 0 &&
			index > 0
		) {
			otpInputs[index - 1].focus();
		}
	});

	input.addEventListener("input", () => {
		input.value = input.value.replace(/\D/g, "");
		if (input.value.length === 1 && index < otpInputs.length - 1) {
			otpInputs[index + 1].focus();
		}
		checkOTPInputs();
	});

	input.addEventListener("paste", (event) => {
		let pasteData = event.clipboardData.getData("text").replace(/\D/g, "");
		const otpArray = pasteData.split("").slice(0, otpInputs.length);
		otpArray.forEach((char, i) => {
			otpInputs[i].value = char;
		});
		event.preventDefault();
		checkOTPInputs();
	});
});

function checkOTPInputs() {
	const allFilled = Array.from(otpInputs).every(
		(input) => input.value.length === 1,
	);
	const btn = document.getElementById("verifyButton");
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
	const btn = document.getElementById("verifyButton");
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
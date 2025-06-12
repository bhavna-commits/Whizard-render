async function toggleUserStatus(toggleElement) {
	const userId = toggleElement.dataset.userId;
	const isActive = toggleElement.dataset.status === "active";

	try {
		// Call your API
		const res = await fetch(`/api/dashboard/${userId}/toggleStatus`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				blocked: isActive,
			}),
		});

		if (!res.ok) throw new Error("Status update failed");

		// Toggle UI
		const newStatus = !isActive;
		toggleElement.dataset.status = newStatus ? "active" : "inactive";

		const knob = toggleElement.querySelector(".knob");
		const bg = toggleElement.querySelector(".bg-toggle");
		const label =
			toggleElement.parentElement.querySelector(".status-label");

		// Update classes
		knob.classList.toggle("translate-x-6", newStatus);
		knob.classList.toggle("translate-x-0", !newStatus);

		bg.classList.toggle("bg-green-500", newStatus);
		bg.classList.toggle("bg-gray-300", !newStatus);

		label.textContent = newStatus ? "active" : "inactive";
		label.classList.toggle("text-green-600", newStatus);
		label.classList.toggle("text-gray-500", !newStatus);
	} catch (err) {
		console.error(err);
		toast("error", err);
	}
}

async function resetAccount(id) {
	const btn = event.target;
	const originalHTML = btn.innerHTML;

	btn.disabled = true;
	btn.classList.add("opacity-50", "cursor-wait");

	// Inject spinner into button
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
			toast("success","Account reset successfully!");
			// location.reload(); // optional
		} else {
			toast("error","Reset failed: " + data.message);
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

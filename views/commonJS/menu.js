function toggleDropdown() {
    const dropdownMenu = document.getElementById("downMenu");
    console.log(dropdownMenu);
	dropdownMenu.classList.toggle("hidden");

	const sidebar = document.querySelector(".sidebar");

	if (dropdownMenu.classList.contains("hidden")) {
		sidebar.style.overflow = "auto";
	} else {
		sidebar.style.overflow = "visible";
	}
}

async function logout() {
	try {
		const response = await fetch("/api/users/logout", {
			method: "POST",
			credentials: "same-origin",
		});

		if (response.ok) {
			window.location.href = "/login";
		} else {
			alert("Error logging out.");
		}
	} catch (err) {
		console.error("Error:", err);
		alert("Error logging out.");
	}
}

// Close the dropdown if clicked outside
window.onclick = function (event) {
	const dropdown = document.getElementById("downMenu");
	const sidebar = document.querySelector(".sidebar");
	if (!event.target.closest(".user-profile")) {
		dropdown.classList.add("hidden");
		sidebar.style.overflow = "auto";
	}
};

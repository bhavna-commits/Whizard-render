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

window.onclick = function (event) {
	// Handling the dropdown menu
	const dropdown = document.getElementById("downMenu");
	const reportMenu = document.getElementById("reportMenu");
	const sidebar = document.querySelector(".sidebar");

	// Close dropdown if clicked outside
	if (!event.target.closest(".user-profile")) {
		dropdown.classList.add("hidden");
	}

	// Close report menu if clicked outside
	if (
		!event.target.closest(".report-menu") &&
		!event.target.closest("#reportMenu")
	) {
		reportMenu.classList.add("hidden");
	}

	// Adjust sidebar overflow
	if (
		dropdown.classList.contains("hidden") &&
		reportMenu.classList.contains("hidden")
	) {
		sidebar.style.overflow = "auto";
	} else {
		sidebar.style.overflow = "visible";
	}
};

function getReportsMenu() {
	const reportMenu = document.getElementById("reportMenu");
	console.log(reportMenu);
	reportMenu.classList.toggle("hidden");

	const sidebar = document.querySelector(".sidebar");

	if (reportMenu.classList.contains("hidden")) {
		sidebar.style.overflow = "auto";
	} else {
		sidebar.style.overflow = "visible";
	}
}
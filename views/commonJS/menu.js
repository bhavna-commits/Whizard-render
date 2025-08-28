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

window.addEventListener("click", function (event) {
	// Handling the dropdown menu
	const dropdown = document.getElementById("downMenu");
	const reportMenu = document.getElementById("reportMenu");
	const sidebar = document.querySelector(".sidebar ul");

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
})	;

function getReportsMenu() {
	const reportMenu = document.getElementById("reportMenu");
	console.log(reportMenu);
	reportMenu.classList.toggle("hidden");

	const sidebar = document.querySelector(".sidebar ul");

	if (reportMenu.classList.contains("hidden")) {
		sidebar.style.overflow = "auto";
	} else {
		sidebar.style.overflow = "visible";
	}
}

document.querySelectorAll(".info-icon").forEach((icon) => {
	const tooltip = icon.nextElementSibling;

	if (tooltip && tooltip.classList.contains("tooltip")) {
		icon.addEventListener("mouseenter", () => {
			tooltip.classList.remove("invisible", "opacity-0");
			tooltip.classList.add("visible", "opacity-100");
		});

		icon.addEventListener("mouseleave", () => {
			tooltip.classList.add("invisible", "opacity-0");
			tooltip.classList.remove("visible", "opacity-100");
		});
	}
});

const progressBar = document.getElementById("progress-bar");
const loader = document.getElementById("loader");
let progress = 0;

// Track different loading phases
const updateProgress = (newProgress) => {
	progress = Math.max(progress, Math.min(newProgress, 100));
	progressBar.style.width = `${progress}%`;
};

// Initial DOM loading
document.addEventListener("readystatechange", () => {
	if (document.readyState === "interactive") {
		updateProgress(30);
	}
});

// Track images loading
document.addEventListener("DOMContentLoaded", () => {
	const images = document.images;
	const totalImages = images.length;
	let loadedImages = 0;

	if (totalImages === 0) {
		updateProgress(70);
		return;
	}

	const imageProgressHandler = () => {
		loadedImages++;
		updateProgress(30 + (loadedImages / totalImages) * 40);
	};
	
	Array.from(images).forEach((img) => {
		if (img.complete) imageProgressHandler();
		else img.addEventListener("load", imageProgressHandler);
	});
});

// Final window load
window.addEventListener("load", () => {
	updateProgress(100);	
	setTimeout(() => {
		loader.classList.add("hidden");
	}, 500);
});

// Fallback in case load events fail
setTimeout(() => {
	if (progress < 100) {
		updateProgress(100);
		loader.classList.add("hidden");
	}
}, 5000);

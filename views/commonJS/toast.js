(function () {
	// Create a container for toast notifications
	const toastContainer = document.createElement("div");
	toastContainer.id = "toast-container";
	// Tailwind classes: fixed at top right with some spacing and a high z-index
	toastContainer.className =
		"fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex flex-col space-y-2";
	document.body.appendChild(toastContainer);

	// Global toast function
	window.toast = function (type, message) {
		// Create the toast element
		const toastElem = document.createElement("div");
		// Base Tailwind styling for toast appearance
		toastElem.className =
			"max-w-xs w-full text-sm font-medium rounded shadow p-4 transform transition-all duration-300 ease-in-out";

		// Set the background color based on the type
		switch (type) {
			case "success":
				toastElem.classList.add("bg-green-500", "text-white");
				break;
			case "error":
				toastElem.classList.add("bg-red-500", "text-white");
				break;
			case "info":
				toastElem.classList.add("bg-gray-500", "text-white");
				break;
			default:
				toastElem.classList.add("bg-gray-500", "text-white");
		}

		// Set the message content
		toastElem.innerHTML = `<span>${message}</span>`;

		// Append the toast element to the container
		toastContainer.appendChild(toastElem);

		// Force a reflow to ensure CSS transitions (optional)
		void toastElem.offsetWidth;

		// Auto-dismiss after 3 seconds with a fade-out and slight slide transition
		setTimeout(() => {
			toastElem.classList.add("opacity-0", "translate-x-4");
			// Remove the element after the transition completes (300ms)
			setTimeout(() => {
				toastElem.remove();
			}, 300);
		}, 3000);
	};
})();

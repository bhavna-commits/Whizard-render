(function () {
	// Create a container for toast notifications
	const toastContainer = document.createElement("div");
	toastContainer.id = "toast-container";
	// Tailwind classes: fixed at top center with spacing and high z-index
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

	// Global confirmation toast function
	// Returns a promise that resolves to true (Yes) or false (No)
	window.toastConfirm = function (message = "") {
		return new Promise((resolve) => {
			/* ========== CREATE OVERLAY ========== */
			const overlay = document.createElement("div");
			overlay.className =
				"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 transition-opacity duration-300";
			document.body.appendChild(overlay);

			/* ========== CREATE MODAL WRAPPER ========== */
			const modalWrapper = document.createElement("div");
			modalWrapper.className =
				"relative bg-white text-black w-11/12 max-w-sm rounded-lg shadow-xl " +
				"transform transition-all duration-300 ease-in-out opacity-0 translate-y-4 " +
				"p-6 pt-14";
			overlay.appendChild(modalWrapper);

			/* ========== MESSAGE ========== */
			const modalMessage = document.createElement("h2");
			modalMessage.className = "text-center text-xl font-medium text-gray-700 mb-6";
			modalMessage.innerHTML = message;
			modalWrapper.appendChild(modalMessage);

			/* ========== BUTTONS CONTAINER ========== */
			const buttonContainer = document.createElement("div");
			buttonContainer.className = "flex justify-center space-x-4";
			modalWrapper.appendChild(buttonContainer);

			/* ========== CANCEL BUTTON ========== */
			const cancelButton = document.createElement("button");
			cancelButton.textContent = "Cancel";
			cancelButton.className =
				"bg-gray-200 text-gray-800 rounded px-5 py-2 hover:bg-gray-300 transition-colors";
			buttonContainer.appendChild(cancelButton);

			/* ========== DELETE BUTTON ========== */
			const deleteButton = document.createElement("button");
			deleteButton.textContent = "Delete";
			deleteButton.className =
				"bg-black text-white rounded px-5 py-2 hover:bg-gray-800 transition-colors";
			buttonContainer.appendChild(deleteButton);

			/* ========== SHOW MODAL (Entrance) ========== */
			requestAnimationFrame(() => {
				overlay.classList.remove("opacity-0");
				overlay.classList.add("opacity-100");
				modalWrapper.classList.remove("opacity-0", "translate-y-4");
				modalWrapper.classList.add("opacity-100", "translate-y-0");
			});

			/* ========== CLOSE MODAL (Exit) ========== */
			const closeModal = (returnValue) => {
				// Animate out
				overlay.classList.remove("opacity-100");
				overlay.classList.add("opacity-0");
				modalWrapper.classList.remove("opacity-100", "translate-y-0");
				modalWrapper.classList.add("opacity-0", "translate-y-4");

				// After transition, remove elements and resolve
				setTimeout(() => {
					overlay.remove();
					resolve(returnValue);
				}, 300);
			};

			/* ========== EVENT LISTENERS ========== */
			// Cancel => resolve(false)
			cancelButton.addEventListener("click", () => closeModal(false));
			// Delete => resolve(true)
			deleteButton.addEventListener("click", () => closeModal(true));
			// Clicking outside the modal => resolve(false)
			overlay.addEventListener("click", (event) => {
				// If user clicks directly on the overlay (not the modal content)
				if (event.target === overlay) {
					closeModal(false);
				}
			});
		});
	};
})();

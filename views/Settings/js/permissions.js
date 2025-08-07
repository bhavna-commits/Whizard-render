// Initialize permission state with all values set to false
const permissionState = {
	dashboard: {
		connectNow: false,
		viewUsers: false,
		quickActions: false,
		addPhoneNumber: false,
	},
	chats: {
		redirectToVpchat: false,
		view: false,
		chat: false,
		allChats: false,
	},
	contactlist: {
		type: false,
		addContactIndividual: false,
		addContactListCSV: false,
		editContactIndividual: false,
		deleteContactIndividual: false,
		deleteList: false,
		sendBroadcast: false,
		customField: false,
		allList: false,
		downloadList: false,
	},
	templates: {
		type: false,
		editTemplate: false,
		createTemplate: false,
		deleteTemplate: false,
		duplicateTemplate: false,
	},
	reports: {
		type: false,
		conversationReports: {
			type: false,
			viewReports: false,
			retargetingUsers: false,
			redirectToVpchat: false,
		},
		costReports: false,
	},
	settings: {
		type: false,
		userManagement: {
			type: false,
			addUser: false,
			addPermission: false,
			deletePermission: false,
			editPermission: false,
		},
		activityLogs: false,
		manageTags: {
			type: false,
			delete: false,
			add: false,
			view: false,
		},
		whatsAppAccountDetails: false,
		accountDetails: false,
		payment: false,
	},
};

function initializeDashboardSection() {
	// Find the dashboard section by matching the header text
	const sections = document.querySelectorAll(".toggle-section");
	let dashboardSection;
	sections.forEach((section) => {
		const title = section
			.querySelector("h2")
			.textContent.trim()
			.toLowerCase();
		if (title === "dashboard") {
			dashboardSection = section;
		}
	});

	if (!dashboardSection) {
		console.warn("Dashboard section not found.");
		return;
	}

	// Attach event listeners to all checkboxes in the dashboard section
	const dashboardCheckboxes = dashboardSection.querySelectorAll(
		"input[type='checkbox']",
	);
	dashboardCheckboxes.forEach((checkbox) => {
		checkbox.addEventListener("change", () =>
			handleDashboardOptionToggle(checkbox),
		);
	});
}

function initializeChatsSection() {
	// Find the dashboard section by matching the header text
	const sections = document.querySelectorAll(".toggle-section");
	let dashboardSection;
	sections.forEach((section) => {
		const title = section
			.querySelector("h2")
			.textContent.trim()
			.toLowerCase();
		if (title === "chats") {
			dashboardSection = section;
		}
	});

	if (!dashboardSection) {
		console.warn("Chats section not found.");
		return;
	}

	// Attach event listeners to all checkboxes in the dashboard section
	const dashboardCheckboxes = dashboardSection.querySelectorAll(
		"input[type='checkbox']",
	);
	dashboardCheckboxes.forEach((checkbox) => {
		checkbox.addEventListener("change", () =>
			handleChatsOptionToggle(checkbox),
		);
	});
}

function handleChatsOptionToggle(checkbox) {
	const isChecked = checkbox.checked;
	const permissionKey = checkbox.value; // e.g., "connectNow", "quickActions", "addPhoneNumber"

	// Update the dashboard permissions state
	if (permissionState.chats.hasOwnProperty(permissionKey)) {
		permissionState.chats[permissionKey] = isChecked;
	} else {
		console.warn(
			`Permission key "${permissionKey}" not defined in dashboard state.`,
		);
	}

	// Optionally update the label styling if needed
	const label = checkbox.nextElementSibling;
	if (label) {
		// For example, apply a class when checked (adjust as needed)
		label.classList.toggle("text-gray-900", isChecked);
		label.classList.toggle("text-gray-500", !isChecked);
	}
}

function handleDashboardOptionToggle(checkbox) {
	const isChecked = checkbox.checked;
	const permissionKey = checkbox.value; // e.g., "connectNow", "quickActions", "addPhoneNumber"

	// Update the dashboard permissions state
	if (permissionState.dashboard.hasOwnProperty(permissionKey)) {
		permissionState.dashboard[permissionKey] = isChecked;
	} else {
		console.warn(
			`Permission key "${permissionKey}" not defined in dashboard state.`,
		);
	}

	// Optionally update the label styling if needed
	const label = checkbox.nextElementSibling;
	if (label) {
		// For example, apply a class when checked (adjust as needed)
		label.classList.toggle("text-gray-900", isChecked);
		label.classList.toggle("text-gray-500", !isChecked);
	}
}

function populateEditForm(editPermission) {
	// Loop over each section on the page
	document.querySelectorAll(".toggle-section").forEach((section) => {
		// Get section name from the <h2> text, convert to lowercase and remove spaces
		let sectionName = section
			.querySelector("h2")
			.textContent.toLowerCase()
			.replace(/\s+/g, "");
		// For "contactlist", map to "contactList" from backend
		let editSection =
			editPermission[sectionName] ||
			(sectionName === "contactlist"
				? editPermission["contactList"]
				: null);
		
		console.log(sectionName);
		if (sectionName === "dashboard" || sectionName === "chats") {
			// For dashboard, update checkboxes regardless of a toggle state
			if (editSection) {
				section
					.querySelectorAll("input[type='checkbox']")
					.forEach((checkbox) => {
						const permKey = checkbox.value;
						if (editSection[permKey]) {
							checkbox.checked = true;
							updatePermissionState(checkbox, true);
							// updateCheckboxLabel(checkbox);
						}
					});
			}
		} else {
			// For sections that use a toggle switch
			if (editSection && editSection.type) {
				// Enable the section toggle (simulate a click/change)
				const toggle = section.querySelector(".section-toggle");
				if (toggle && !toggle.checked) {
					toggle.checked = true;
					toggle.dispatchEvent(new Event("change")); // triggers handleSectionToggle
				}

				// Loop through the option checkboxes in this section
				section
					.querySelectorAll(".option-checkbox")
					.forEach((checkbox) => {
						const permKey = checkbox.value;
						// If this permission is set to true in the editPermission data, check it
						if (editSection[permKey]) {
							checkbox.checked = true;
							checkbox.dispatchEvent(new Event("change"));
							updatePermissionState(checkbox, true);
							updateCheckboxLabel(checkbox);

							// If the option has nested checkboxes (like conversationReports or manageTags)
							if (
								(permKey === "userManagement" ||
									permKey === "conversationReports") &&
								editSection[permKey]
							) {
								// Find nested options container
								const nestedOptions = checkbox
									.closest("div")
									.querySelector(".nested-options");
								if (nestedOptions) {
									nestedOptions
										.querySelectorAll(".nested-checkbox")
										.forEach((nestedCheckbox) => {
											const nestedKey =
												nestedCheckbox.value;
											if (
												editSection[permKey][nestedKey]
											) {
												nestedCheckbox.checked = true;
												updatePermissionState(
													nestedCheckbox,
													true,
												);
												updateCheckboxLabel(
													nestedCheckbox,
												);
											}
										});
								}
							}
						}
					});
			}
		}
	});
}

function handleSectionToggle(section, isEnabled) {
	const sectionName = section
		.querySelector("h2")
		.textContent.toLowerCase()
		.replace(/\s+/g, "");
	// console.log(sectionName);
	const toggleLabel = section.querySelector(".toggle-label");
	const optionCheckboxes = section.querySelectorAll(".option-checkbox");
	const nestedCheckboxes = section.querySelectorAll(".nested-checkbox");

	// Update toggle label
	toggleLabel.textContent = isEnabled ? "Yes" : "No";
	toggleLabel.classList.toggle("text-gray-900", isEnabled);
	toggleLabel.classList.toggle("text-gray-500", !isEnabled);

	// Update permission state
	permissionState[sectionName].type = isEnabled;

	// Handle option checkboxes
	optionCheckboxes.forEach((checkbox) => {
		checkbox.disabled = !isEnabled;
		if (!isEnabled) {
			checkbox.checked = false;
			updatePermissionState(checkbox, false);
		}
		updateCheckboxLabel(checkbox);
	});

	// Always disable nested checkboxes when section is toggled off
	nestedCheckboxes.forEach((checkbox) => {
		checkbox.disabled = true;
		checkbox.checked = false;
		updatePermissionState(checkbox, false);
		updateCheckboxLabel(checkbox);
	});
}

function handleOptionToggle(checkbox) {
	const isChecked = checkbox.checked;
	const nestedOptions = checkbox
		.closest("div")
		?.querySelector(".nested-options");

	// Only handle nested options if this checkbox is meant to have them
	if (
		nestedOptions &&
		(checkbox.value === "userManagement" ||
			checkbox.value === "conversationReports")
	) {
		const nestedCheckboxes =
			nestedOptions.querySelectorAll(".nested-checkbox");
		nestedCheckboxes.forEach((nestedCheckbox) => {
			nestedCheckbox.disabled = !isChecked;
			if (!isChecked) {
				nestedCheckbox.checked = false;
				updatePermissionState(nestedCheckbox, false);
			}
			updateCheckboxLabel(nestedCheckbox);
		});
	}

	updatePermissionState(checkbox, isChecked);
	updateCheckboxLabel(checkbox);
}

function updateCheckboxLabel(checkbox) {
	const label = checkbox.nextElementSibling;
	if (label) {
		const isEnabled =
			!checkbox.disabled &&
			checkbox.closest(".toggle-section").querySelector(".section-toggle")
				.checked;
		label.classList.toggle("text-gray-900", isEnabled);
		label.classList.toggle("text-gray-500", !isEnabled);
	}
}

function updatePermissionState(checkbox, value) {
	const section = checkbox.closest(".toggle-section");
	const sectionName = section
		.querySelector("h2")
		.textContent.toLowerCase()
		.replace(/\s+/g, "");
	const checkboxValue = checkbox.value;
	console.log(
		`Updating permission: [${sectionName}][${checkboxValue}] = ${value}`,
	);
	// Special handling for nested checkboxes
	if (checkbox.classList.contains("nested-checkbox")) {
		const parentDiv = checkbox.closest("div").parentElement;
		const parentCheckbox = parentDiv.querySelector(".option-checkbox");
		const parentValue = parentCheckbox.value;

		if (
			sectionName === "reports" &&
			parentValue === "conversationReports"
		) {
			permissionState.reports.conversationReports[checkboxValue] = value;
		} else if (
			sectionName === "settings" &&
			parentValue === "userManagement"
		) {
			permissionState.settings.userManagement[checkboxValue] = value;
		}
	} else {
		// Handle regular checkboxes based on section
		switch (sectionName) {
			case "contactlist":
				permissionState.contactlist[checkboxValue] = value;
				break;
			case "reports":
				if (checkboxValue === "conversationReports") {
					permissionState.reports.conversationReports.type = value;
				} else if (checkboxValue === "costReports") {
					permissionState.reports.costReports = value;
				}
				break;
			case "settings":
				if (checkboxValue === "userManagement") {
					permissionState.settings.userManagement.type = value;
				} else if (
					permissionState.settings.hasOwnProperty(checkboxValue)
				) {
					permissionState.settings[checkboxValue] = value;
				}
				break;
			default:
				if (
					permissionState[sectionName]?.hasOwnProperty(checkboxValue)
				) {
					permissionState[sectionName][checkboxValue] = value;
				}
				break;
		}
	}
}

function initializeForm() {
	// Initialize all checkboxes as disabled
	document
		.querySelectorAll(".option-checkbox, .nested-checkbox")
		.forEach((checkbox) => {
			checkbox.disabled = true;
			updateCheckboxLabel(checkbox);
		});

	// Initialize section toggles
	document.querySelectorAll(".section-toggle").forEach((toggle) => {
		toggle.addEventListener("change", (e) => {
			const section = e.target.closest(".toggle-section");
			handleSectionToggle(section, e.target.checked);
		});
	});

	// Initialize option checkboxes
	document.querySelectorAll(".option-checkbox").forEach((checkbox) => {
		checkbox.addEventListener("change", () => handleOptionToggle(checkbox));
	});

	// Initialize nested checkboxes
	document.querySelectorAll(".nested-checkbox").forEach((checkbox) => {
		checkbox.addEventListener("change", () => {
			updatePermissionState(checkbox, checkbox.checked);
			updateCheckboxLabel(checkbox);
		});
	});
}

function initializeFormSubmission() {
	// console.log("here");
	const form = document.getElementById("roleForm");
	const submitButton = form.querySelector('button[type="submit"]');
	const submitButtonText = submitButton.textContent.trim();

	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		submitButton.disabled = true;
		submitButton.innerHTML = `
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 inline-block text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Adding Role...
        `;

		const formData = {
			name: form.querySelector('input[id="roleName"]').value,
			permissions: permissionState,
		};

		try {
			const response = await fetch(
				"/api/settings/user-management/permissions/create",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(formData),
				},
			);

			if (response.ok) {
				toast("success", "Role added successfully!");
				location.href = "/settings/user-management";
			} else {
				const error = await response.json();
				toast("error", error.message);
			}
		} catch (error) {
			console.error("Error submitting form:", error);
			toast("error", error.message);
		} finally {
			submitButton.disabled = false;
			submitButton.textContent = submitButtonText;
		}
	});
}

function initializeEditFormSubmission() {
	const form = document.getElementById("roleForm");
	const submitButton = form.querySelector('button[type="submit"]');
	const submitButtonText = submitButton.textContent.trim();

	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		submitButton.disabled = true;
		submitButton.innerHTML = `
      <svg class="animate-spin -ml-1 mr-3 h-5 w-5 inline-block text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Updating Role...
    `;

		// Gather form data as before
		const formData = {
			// name: form.querySelector('input[id="roleName"]').value,
			permissions: permissionState,
		};

		try {
			// Assuming that editPermission.unique_id is available on the page
			const response = await fetch(
				"/api/settings/user-management/permissions/edit?id=" +
					encodeURIComponent(editPermissionJS.unique_id),
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(formData),
				},
			);

			if (response.ok) {
				toast("success", "Role updated successfully!");
				location.href = "/settings/user-management";
			} else {
				const error = await response.json();
				toast("error", error.message);
			}
		} catch (error) {
			console.error("Error submitting edit form:", error);
			toast("error", error.message);
		} finally {
			submitButton.disabled = false;
			submitButton.textContent = submitButtonText;
		}
	});
}

function resetPermissionState() {
	// Reset permission state object
	Object.keys(permissionState).forEach((key) => {
		if (typeof permissionState[key] === "object") {
			Object.keys(permissionState[key]).forEach((subKey) => {
				if (typeof permissionState[key][subKey] === "object") {
					Object.keys(permissionState[key][subKey]).forEach(
						(nestedKey) => {
							permissionState[key][subKey][nestedKey] = false;
						},
					);
				} else {
					permissionState[key][subKey] = false;
				}
			});
		} else {
			permissionState[key] = false;
		}
	});

	// Reset all form elements
	document.querySelectorAll(".section-toggle").forEach((toggle) => {
		toggle.checked = false;
		handleSectionToggle(toggle.closest(".toggle-section"), false);
	});
}

document.addEventListener("DOMContentLoaded", function () {
	initializeForm(); // existing initialization for toggles and checkboxes
	initializeDashboardSection();
	initializeChatsSection();
	if (editPermissionJS) {
		initializeEditFormSubmission();
		populateEditForm(editPermissionJS);
		// Optionally update the submit button label (if not rendered via templating)
		// const submitButton = document.querySelector('button[type="submit"]');
		// submitButton.textContent = "Edit Role";
	} else {
		initializeFormSubmission();
	}
});

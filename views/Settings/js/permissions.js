document.addEventListener("DOMContentLoaded", function () {
	const form = document.getElementById("permissionForm");
	const toggleButtons = document.querySelectorAll(
		".toggle-button, .sub-toggle",
	);
	const toggleSectionButtons = document.querySelectorAll(".toggle-section");

	// Initialize permission state
	const permissionState = {
		dashboard: {
			connectNow: false,
			viewUsers: false,
			quickActions: false,
		},
		chats: false,
		contactList: {
			addContactIndividual: false,
			addContactListCSV: false,
			deleteList: false,
			sendBroadcast: false,
		},
		templates: {
			editTemplate: false,
			createTemplate: false,
			deleteTemplate: false,
		},
		reports: {
			conversationReports: {
				viewReports: false,
				retargetingUsers: false,
				redirectToVpchat: false,
			},
			costReports: false,
		},
		settings: {
			userManagement: false,
			activityLogs: false,
			manageTags: {
				delete: false,
				add: false,
				view: false,
			},
		},
	};

	// Toggle button handler
	function handleToggle(button, isMainToggle = false) {
		const isActive = button.classList.contains("bg-red-400");
		const togglePath = button.dataset.toggle;

		if (isActive) {
			button.classList.remove("bg-red-400");
			button.classList.add("bg-gray-200");
			button.querySelector("div").classList.remove("translate-x-7");
		} else {
			button.classList.remove("bg-gray-200");
			button.classList.add("bg-red-400");
			button.querySelector("div").classList.add("translate-x-7");
		}

		updatePermissionState(togglePath, !isActive, isMainToggle);
	}

	// Update permission state
	function updatePermissionState(path, value, isMainToggle) {
		const parts = path.split(".");
		let current = permissionState;

		if (isMainToggle) {
			// Handle main section toggle
			current[parts[0]] = value;

			// Update UI of sub-toggles
			const section = document.querySelector(
				`[data-section="${parts[0]}"]`,
			);
			if (section) {
				const subToggles = section.querySelectorAll(".sub-toggle");
				subToggles.forEach((toggle) => {
					if (!value) {
						toggle.classList.remove("bg-red-400");
						toggle.classList.add("bg-gray-200");
						toggle
							.querySelector("div")
							.classList.remove("translate-x-7");
					}
					toggle.disabled = !value;
				});
			}
		} else {
			// Handle sub-toggles
			for (let i = 0; i < parts.length - 1; i++) {
				if (!current[parts[i]]) current[parts[i]] = {};
				current = current[parts[i]];
			}
			current[parts[parts.length - 1]] = value;
		}
	}

	// Initialize toggle buttons
	toggleButtons.forEach((button) => {
		button.addEventListener("click", () => handleToggle(button));
	});

	// Initialize section toggles
	toggleSectionButtons.forEach((button) => {
		button.addEventListener("click", function () {
			handleToggle(this, true);
			const section = document.querySelector(
				`[data-section="${this.dataset.toggle}"]`,
			);
			if (section) {
				if (section.classList.contains("hidden")) {
					section.classList.remove("hidden");
				} else {
					section.classList.add("hidden");
				}
			}
		});
	});

	// Form submission
	form.addEventListener("submit", async function (e) {
		e.preventDefault();

		const formData = {
			name: form.querySelector('input[name="role"]').value,
			permissions: permissionState,
		};

		try {
			const response = await fetch(
				"/api/settings/user-management/permissions/update",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(formData),
				},
			);

			if (response.ok) {
				alert("Permissions saved successfully!");
			} else {
				const error = await response.json();
				alert(`Error saving permissions: ${error.message}`);
			}
		} catch (error) {
			console.error("Error submitting form:", error);
			alert(`Error saving permissions: ${error.message}`);
		}
	});
});

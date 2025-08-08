document.addEventListener("DOMContentLoaded", () => {
	const loadMoreBtn = document.getElementById("loadMoreBtn");
	const tbody = document.querySelector("tbody");
	const id = location.pathname.split("/").pop();

	let bodyCheckboxes = () =>
		document.querySelectorAll(".checkboxBody input[type='checkbox']");
	const headCheckbox = document.querySelector(
		".checkboxHead input[type='checkbox']",
	);
	const headText = document.querySelector(".checkboxHead .checkboxText");

	const selectionBar = document.getElementById("selectionBar");
	const selectedCountSpan = document.getElementById("selectedCount");
	const clearSelectionBtn = document.getElementById("clearSelection");
	const sendBroadcastBtn = document.getElementById("sendBroadcast");

	const updateHeadCheckboxState = () => {
		const checkboxes = bodyCheckboxes();
		const checked = [...checkboxes].filter((cb) => cb.checked);
		const anyChecked = checked.length > 0;
		const allChecked = checked.length === checkboxes.length;

		headCheckbox.style.opacity = anyChecked ? "1" : "0";
		headCheckbox.style.pointerEvents = anyChecked ? "auto" : "none";
		headText.style.opacity = anyChecked ? "0" : "1";

		headCheckbox.checked = allChecked;
	};

	const updateSelectionUI = () => {
		const checked = [...bodyCheckboxes()].filter((cb) => cb.checked);
		selectedCountSpan.textContent = checked.length;
		if (checked.length === 0) {
			selectionBar.classList.replace("opacity-100", "opacity-0");
		} else {
			selectionBar.classList.replace("opacity-0", "opacity-100");
		}
	};

	const bindRowEvents = (row) => {
		const checkbox = row.querySelector(
			".checkboxBody input[type='checkbox']",
		);
		const sno = row.querySelector(".checkboxBody .checkboxText");

		row.addEventListener("mouseenter", () => {
			if (!checkbox.checked) {
				checkbox.style.opacity = "1";
				checkbox.style.pointerEvents = "auto";
				sno.style.opacity = "0";
			}
		});
		row.addEventListener("mouseleave", () => {
			if (!checkbox.checked) {
				checkbox.style.opacity = "0";
				checkbox.style.pointerEvents = "none";
				sno.style.opacity = "1";
			}
		});

		checkbox.addEventListener("change", () => {
			sno.style.opacity = checkbox.checked ? "0" : "1";
			checkbox.style.opacity = checkbox.checked ? "1" : "0";
			checkbox.style.pointerEvents = checkbox.checked ? "auto" : "none";
			updateHeadCheckboxState();
			updateSelectionUI();
		});
	};

	document
		.querySelectorAll("tbody tr:not(.text-gray-400)")
		.forEach(bindRowEvents);

	headCheckbox.addEventListener("change", () => {
		const checkboxes = bodyCheckboxes();
		checkboxes.forEach((cb) => {
			cb.checked = headCheckbox.checked;
			cb.style.opacity = headCheckbox.checked ? "1" : "0";
			cb.style.pointerEvents = headCheckbox.checked ? "auto" : "none";

			const sno = cb
				.closest(".checkboxBody")
				.querySelector(".checkboxText");
			sno.style.opacity = headCheckbox.checked ? "0" : "1";
		});
		updateHeadCheckboxState();
		updateSelectionUI();
	});

	clearSelectionBtn.addEventListener("click", () => {
		bodyCheckboxes().forEach((cb) => {
			cb.checked = false;
			cb.style.opacity = "0";
			cb.style.pointerEvents = "none";
			const sno = cb
				.closest(".checkboxBody")
				.querySelector(".checkboxText");
			sno.style.opacity = "1";
		});
		headCheckbox.checked = false;
		updateSelectionUI();
		updateHeadCheckboxState();
	});

	sendBroadcastBtn.addEventListener("click", async () => {
		const selectedReports = [...bodyCheckboxes()]
			.filter((cb) => cb.checked)
			.map((cb) => {
				const row = cb.closest("tr");
				const contactName = row
					.querySelector("td:nth-child(2)")
					?.textContent.trim();
				const recipientPhone = row
					.querySelector("td:nth-child(3)")
					?.ariaLabel?.trim();
				return { contactName, recipientPhone };
			});

		try {
			const res = await fetch("/api/reports/create-broadcast", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					reports: selectedReports,
					attributes: contact.masterExtra,
					contactListId: contact.contactId,
				}),
			});
			const data = await res.json();

			if (data.success) {
				location.href = "/reports/campaign-list/broadcast";
			} else {
				toast("error", data.message);
			}
		} catch (error) {
			console.error("Error broadcasting reports:", error);
			toast("error", error);
		}
	});

	loadMoreBtn.addEventListener("click", async function () {
		if (currentPage >= totalPage) return;
		currentPage++;

		this.innerHTML = `
                        <div class="flex items-center justify-center w-full h-full">
                            <div class="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        </div>
                        `;

		try {
			const res = await fetch(
				`/contact-list/more-contacts/${id}?page=${currentPage}`,
			);
			const html = await res.text();

			// Create a temporary table to parse the returned rows safely
			const tempTable = document.createElement("table");
			tempTable.innerHTML = html;

			tempTable.querySelectorAll("tr").forEach((newRow) => {
				bindRowEvents(newRow);
				tbody.appendChild(newRow);
			});

			document.querySelectorAll(".date-cell").forEach((el) => {
				const rawDate = el.getAttribute("data-date");
				if (rawDate) {
					const date = new Date(Number(rawDate));
					const formatted = date.toLocaleString("en-GB", {
						year: "numeric",
						month: "short",
						day: "2-digit",
					});
					el.textContent = formatted;
				}
			});

			if (currentPage >= totalPage) {
				loadMoreBtn.style.display = "none";
			}
		} catch (err) {
			console.error("Failed to load more:", err);
			toast("error", "Failed to load more");
			
        } finally {
            this.innerHTML = "Load More";
        }
	});

	updateHeadCheckboxState();
	updateSelectionUI();
});

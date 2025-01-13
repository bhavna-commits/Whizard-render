document.addEventListener("DOMContentLoaded", function () {
	const dateRange = document.getElementById("dateRange");
	const actionFilter = document.getElementById("actionFilter");

	// Trigger change event when a filter is selected
	dateRange.addEventListener("change", applyFilters);
	actionFilter.addEventListener("change", applyFilters);

	function applyFilters() {
		const selectedDateRange = dateRange.value;
		const selectedAction = actionFilter.value;
		// console.log(selectedDateRange, selectedAction);

		fetch(
			`/settings/activity-logs/filtered?dateRange=${selectedDateRange}&action=${selectedAction}`,
		)
			.then((response) => response.text())
			.then((html) => {
				document.getElementById("activityLogs").innerHTML = html;
			})
			.catch((error) => console.error("Error fetching logs:", error));
	}
});

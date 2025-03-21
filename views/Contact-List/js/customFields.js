document.addEventListener("DOMContentLoaded", function () {
	const addFieldForm = document.getElementById("addFieldForm");

	if (addFieldForm) {
		addFieldForm.addEventListener("submit", async function (e) {
			e.preventDefault();

			const formData = {
				fieldName: this.fieldName.value,
				fieldType: this.fieldType.value,
			};

			try {
				const response = await fetch("/api/contact-list/custom-fields", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(formData),
				});

				if (response.ok) {
					window.location.reload();
				} else {
					const data = await response.json();
					toast("error",data.message || "Error adding custom field");
				}
			} catch (error) {
				console.error("Error:", error);
				toast("error","Error adding custom field");
			}
		});
	}
});

async function deleteField(fieldId) {
	if (!confirm("Are you sure you want to delete this field?")) {
		return;
	}

	try {
		const response = await fetch(
			`/api/contact-list/custom-fields/${fieldId}`,
			{
				method: "DELETE",
			},
		);

		if (response.ok) {
			window.location.reload();
		} else {
			const data = await response.json();
			toast("error",data.message || "Error deleting custom field");
		}
	} catch (error) {
		console.error("Error:", error);
		toast("error","Error deleting custom field");
	}
}

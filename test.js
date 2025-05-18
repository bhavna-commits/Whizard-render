console.log(
	new Date(1747483199224)
		.toLocaleString("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		})
		.replace(",", " at"),
);

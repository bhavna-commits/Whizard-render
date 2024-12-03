document.addEventListener("DOMContentLoaded", function () {
  // Initialize Flatpickr
  flatpickr("#startDate", {
    dateFormat: "Y-m-d",
    maxDate: "today",
  });

  flatpickr("#endDate", {
    dateFormat: "Y-m-d",
    maxDate: "today",
  });

  const filterBtn = document.getElementById("filterBtn");
  const filterSidebar = document.getElementById("filterSidebar");
  const overlay = document.getElementById("overlay");
  const closeBtn = document.getElementById("closeBtn");
  const applyBtn = document.getElementById("applyBtn");
  const lastMonthOptions = document.querySelectorAll(".last-month-option");

  // Open sidebar
  filterBtn.addEventListener("click", () => {
    filterSidebar.classList.add("open");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  // Close sidebar
  function closeSidebar() {
    filterSidebar.classList.remove("open");
    overlay.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  closeBtn.addEventListener("click", closeSidebar);
  overlay.addEventListener("click", closeSidebar);

  // Handle last month options
  lastMonthOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const value = option.dataset.value;
      const today = new Date();
      let startDate = new Date();

      switch (value) {
        case "week":
          startDate.setDate(today.getDate() - 7);
          break;
        case "twoWeeks":
          startDate.setDate(today.getDate() - 14);
          break;
        case "month":
          startDate.setMonth(today.getMonth() - 1);
          break;
      }

      document.getElementById("startDate").value = startDate
        .toISOString()
        .split("T")[0];
      document.getElementById("endDate").value = today
        .toISOString()
        .split("T")[0];
    });
  });

  // Handle apply button
  applyBtn.addEventListener("click", () => {
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if (startDate && endDate) {
      // Here you can handle the date filter application
      console.log("Applying filter:", { startDate, endDate });
      // Add your filter logic here

      closeSidebar();
    } else {
      alert("Please select both start and end dates");
    }
  });
});

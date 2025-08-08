const carousel = document.querySelector(".carousel");
const images = document.querySelectorAll(".carousel img");
const dotsContainer = document.querySelector(".carousel-dots");
let currentIndex = 0;
let interval;

// Create dots
images.forEach((_, index) => {
	const dot = document.createElement("div");
	dot.classList.add("carousel-dot");
	if (index === 0) dot.classList.add("active");
	dot.addEventListener("click", () => goToImage(index));
	dotsContainer.appendChild(dot);
});

const dots = document.querySelectorAll(".carousel-dot");

function goToImage(index) {
	// Clear existing interval
	clearInterval(interval);

	// Remove active classes
	images[currentIndex].classList.remove("active", "prev", "next");
	dots[currentIndex].classList.remove("active");

	// Determine transition direction
	const direction = index > currentIndex ? "next" : "prev";

	// Set new current index
	currentIndex = index;

	// Add appropriate classes
	images[currentIndex].classList.add("active", direction);
	dots[currentIndex].classList.add("active");

	// Remove transition classes after animation
	setTimeout(() => {
		images[currentIndex].classList.remove(direction);
	}, 800);

	// Restart interval
	startInterval();
}

function showNextImage() {
	const nextIndex = (currentIndex + 1) % images.length;
	goToImage(nextIndex);
}

function startInterval() {
	interval = setInterval(showNextImage, 5000);
}

// Initialize first image and dots
images[currentIndex].classList.add("active");
dots[currentIndex].classList.add("active");
startInterval();

// // Pause on hover
// carousel.addEventListener("mouseenter", () => clearInterval(interval));
// carousel.addEventListener("mouseleave", startInterval);
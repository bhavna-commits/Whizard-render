// Function to open and fetch emojis
async function openEmojis() {
	const emojiContainer = document.getElementById("emojiContainer");
	const emojiList = document.getElementById("emojiList");

	// Toggle the emoji container visibility
	if (emojiContainer.classList.contains("hidden")) {
		emojiContainer.classList.remove("hidden");
		// console.log(emojiContainer.classList.contains("hidden"));
		// Fetch emojis from the API
		if (emojiList.children.length === 0) {
			const emojis = await fetchEmojis();
			displayEmojis(emojis);
		}
	} else {
		emojiContainer.classList.add("hidden");
	}
}

// Function to fetch all emojis from the API
async function fetchEmojis() {
	const API_KEY = "999934c047229545f8b9cbd94bb3d58d4fd83264";
	const BASE_URL = `https://emoji-api.com/emojis?access_key=${API_KEY}`;
	const emojiList = document.getElementById("emojiList");

	// Show loading spinner
	emojiList.innerHTML = `
    <div class="flex justify-center items-center w-[400px] ">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  `;

	try {
		const response = await fetch(BASE_URL);
		const emojis = await response.json();

		// Once the emojis are fetched, display them
		return emojis;
	} catch (error) {
		console.error("Error fetching emojis:", error);
		emojiList.innerHTML = `<p class="text-red-500 text-center">Error loading emojis</p>`;
	}
}

// Function to display emojis in the emojiList div
// Function to display emojis in the emojiList div
function displayEmojis(emojis) {
	const emojiList = document.getElementById("emojiList");
	emojiList.innerHTML = ""; // Clear any previous emojis

	emojis.forEach((emoji) => {
		const emojiItem = document.createElement("div");
		emojiItem.classList.add("text-2xl", "cursor-pointer", "z-10");
		emojiItem.textContent = emoji.character;

		// Handle emoji click to insert emoji at the cursor position in the contenteditable div
		emojiItem.addEventListener("click", () => {
			insertEmojiAtCursor(emoji.character); // Insert emoji at cursor
		});

		emojiList.appendChild(emojiItem);
	});
}

// Function to insert the emoji at the current cursor position in the contenteditable div
function insertEmojiAtCursor(emoji) {
	const bodyInput = document.getElementById("bodyInput");

	// Insert the emoji at the end of the content
	bodyInput.textContent = bodyInput.textContent + emoji;

	// Focus the bodyInput to bring the cursor back
	bodyInput.focus();

	// Move the cursor to the end of the content
	const range = document.createRange();
	const selection = window.getSelection();

	range.selectNodeContents(bodyInput); // Select all content in bodyInput
	range.collapse(false); // Collapse the range to the end (false = end)

	selection.removeAllRanges(); // Clear any existing selection ranges
	selection.addRange(range); // Add the new range with the cursor at the end
}

// Search input for filtering emojis
document.getElementById("emojiSearch").addEventListener("input", async (e) => {
	const query = e.target.value.trim();

	if (query.length > 0) {
		const emojis = await searchEmojis(query);
		displayEmojis(emojis);
	} else {
		const emojis = await fetchEmojis(); // Fetch all emojis if input is cleared
		displayEmojis(emojis);
	}
});

// Function to fetch emojis based on search query
async function searchEmojis(query) {
	const API_KEY = "999934c047229545f8b9cbd94bb3d58d4fd83264"; // Replace with your actual API key
	const SEARCH_URL = `https://emoji-api.com/emojis?search=${query}&access_key=${API_KEY}`;
	const emojiList = document.getElementById("emojiList");
	// Show loading spinner
	emojiList.innerHTML = `
    <div class="flex justify-center items-center w-[400px]">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  `;

	try {
		const response = await fetch(SEARCH_URL);
		const emojis = await response.json();
		return emojis;
	} catch (error) {
		console.error("Error searching emojis:", error);
		return [];
	}
}

// Close the emoji container if clicked outside
document.addEventListener("click", (event) => {
	const emojiContainer = document.getElementById("emojiContainer");
	const emojiBtn = document.getElementById("emojiBtn");

	if (
		emojiContainer &&
		!emojiContainer.contains(event.target) &&
		event.target !== emojiBtn
	) {
		emojiContainer.classList.add("hidden");
	}
});

function addBrackets() {
    const bodyInput = document.getElementById("bodyInput");

	// Insert the emoji at the end of the content
	bodyInput.textContent = bodyInput.textContent + "{}";

	// Focus the bodyInput to bring the cursor back
	bodyInput.focus();

	// Move the cursor to the end of the content
	const range = document.createRange();
	const selection = window.getSelection();

	range.selectNodeContents(bodyInput); // Select all content in bodyInput
	range.collapse(false); // Collapse the range to the end (false = end)

	selection.removeAllRanges(); // Clear any existing selection ranges
	selection.addRange(range); 
}

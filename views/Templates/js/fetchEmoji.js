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

		return emojis;
	} catch (error) {
		console.error("Error fetching emojis:", error);
		emojiList.innerHTML = `<p class="text-red-500 text-center">Error loading emojis</p>`;
	}
}

function displayEmojis(emojis) {
	const emojiList = document.getElementById("emojiList");
	emojiList.innerHTML = "";

	emojis.forEach((emoji) => {
		const emojiItem = document.createElement("div");
		emojiItem.classList.add("text-2xl", "cursor-pointer", "z-10");
		emojiItem.textContent = emoji.character;

		emojiItem.addEventListener("click", () => {
			insertEmojiAtCursor(emoji.character);
		});

		emojiList.appendChild(emojiItem);
	});
}

function insertEmojiAtCursor(emoji) {
	const bodyInput = document.getElementById("bodyInput");
	bodyInput.focus(); // Focus on the contenteditable div

	const selection = window.getSelection();

	// Ensure there is a valid selection
	if (!selection.rangeCount) return;

	const range = selection.getRangeAt(0);

	// If selection is collapsed (no text selected, just a cursor)
	if (range.collapsed) {
		const emojiNode = document.createTextNode(emoji); // Create emoji text node

		// Insert the emoji at the current position (cursor)
		range.insertNode(emojiNode);

		// Move the cursor right after the emoji
		range.setStartAfter(emojiNode);
		range.setEndAfter(emojiNode);

		// Update the selection to reflect the new range
		selection.removeAllRanges();
		selection.addRange(range);
	} else {
		// Handle the case where text is selected (to replace selected text with emoji)
		range.deleteContents(); // Delete the selected content
		const emojiNode = document.createTextNode(emoji); // Create emoji text node
		range.insertNode(emojiNode); // Insert the emoji at the selection position

		// Move the cursor after the inserted emoji
		range.setStartAfter(emojiNode);
		range.setEndAfter(emojiNode);

		// Update the selection to reflect the new range
		selection.removeAllRanges();
		selection.addRange(range);
	}
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
	bodyInput.focus();

	// Create a range object for the current selection
	const range = document.getSelection().getRangeAt(0);

	// Create a document fragment to hold the brackets
	const bracketText = document.createTextNode("{}");

	// Insert the brackets at the current caret position
	range.insertNode(bracketText);

	// Adjust the range to place the cursor between the brackets
	range.setStart(bracketText, 1); // Move to between the {}
	range.setEnd(bracketText, 1); // Collapse the range so it's a caret

	// Apply the new selection range
	const selection = window.getSelection();
	selection.removeAllRanges();
	selection.addRange(range);
}

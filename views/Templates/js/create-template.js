document
	.getElementById("bodyInput")
	?.addEventListener("keypress", function (event) {
		if (event.key === "Enter") {
			document.execCommand("formatBlock", false, "p");
			document.execCommand("fontSize", false, "2");
		}
	});

document.querySelectorAll(".custom-drop-toggle").forEach((button) => {
	button.addEventListener("click", function () {
		const dropdownMenu = this.nextElementSibling;
		dropdownMenu.classList.toggle("show");
	});
});

document.addEventListener("click", function (event) {
	if (!event.target.matches(".custom-dropdown-toggle")) {
		document.querySelectorAll(".custom-dropdown-menu").forEach((menu) => {
			menu.classList.remove("show");
		});
	}
});

document
	.getElementById("mediaTypeDropdown")
	?.addEventListener("change", function (e) {
		const selectedValue = e.target.value;
		const previewHeader = document.getElementById("previewHeader");
		const previewHead = document.getElementById("previewHead");

		// Reset preview content and alignment
		previewHeader.innerHTML = "";
		previewHeader.style.textAlign = "left";
		previewHeader.style.display = "block";
		previewHeader.style.justifyContent = "flex-start";
		previewHeader.style.alignItems = "flex-start";

		if (selectedValue === "text") {
			// Set text alignment to left for text content
			previewHeader.textContent = "Header Text Preview";
			document
				.getElementById("headerInput")
				.addEventListener("input", (e) => {
					previewHeader.textContent =
						e.target.value || "Header Text Preview";
					previewHead.textContent =
						e.target.value || "Header Text Preview";
				});
		} else if (selectedValue === "media") {
			previewHeader.style.display = "flex";
			previewHeader.style.justifyContent = "center";
			previewHeader.style.alignItems = "center";

			const mediaType = document.getElementById("mediaType").value;
			const fileInput = document.getElementById("file-upload").files[0];
			// console.log(fileInput);
			if (mediaType === "image" && fileInput) {
				const img = document.createElement("img");
				img.src = URL.createObjectURL(fileInput);
				img.style.width = "auto";
				img.style.height = "auto";
				img.style.objectFit = "contain";
				// Append to previewHeader
				previewHeader.appendChild(img);

				const imgClone = img.cloneNode(true);
				previewHead.innerHTML = "";
				previewHead.appendChild(imgClone);
			} else if (mediaType === "video" && fileInput) {
				const video = document.createElement("video");
				video.src = URL.createObjectURL(fileInput);
				video.controls = true;
				video.style.width = "auto";
				video.style.height = "auto";
				video.style.objectFit = "contain";
				// Append to previewHeader
				previewHeader.appendChild(video);

				// Clone the video and append to previewHead
				const videoClone = video.cloneNode(true);
				previewHead.innerHTML = "";
				previewHead.appendChild(videoClone);
			} else if (mediaType === "document" && fileInput) {
				if (fileInput.type === "application/pdf") {
					const iframe = document.createElement("iframe");
					iframe.src = URL.createObjectURL(fileInput);
					iframe.style.maxWidth = "100%";
					iframe.style.height = "auto";
					iframe.style.objectFit = "contain";
					// Append to previewHeader
					previewHeader.appendChild(iframe);
					previewHead.innerHTML = "";
					// Clone the iframe and append to previewHead
					const iframeClone = iframe.cloneNode(true); // Create a deep clone
					previewHead.appendChild(iframeClone);
				} else {
					// For other document types, just show the file name
					previewHeader.textContent =
						"Uploaded File: " + fileInput.name;

					// Clone the text and append to previewHead
					previewHead.textContent =
						"Uploaded File: " + fileInput.name;
				}
			}
		}
	});

// Listen for changes in the file upload input to update the preview dynamically
document.getElementById("file-upload")?.addEventListener("change", function () {
	const mediaTypeDropdown = document.getElementById("mediaTypeDropdown");
	mediaTypeDropdown.dispatchEvent(new Event("change"));
});

const dropDown = document.getElementById("mediaTypeDropdown");
const none = document.getElementById("noneInputContainer");
const text = document.getElementById("headerInputContainer");
const media = document.getElementById("mediaInputContainer");

dropDown?.addEventListener("change", (e) => {
	const value = e.target.value;
	// console.log(value);
	text.classList.add("hidden");
	media.classList.add("hidden");
	none.classList.add("hidden");
	none.innerHTML = "";
	// Show the relevant container based on the dropdown value
	if (value === "none") {
		document.getElementById("previewHeader").innerHTML = "";
		document.getElementById("previewHead").innerHTML = "";
		none.classList.remove("hidden");
		none.classList.add("flex");
	} else if (value === "text") {
		text.classList.remove("hidden");
		// text.classList.add("flex");
	} else if (value === "media") {
		media.classList.remove("hidden");
		media.classList.add("flex");
	}
});

const fileUpload = document.getElementById("file-upload");
const uploadText = document.getElementById("uploadText");
const removeFileIcon = document.getElementById("removeFile");
const uploadLabel = document.getElementById("uploadLabel");

// Default text to reset when file is removed
const defaultText = uploadText?.textContent;

// Allowed file types by category
const allowedFileTypes = {
	image: ["image/jpeg", "image/jpg", "image/png"],
	video: ["video/mp4", "video/3gp"],
	document: [
		"text/plain",
		"application/vnd.ms-excel",
		"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		"application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"application/vnd.ms-powerpoint",
		"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		"application/pdf",
	],
	location: ["application/gpx+xml", "application/vnd.google-earth.kml+xml"],
};

fileUpload?.addEventListener("change", (e) => {
	e.stopPropagation();
	const file = e.target.files[0];

	if (file) {
		const fileType = file.type;
		const mediaType = document.getElementById("mediaType").value;
		const isValidType = validateFileType(fileType, mediaType);
		const isValidSize = validateFileSize(file.size, mediaType);

		if (isValidType && isValidSize) {
			uploadText.textContent = file.name;
			removeFileIcon.classList.remove("hidden");
		} else {
			let errorMessage = "";
			if (!isValidType) {
				errorMessage =
					"Invalid file type. Please upload the allowed file types.";
			} else {
				// Size error message
				const sizeLimits = {
					audio: "16MB",
					document: "100MB",
					image: "5MB",
					sticker: "100KB",
					video: "16MB",
				};
				const maxSize = sizeLimits[mediaType] || "the allowed size";
				errorMessage = `File size exceeds the limit for ${mediaType}. Maximum allowed size is ${maxSize}.`;
			}

			toast("info", errorMessage);
			fileUpload.value = "";
			uploadText.textContent = defaultText;
		}
	}
});

function validateFileType(fileType, mediaType) {
	// Assuming allowedFileTypes is defined elsewhere
	if (mediaType == "image") {
		return allowedFileTypes.image.includes(fileType);
	} else if (mediaType == "video") {
		return allowedFileTypes.video.includes(fileType);
	} else if (mediaType == "document") {
		return allowedFileTypes.document.includes(fileType);
	} else if (mediaType == "location") {
		return allowedFileTypes.location.includes(fileType);
	} else if (mediaType == "sticker") {
		// Added sticker type if needed
		return allowedFileTypes.sticker.includes(fileType);
	}
	return false;
}

function validateFileSize(fileSize, mediaType) {
	const sizeLimits = {
		audio: 16 * 1024 * 1024, // 16MB
		document: 100 * 1024 * 1024, // 100MB
		image: 5 * 1024 * 1024, // 5MB
		sticker: 100 * 1024, // 100KB
		video: 16 * 1024 * 1024, // 16MB
	};

	// Return true if mediaType has no size limit (e.g., location)
	if (!(mediaType in sizeLimits)) return true;

	return fileSize <= sizeLimits[mediaType];
}

removeFileIcon?.addEventListener("click", (e) => {
	e.stopPropagation();
	fileUpload.value = "";
	// uploadText.textContent = defaultText;
	removeFileIcon.classList.add("hidden");
});

document.getElementById("mediaType")?.addEventListener("change", (e) => {
	const value = e.target.value;

	if (value === "image") {
		uploadText.textContent = "Choose from .jpg, .png";
	} else if (value === "video") {
		uploadText.textContent = "Choose from .mp4, .avi or .webm";
	} else if (value === "document") {
		uploadText.textContent = "Choose from .pdf, .doc, .docx, .txt, .xls, xlsx, .ppt, .pptx";
	} else {
		uploadText.textContent = "Choose from .gpx, .kml";
	}
});

document.getElementById("footerInput")?.addEventListener("input", function () {
	const footerInput = this.value;

	document.getElementById("previewFooter").innerHTML = footerInput.replace(
		/\n/g,
		"<br>",
	);
	document.getElementById("previewFoot").textContent = footerInput;
	document.getElementById("previewFoot").classList.add("text-left");

	document.querySelector(".footer-count").textContent =
		footerInput.length + "/60";
});

function setupCharCount(inputId, countSelector, maxLength = 60) {
	const input = document.getElementById(inputId);
	if (!input) return;

	const counter = document.querySelector(countSelector);
	if (!counter) return;

	input.addEventListener("input", function () {
		const value = this.value;
		counter.textContent = `${value.length}/${maxLength}`;
	});
}

document.addEventListener("DOMContentLoaded", () => {
	setupCharCount("headerInput", ".header-count", 60);
	setupCharCount("callBtnLabel", ".call-count", 25);
	setupCharCount("websiteBtnLabel", ".web-count", 25);

	const countrySelectorButton = document.getElementById(
		"countrySelectorButton",
	);
	const countryDropdown = document.getElementById("countryDropdown");
	const countryOptions = document.querySelectorAll(".country-option");
	const countrySearch = document.getElementById("countrySearch");
	// Toggle country dropdown
	countrySelectorButton.addEventListener("click", function (e) {
		e.preventDefault();
		countryDropdown.classList.toggle("hidden");
	});

	// Handle country selection
	countryOptions.forEach((option) => {
		option.addEventListener("click", function () {
			const flag = this.querySelector(".country-flag").textContent;
			const dialCode =
				this.querySelector(".country-dial-code").textContent;

			selectedFlag.textContent = flag;
			selectedDialCode.value = dialCode;
			countryDropdown.classList.add("hidden");
		});
	});

	// Search functionality
	countrySearch.addEventListener("input", function () {
		const searchValue = this.value.toLowerCase();

		countryOptions.forEach((option) => {
			const countryName = option
				.querySelector(".country-name")
				.textContent.toLowerCase();
			const dialCode = option
				.querySelector(".country-dial-code")
				.textContent.toLowerCase();

			if (
				countryName.includes(searchValue) ||
				dialCode.includes(searchValue)
			) {
				option.style.display = "flex";
			} else {
				option.style.display = "none";
			}
		});
	});
});

document
	.getElementById("bodyInput")
	?.addEventListener("keydown", function (event) {
		const bodyInput = this;

		if (event.key === "Enter") {
			event.preventDefault();
			const selection = window.getSelection();
			const range = selection.getRangeAt(0);
			const newLine = document.createElement("div");
			newLine.classList.add("text-base");
			newLine.innerHTML = "<br>";
			range.deleteContents();
			range.insertNode(newLine);

			// Move the cursor to the new line
			const newRange = document.createRange();
			newRange.setStart(newLine, 0);
			newRange.setEnd(newLine, 0);
			selection.removeAllRanges();
			selection.addRange(newRange);
		}
		document
			.getElementById("bodyInput")
			.addEventListener("input", function () {
				document.getElementById("previewBody").innerHTML =
					this.innerHTML;
				document.getElementById("previewBod").innerHTML =
					this.innerHTML;
			});

		document.getElementById("charCount").textContent =
			this.textContent.length + "/1024";
	});

let websiteBtnCount = 0;
let callBtnCount = 0;

document.getElementById("addWebsiteBtn").addEventListener("click", function () {
	if (websiteBtnCount >= 1) {
		toast("info", "You can only add 1 website button.");
		return;
	}

	// Display the website form
	document.getElementById("websiteForm").style.display = "block";
	generatePreviewWebsite();
	websiteBtnCount++;

	// Add event listener to remove the form on click
	document
		.getElementById("closeWebsite")
		.addEventListener("click", function () {
			document.getElementById("websiteForm").style.display = "none";
			websiteBtnCount--;

			// Remove the website button from preview
			removePreviewButton("websiteBtn");
		});

	// Add input event listeners for dynamic preview update
	document
		.getElementById("websiteBtnLabel")
		.addEventListener("input", generatePreviewWebsite);
	document
		.getElementById("websiteUrl")
		.addEventListener("input", generatePreviewWebsite);
});

document.getElementById("addCallBtn").addEventListener("click", function () {
	if (callBtnCount >= 1) {
		toast("info", "You can only add 1 call button.");
		return;
	}

	// Display the call form
	document.getElementById("callForm").style.display = "block";
	generatePreviewCall();
	callBtnCount++;

	// Add event listener to remove the form on click
	document.getElementById("closeCall").addEventListener("click", function () {
		document.getElementById("callForm").style.display = "none";
		callBtnCount--;

		// Remove the call button from preview
		removePreviewButton("callBtn");
	});

	// Add input event listeners for dynamic preview update
	document
		.getElementById("callBtnLabel")
		.addEventListener("input", generatePreviewCall);
	document
		.getElementById("phoneNumber")
		.addEventListener("input", generatePreviewCall);
});

// // Function to remove a preview button by its ID
function removePreviewButton(buttonId) {
	let button = document.getElementById(buttonId);
	if (button) {
		button.remove();
	}
	document.getElementById("previewButton").innerHTML = "";
}

const previewContainer = document.getElementById("previewContainer");
let draggedElement = null;

function makeButtonsDraggable() {
	const buttons = previewContainer.querySelectorAll("button");
	buttons.forEach((button) => {
		button.setAttribute("draggable", true);

		// Add drag start event
		button.addEventListener("dragstart", (e) => {
			draggedElement = button;
			e.dataTransfer.effectAllowed = "move";
			e.dataTransfer.setData("text/html", button.outerHTML);
			setTimeout(() => (button.style.display = "none"), 0); // Hide while dragging
		});

		// Add drag end event
		button.addEventListener("dragend", () => {
			draggedElement = null;
			button.style.display = "block";
		});
	});
}

// Allow elements to be dragged over the previewContainer
previewContainer.addEventListener("dragover", (e) => {
	e.preventDefault();
	e.dataTransfer.dropEffect = "move";
});

// Handle drop event in previewContainer
previewContainer.addEventListener("drop", (e) => {
	e.preventDefault();
	if (draggedElement) {
		// Get the drop target and place the dragged element there
		const dropTarget = e.target.closest(".btn") || previewContainer;
		if (dropTarget && draggedElement !== dropTarget) {
			dropTarget.insertAdjacentHTML(
				"beforebegin",
				e.dataTransfer.getData("text/html"),
			);
			dropTarget.parentNode.removeChild(draggedElement); // Remove the original button
			makeButtonsDraggable(); // Reapply draggable logic to new buttons
		}
	}
});

makeButtonsDraggable();

function generatePreviewWebsite() {
	let label = document.getElementById("websiteBtnLabel").value || "Visit Now";
	let url = document.getElementById("websiteUrl").value || "#";

	if (label.length > 25) return;

	document.querySelectorAll(".websiteBtn").forEach((btn) => btn.remove());

	let preview = `
	  <button class="btn websiteBtn" draggable="true" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
	    <i class="fa fa-external-link mx-2"></i>${label}
	  </button>
	`;

	document.getElementById("previewButtons").innerHTML += preview;
	document.getElementById("previewButton").innerHTML += preview;

	makeButtonsDraggable();
}

function generatePreviewCall() {
	let label = document.getElementById("callBtnLabel").value || "Call Now";
	let phone = document.getElementById("phoneNumber").value || "#";

	if (label.length > 25) return;

	document.querySelectorAll(".callBtn").forEach((btn) => btn.remove());

	let preview = `
		<button class="btn callBtn" draggable="true" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
			<i class="fa fa-phone mx-2"></i>${label}
		</button>
	`;

	document.getElementById("previewButtons").innerHTML += preview;
	document.getElementById("previewButton").innerHTML += preview;

	makeButtonsDraggable();
}

function formatText(command, button) {
	const bodyInput = document.getElementById("bodyInput");
	bodyInput.focus();
	document.execCommand(command, false, null);
	toggleActiveButton(button);
}

function toggleActiveButton(button) {
	button.classList.toggle("active");
}

const buttonDropdown = document.getElementById("addButtonDropdown");
const dropdownMenu = document.getElementById("buttonDropdown");

buttonDropdown.addEventListener("click", function (e) {
	e.stopPropagation();
	console.log(dropdownMenu.classList.toggle("hidden"));
});

dropdownMenu.addEventListener("click", function (e) {
	e.stopPropagation();
	this.classList.toggle("hidden");
});

window.addEventListener("click", function (e) {
	e.stopPropagation();
	if (
		!dropdownMenu.contains(e.target) &&
		!buttonDropdown.contains(e.target)
	) {
		// console.log("coming here")
		dropdownMenu.classList.add("hidden");
	}
});

dropdownMenu.addEventListener("click", function (e) {
	e.stopPropagation();
});

let dragItem = null;

document.querySelectorAll(".draggable").forEach((item) => {
	const dragHandle = item.querySelector(".drag-handle");

	dragHandle.addEventListener("mousedown", function () {
		dragItem = item;
		item.style.opacity = "0.5"; // Visual feedback during drag
	});

	dragHandle.addEventListener("mouseup", function () {
		dragItem = null;
		item.style.opacity = "1"; // Reset after drag
	});

	item.addEventListener("dragstart", function (e) {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/html", item.innerHTML);
	});

	item.addEventListener("dragend", function () {
		item.style.opacity = "1";
	});
});

document
	.getElementById("buttonOptions")
	.addEventListener("dragover", function (e) {
		e.preventDefault();
	});

document.getElementById("buttonOptions").addEventListener("drop", function (e) {
	e.preventDefault();
	if (dragItem) {
		let afterElement = getDragAfterElement(e.clientY);
		if (afterElement == null) {
			this.appendChild(dragItem);
		} else {
			this.insertBefore(dragItem, afterElement);
		}
	}
});

function getDragAfterElement(y) {
	const draggableElements = [
		...document.querySelectorAll(".draggable:not(.dragging)"),
	];

	return draggableElements.reduce(
		(closest, child) => {
			const box = child.getBoundingClientRect();
			const offset = y - box.top - box.height / 2;
			if (offset < 0 && offset > closest.offset) {
				return {
					offset: offset,
					element: child,
				};
			} else {
				return closest;
			}
		},
		{
			offset: Number.NEGATIVE_INFINITY,
		},
	).element;
}

document.getElementById("phoneNumber").addEventListener("input", function (e) {
	const phoneInput = e.target;
	let value = phoneInput.value;

	// Remove any non-numeric characters
	value = value.replace(/\D/g, "");

	// Update the input field with only numbers
	phoneInput.value = value;

	// Check if the phone number is less than 12 digits
	if (value.length < 8 && value.length > 0) {
		showMessage(
			'Phone number must be at least 8 digits long.',
		);
	} else {
		hideMessage();
	}
});

// Function to show warning message
function showMessage(message) {
	let messageBox = document.getElementById("phoneWarning");

	if (!messageBox) {
		messageBox = document.createElement("div");
		messageBox.id = "phoneWarning";
		messageBox.classList.add(
			"text-sm",
			"text-right",
			"py-2",
			"text-red-500",
		);
		document.getElementById("callForm").appendChild(messageBox);
	}

	messageBox.textContent = message;
}

// Function to hide warning message
function hideMessage() {
	const messageBox = document.getElementById("phoneWarning");
	if (messageBox) {
		messageBox.textContent = "";
	}
}

function selectCategory(category) {
	const categoryButton = document.getElementById("categoryButton");

	categoryButton.textContent = category;

	document.getElementById("categoryDropdown").classList.add("hidden");

	if (category === "Authentication") {
		document.getElementById("setupBody").classList.add("hidden");
		document
			.getElementById("authenticationBody")
			.classList.remove("hidden");
		document.getElementById(
			"previewBody",
		).textContent = `{{1}} is your verification code.`;
		document.getElementById(
			"previewBod",
		).textContent = `{{1}} is your verification code.`;
		document.getElementById("previewButtons").textContent = "";
		document.getElementById("previewHeader").innerHTML = "";
		document.getElementById("previewHead").innerHTML = "";
		document.getElementById("previewButton").textContent = "";
	} else {
		document.getElementById("setupBody").classList.remove("hidden");
		document.getElementById("authenticationBody").classList.add("hidden");
		document.getElementById("previewAuthCopyCode").classList.add("hidden");
		document.getElementById("previewAuthAutofill").classList.add("hidden");
	}
}

document
	.getElementById("categoryButton")
	.addEventListener("click", function () {
		const dropdown = document.getElementById("categoryDropdown");
		dropdown.classList.toggle("hidden");
		// Manage aria-expanded attribute for accessibility
		const isExpanded = dropdown.classList.contains("hidden")
			? "false"
			: "true";
		this.setAttribute("aria-expanded", isExpanded);
	});

// Close dropdown when clicking outside
document.addEventListener("click", function (event) {
	const categoryButton = document.getElementById("categoryButton");
	const dropdown = document.getElementById("categoryDropdown");
	if (
		!categoryButton.contains(event.target) &&
		!dropdown.contains(event.target)
	) {
		dropdown.classList.add("hidden");
		categoryButton.setAttribute("aria-expanded", "false");
	}
});

const setupBody = document.getElementById("setupBody");
const authBody = document.getElementById("authenticationBody");
const scrollBtn = document.getElementById("scrollDownBtn");

function isScrollable(el) {
	return el.scrollHeight > el.clientHeight;
}

function isAtBottom(el) {
	return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
}

function checkScrollBtn() {
	const active = [setupBody, authBody].find(
		(el) => isScrollable(el) && !isAtBottom(el),
	);
	if (active) {
		scrollBtn.classList.remove("hidden");
		scrollBtn.dataset.target = active.id; // tag the active one
	} else {
		scrollBtn.classList.add("hidden");
		scrollBtn.removeAttribute("data-target");
	}
}

function scrollToBottom() {
	const targetId = scrollBtn.dataset.target;
	if (!targetId) return;

	const target = document.getElementById(targetId);
	if (target) {
		target.scrollTo({
			top: target.scrollHeight,
			behavior: "smooth",
		});
	}
}

[setupBody, authBody].forEach((el) => {
	el.addEventListener("scroll", checkScrollBtn);
	new MutationObserver(checkScrollBtn).observe(el, {
		childList: true,
		subtree: true,
	});
});

// Also check on resize and load
window.addEventListener("resize", checkScrollBtn);
window.addEventListener("load", checkScrollBtn);

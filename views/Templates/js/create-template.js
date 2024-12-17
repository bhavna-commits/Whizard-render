document.addEventListener("DOMContentLoaded", () => {
	document
		.getElementById("bodyInput")
		.addEventListener("keypress", function (event) {
			if (event.key === "Enter") {
				document.execCommand("formatBlock", false, "p");
				document.execCommand("fontSize", false, "2");
			}
		});

	document.querySelectorAll(".custom-dropdown-toggle").forEach((button) => {
		button.addEventListener("click", function () {
			const dropdownMenu = this.nextElementSibling;
			dropdownMenu.classList.toggle("show");
		});
	});

	document.addEventListener("click", function (event) {
		if (!event.target.matches(".custom-dropdown-toggle")) {
			document
				.querySelectorAll(".custom-dropdown-menu")
				.forEach((menu) => {
					menu.classList.remove("show");
				});
		}
	});

	document
		.getElementById("mediaTypeDropdown")
		.addEventListener("change", function (e) {
			const selectedValue = e.target.value;
			const previewHeader = document.getElementById("previewHeader");

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
					});
			} else if (selectedValue === "media") {
				previewHeader.style.display = "flex";
				previewHeader.style.justifyContent = "center";
				previewHeader.style.alignItems = "center";

				const mediaType = document.getElementById("mediaType").value;
				const fileInput =
					document.getElementById("file-upload").files[0];

				if (mediaType === "image" && fileInput) {
					const img = document.createElement("img");
					img.src = URL.createObjectURL(fileInput);
					img.style.width = "200px";
					img.style.height = "100px";
					previewHeader.appendChild(img);
				} else if (mediaType === "video" && fileInput) {
					const video = document.createElement("video");
					video.src = URL.createObjectURL(fileInput);
					video.controls = true;
					video.style.width = "200px";
					video.style.height = "100px";
					previewHeader.appendChild(video);
				} else if (mediaType === "document" && fileInput) {
					if (fileInput.type === "application/pdf") {
						const iframe = document.createElement("iframe");
						iframe.src = URL.createObjectURL(fileInput);
						iframe.style.width = "200px";
						iframe.style.height = "100px";
						previewHeader.appendChild(iframe);
					} else {
						previewHeader.textContent =
							"Uploaded File: " + fileInput.name;
					}
				}
			}
		});

	// Listen for changes in the file upload input to update the preview dynamically
	document
		.getElementById("file-upload")
		.addEventListener("change", function () {
			const mediaTypeDropdown =
				document.getElementById("mediaTypeDropdown");
			mediaTypeDropdown.dispatchEvent(new Event("change"));
		});

	const dropDown = document.getElementById("mediaTypeDropdown");
	const none = document.getElementById("noneInputContainer");
	const text = document.getElementById("headerInputContainer");
	const media = document.getElementById("mediaInputContainer");

	dropDown.addEventListener("change", (e) => {
		const value = e.target.value;
		// console.log(value);
		text.classList.add("hidden");
		media.classList.add("hidden");
		none.classList.add("hidden");
		// Show the relevant container based on the dropdown value
		if (value === "none") {
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
	const defaultText = uploadText.textContent;

	// Allowed file types by category
	const allowedFileTypes = {
		image: [
			"image/jpeg",
			"image/png",
			"image/gif",
			"image/bmp",
			"image/webp",
			"image/svg+xml",
		],
		video: [
			"video/mp4",
			"video/x-msvideo", // avi
			"video/x-matroska", // mkv
			"video/quicktime", // mov
			"video/webm",
			"video/ogg",
		],
		document: [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"text/plain",
			"text/csv",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
		],
		location: [
			"application/gpx+xml",
			"application/vnd.google-earth.kml+xml",
		],
	};

	// Listen for file selection
	fileUpload.addEventListener("change", (e) => {
		e.stopPropagation();
		const file = e.target.files[0];

		if (file) {
			const fileType = file.type;
			const isValidFile = validateFileType(fileType);

			if (isValidFile) {
				uploadText.textContent = file.name; // Display file name
				removeFileIcon.classList.remove("hidden"); // Show the remove icon
			} else {
				alert(
					"Invalid file type. Please upload the allowed file types.",
				);
				fileUpload.value = ""; // Reset file input
				uploadText.textContent = defaultText; // Reset upload text
			}
		}
	});

	// Handle file removal
	removeFileIcon.addEventListener("click", (e) => {
		e.stopPropagation();
		fileUpload.value = ""; // Clear file input
		uploadText.textContent = defaultText; // Reset to original text
		removeFileIcon.classList.add("hidden"); // Hide remove icon
	});

	// Function to validate file type based on mediaType dropdown value
	function validateFileType(fileType) {
		const mediaType = document.getElementById("mediaType").value;

		if (mediaType === "image") {
			return allowedFileTypes.image.includes(fileType);
		} else if (mediaType === "video") {
			return allowedFileTypes.video.includes(fileType);
		} else if (mediaType === "document") {
			return allowedFileTypes.document.includes(fileType);
		} else if (mediaType === "location") {
			return allowedFileTypes.location.includes(fileType);
		}
		return false;
	}

	// Dynamically update allowed file types based on mediaType dropdown
	document.getElementById("mediaType").addEventListener("change", (e) => {
		const value = e.target.value;

		if (value === "image") {
			uploadText.textContent = "Choose from .jpg, .png or .webp";
		} else if (value === "video") {
			uploadText.textContent = "Choose from .mp4, .avi or .webm";
		} else if (value === "document") {
			uploadText.textContent = "Choose from .pdf, .doc, .docx, .txt";
		} else {
			uploadText.textContent = "Choose from .gpx, .kml";
		}
	});

	// Footer Input Preview
	document
		.getElementById("footerInput")
		.addEventListener("input", function () {
			document.getElementById("previewFooter").textContent = this.value;
			document.getElementById("previewFooter").classList.add("text-left");
			document.querySelector(".footer-count").textContent =
				this.value.length + "/64";
		});

	document
		.getElementById("bodyInput")
		.addEventListener("keydown", function (event) {
			const bodyInput = this;

			if (event.key === "Enter") {
				event.preventDefault();
				const selection = window.getSelection();
				const range = selection.getRangeAt(0);
				const newLine = document.createElement("div");
				newLine.classList.add("text-base");
				newLine.innerHTML = "<br>";
				// Insert the new line at the cursor position
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
				});

			document.getElementById("charCount").textContent =
				this.textContent.length + "/1024";
		});

	let websiteBtnCount = 0;
	let callBtnCount = 0;

	document
		.getElementById("addWebsiteBtn")
		.addEventListener("click", function () {
			if (websiteBtnCount >= 1) {
				alert("You can only add 1 website button.");
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
					document.getElementById("websiteForm").style.display =
						"none";
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

	document
		.getElementById("addCallBtn")
		.addEventListener("click", function () {
			if (callBtnCount >= 1) {
				alert("You can only add 1 call button.");
				return;
			}

			// Display the call form
			document.getElementById("callForm").style.display = "block";
			generatePreviewCall();
			callBtnCount++;

			// Add event listener to remove the form on click
			document
				.getElementById("closeCall")
				.addEventListener("click", function () {
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

	// Generate Website Button Preview with FA icon
	function generatePreviewWebsite() {
		let label =
			document.getElementById("websiteBtnLabel").value || "Visit Now";
		let url = document.getElementById("websiteUrl").value || "#";

		let preview = `
        <button class="btn btn-secondary me-2" id="websiteBtn" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
            <i class="fa fa-external-link mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("websiteBtn");
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}
	}

	// Generate Call Button Preview with FA icon
	function generatePreviewCall() {
		let label = document.getElementById("callBtnLabel").value || "Call Now";
		let phone = document.getElementById("phoneNumber").value || "#";

		let preview = `
        <button class="btn btn-secondary me-2" id="callBtn" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
            <i class="fa fa-phone mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("callBtn");
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}
	}

	// Function to remove a preview button by its ID
	function removePreviewButton(buttonId) {
		let button = document.getElementById(buttonId);
		if (button) {
			button.remove();
		}
	}

	const previewContainer = document.getElementById("previewContainer");
	let draggedElement = null;

	// Function to add draggable attribute and event listeners to all buttons
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
		e.preventDefault(); // Prevent default to allow drop
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

	// Initial call to make buttons draggable
	makeButtonsDraggable();

	// Example button generation functions (adjust these to add draggable logic automatically)
	function generatePreviewWebsite() {
		let label =
			document.getElementById("websiteBtnLabel").value || "Visit Now";
		let url = document.getElementById("websiteUrl").value || "#";

		let preview = `
        <button class="btn btn-secondary me-2" id="websiteBtn" draggable="true" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
            <i class="fa fa-external-link mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("websiteBtn");
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}

		makeButtonsDraggable(); // Ensure new button is draggable
	}

	function generatePreviewCall() {
		let label = document.getElementById("callBtnLabel").value || "Call Now";
		let phone = document.getElementById("phoneNumber").value || "#";

		let preview = `
        <button class="btn btn-secondary me-2" id="callBtn" draggable="true" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
            <i class="fa fa-phone mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("callBtn");
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}

		makeButtonsDraggable();
	}
});

function formatText(command, button) {
	const bodyInput = document.getElementById("bodyInput");
	bodyInput.focus();
	document.execCommand(command, false, null);
	toggleActiveButton(button);
}

function toggleActiveButton(button) {
	button.classList.toggle("active");
}

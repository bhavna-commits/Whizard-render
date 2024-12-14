document.addEventListener("DOMContentLoaded", () => {
	// Toggle the emoji container on button click

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

			// Reset preview content
			previewHeader.innerHTML = "";

			if (selectedValue === "text") {
				// Show the text input for the header
				previewHeader.textContent = "Header Text Preview";
				document
					.getElementById("headerInput")
					.addEventListener("input", (e) => {
						previewHeader.textContent =
							e.target.value || "Header Text Preview";
					});
			} else if (selectedValue === "media") {
				const mediaType = document.getElementById("mediaType").value;
				const fileInput =
					document.getElementById("file-upload").files[0];

				if (mediaType === "image" && fileInput) {
					// Create image element for preview
					const img = document.createElement("img");
					img.src = URL.createObjectURL(fileInput);
					img.style.width = "200px";
					img.style.height = "200px";
					previewHeader.appendChild(img);
				} else if (mediaType === "video" && fileInput) {
					// Create video element for preview
					const video = document.createElement("video");
					video.src = URL.createObjectURL(fileInput);
					video.controls = true;
					video.style.width = "200px";
					video.style.height = "200px";
					previewHeader.appendChild(video);
				} else if (mediaType === "document" && fileInput) {
					// Show document preview for PDF
					if (fileInput.type === "application/pdf") {
						const iframe = document.createElement("iframe");
						iframe.src = URL.createObjectURL(fileInput);
						iframe.style.width = "200px";
						iframe.style.height = "200px";
						previewHeader.appendChild(iframe);
					} else {
						// Display file name for other documents like DOCX, CSV
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

	document.getElementById("bodyInput").addEventListener("input", function () {
		document.getElementById("previewBody").innerHTML = this.innerHTML;
		document.getElementById("charCount").textContent =
			this.textContent.length + "/1024";
	});

	let websiteBtnCount = 0;
	let callBtnCount = 0;

	// Add Website Button
	document
		.getElementById("addWebsiteBtn")
		.addEventListener("click", function () {
			if (websiteBtnCount >= 1) {
				alert("You can only add 1 website buttons.");
				return;
			}

			websiteBtnCount++;

			// Form for website button
			let websiteForm = `
        <div class=" border rounded shadow-sm  action-card mt-3" id="websiteForm">
            <div class="d-flex justify-evenly items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="websiteBtnLabel" placeholder="Visit Now">
                    </div>
                    
                    <div class="col-4">
                        <label>Website URL</label>
                        <input type="url" class="form-control" id="websiteUrl" placeholder="example.com">
                    </div>
                    
                </div>
                <div class="col-1 close-icon">
                    <span class="remove-btn" data-id="websiteForm">&times;</span>
                </div>
            </div>
        </div>
    `;
			document.getElementById("buttonOptions").innerHTML += websiteForm;

			// Immediately add to preview
			generatePreviewWebsite();

			// Add event listeners to update the preview in real-time
			document
				.getElementById("websiteBtnLabel")
				.addEventListener("input", function () {
					generatePreviewWebsite();
				});
			document
				.getElementById("websiteUrl")
				.addEventListener("input", function () {
					generatePreviewWebsite();
				});

			// Delete button and its preview on close icon click
			document
				.querySelector(`.remove-btn[data-id="websiteForm"]`)
				.addEventListener("click", function () {
					// Remove the form and its preview
					console.log("website remove");
					document.getElementById("websiteForm").remove();
					document.getElementById("websiteBtn").remove();
					websiteBtnCount--;
				});
		});

	// Add Call Button
	document
		.getElementById("addCallBtn")
		.addEventListener("click", function () {
			if (callBtnCount >= 1) {
				alert("You can only add 1 call button.");
				return;
			}

			let uniqueId = new Date().getTime();
			callBtnCount++;

			// Form for call button
			let callForm = `
        <div class=" border rounded shadow-sm action-card mt-3 mb-10" id="callForm">
            <div class="d-flex justify-evenly items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="callBtnLabel" placeholder="Call Now">
                    </div>
                     
                    <div class="col-4">
                        <label>Phone Number</label>
                        <input type="tel" maxlength="10" class="form-control" id="phoneNumber" placeholder="9999999999">
                    </div>
                    
                </div>
                <div class="col-1 close-icon">
                    <span class="remove-btn" data-id="callForm">&times;</span>
                </div>
            </div>
        </div>
    `;
			document.getElementById("buttonOptions").innerHTML += callForm;

			generatePreviewCall(uniqueId);

			document
				.getElementById("callBtnLabel")
				.addEventListener("input", function () {
					generatePreviewCall(uniqueId);
				});
			document
				.getElementById("phoneNumber")
				.addEventListener("input", function () {
					generatePreviewCall(uniqueId);
				});

			document
				.querySelector(`.remove-btn[data-id="callForm"]`)
				.addEventListener("click", function () {
					console.log("call remove");
					document.getElementById("callForm").remove();
					document.getElementById("callBtn").remove();
					callBtnCount--;
				});
		});

	// Generate Website Button Preview with FA icon
	function generatePreviewWebsite(id) {	
		let label =
			document.getElementById("websiteBtnLabel").value ||
			"Visit Now";
		let url = document.getElementById("websiteUrl").value || "#";

		let preview = `
        <button class="btn  btn-secondary me-2" id="websiteBtn" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
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
		let label =
			document.getElementById("callBtnLabel").value || "Call Now";
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
});

function formatText(command, button) {
	document.getElementById("editor").focus(); // Ensure the text area is focused

	document.execCommand(command, false, null); // Apply the command

	toggleActiveButton(button); // Toggle button active state

	updatePreview(); // Call to preview if needed
}

function toggleActiveButton(button) {
	if (button.classList.contains("active")) {
		button.classList.remove("active");
	} else {
		button.classList.add("active");
	}
}

function updatePreview() {
	// Implement a preview update if you want a live preview of formatted text
	// For now, this function can be empty
}


function insertEmoji(emoji) {
	insertAtCaret("bodyInput", emoji);
	updatePreview();
}

function insertText(text) {
	insertAtCaret("bodyInput", text);
	updatePreview();
}

function insertEmoji(emoji) {
	insertAtCaret("bodyInput", emoji);
	updatePreview();
}

function insertAtCaret(divId, text) {
	var div = document.getElementById(divId);
	div.focus();
	var sel, range;
	if (window.getSelection) {
		sel = window.getSelection();
		if (sel.getRangeAt && sel.rangeCount) {
			range = sel.getRangeAt(0);
			range.deleteContents();
			range.insertNode(document.createTextNode(text));
		}
	}
	updatePreview();
}

function updatePreview() {
	document.getElementById("previewBody").innerHTML =
		document.getElementById("bodyInput").innerHTML;
}

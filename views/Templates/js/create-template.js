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

	const dropDown = document.getElementById("mediaTypeDropdown");
	const none = document.getElementById("noneInputContainer");
	const text = document.getElementById("headerInputContainer");
	const media = document.getElementById("mediaInputContainer");
	// Hide all containers first
	// text.classList.add("hidden");
	// media.classList.add("hidden");
	// none.classList.add("hidden");

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
		image: ["image/jpeg", "image/png", "image/webp"],
		video: ["video/mp4", "video/x-msvideo", "video/webm"],
		document: [
			"application/pdf",
			"application/msword",
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			"text/plain",
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
			if (websiteBtnCount >= 2) {
				alert("You can only add 2 website buttons.");
				return;
			}

			let uniqueId = new Date().getTime();
			websiteBtnCount++;

			// Form for website button
			let websiteForm = `
        <div class=" border rounded shadow-sm  action-card mt-3" id="websiteForm_${uniqueId}">
            <div class="d-flex justify-evenly items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="websiteBtnLabel_${uniqueId}" placeholder="Visit Now">
                    </div>
                    
                    <div class="col-4">
                        <label>Website URL</label>
                        <input type="text" class="form-control" id="websiteUrl_${uniqueId}" placeholder="example.com">
                    </div>
                    
                </div>
                <div class="col-1 close-icon">
                    <span class="remove-btn" data-id="websiteForm_${uniqueId}">&times;</span>
                </div>
            </div>
        </div>
    `;
			document.getElementById("buttonOptions").innerHTML += websiteForm;

			// Immediately add to preview
			generatePreviewWebsite(uniqueId);

			// Add event listeners to update the preview in real-time
			document
				.getElementById("websiteBtnLabel_" + uniqueId)
				.addEventListener("input", function () {
					generatePreviewWebsite(uniqueId);
				});
			document
				.getElementById("websiteUrl_" + uniqueId)
				.addEventListener("input", function () {
					generatePreviewWebsite(uniqueId);
				});

			// Delete button and its preview on close icon click
			document
				.querySelector(`.remove-btn[data-id="websiteForm_${uniqueId}"]`)
				.addEventListener("click", function () {
					document.getElementById("websiteForm_" + uniqueId).remove();
					document.getElementById("websiteBtn_" + uniqueId).remove();
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
        <div class=" border rounded shadow-sm action-card mt-3 mb-10" id="callForm_${uniqueId}">
            <div class="d-flex justify-evenly items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="callBtnLabel_${uniqueId}" placeholder="Call Now">
                    </div>
                     
                    <div class="col-4">
                        <label>Phone Number</label>
                        <input type="text" class="form-control" id="phoneNumber_${uniqueId}" placeholder="9999999999">
                    </div>
                    
                </div>
                <div class="col-1 close-icon">
                    <span class="remove-btn" data-id="callForm_${uniqueId}">&times;</span>
                </div>
            </div>
        </div>
    `;
			document.getElementById("buttonOptions").innerHTML += callForm;

			generatePreviewCall(uniqueId);

			document
				.getElementById("callBtnLabel_" + uniqueId)
				.addEventListener("input", function () {
					generatePreviewCall(uniqueId);
				});
			document
				.getElementById("phoneNumber_" + uniqueId)
				.addEventListener("input", function () {
					generatePreviewCall(uniqueId);
				});

			document
				.querySelector(`.remove-btn[data-id="callForm_${uniqueId}"]`)
				.addEventListener("click", function () {
					document.getElementById("callForm_" + uniqueId).remove();
					document.getElementById("callBtn_" + uniqueId).remove();
					callBtnCount--;
				});
		});

	// Generate Website Button Preview with FA icon
	function generatePreviewWebsite(id) {
		let label =
			document.getElementById("websiteBtnLabel_" + id).value ||
			"Visit Now";
		let url = document.getElementById("websiteUrl_" + id).value || "#";

		let preview = `
        <button class="btn  btn-secondary me-2" id="websiteBtn_${id}" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
            <i class="fa fa-external-link mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("websiteBtn_" + id);
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}
	}

	// Generate Call Button Preview with FA icon
	function generatePreviewCall(id) {
		let label =
			document.getElementById("callBtnLabel_" + id).value || "Call Now";
		let phone = document.getElementById("phoneNumber_" + id).value || "#";

		let preview = `
        <button class="btn btn-secondary me-2" id="callBtn_${id}" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
            <i class="fa fa-phone mx-2"></i>${label}
        </button>
    `;

		let existingBtn = document.getElementById("callBtn_" + id);
		if (existingBtn) {
			existingBtn.outerHTML = preview;
		} else {
			document.getElementById("previewButtons").innerHTML += preview;
		}
	}
});

function formatText(command, button) {
	document.getElementById("bodyInput").focus();

	document.execCommand(command, false, null);

	toggleActiveButton(button);

	updatePreview();
}

function toggleActiveButton(button) {
	if (button.classList.contains("active")) {
		button.classList.remove("active");
	} else {
		button.classList.add("active");
	}
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

function () {

}

function hydrateAuthOptions(components) {
	let otp_type;
	components.forEach((component) => {
		if (
			component.type?.toLowerCase() === "body" &&
			component.add_security_recommendation === true
		) {
			const checkbox = document.querySelector(
				'input[name="addSecurityCheckbox"]',
			);
			if (checkbox && !checkbox.checked) {
				checkbox.checked = true;
				toggleCustomCheck(checkbox);
			}
		}

		if (
			component.type?.toLowerCase() === "footer" &&
			typeof component.code_expiration_minutes === "number"
		) {
			const checkbox = document.querySelector(
				'input[name="otpCheckbox"]',
			);
			if (checkbox && !checkbox.checked) {
				checkbox.checked = true;
				toggleCustomCheck(checkbox);
			}

			const otpInput = document.getElementById("otpExpiration");
			const otpDiv = document.getElementById("otpDiv");

			if (otpInput && otpDiv) {
				otpInput.value = component.code_expiration_minutes;
				otpDiv.classList.remove("hidden");
			}
		}

		if (component.type?.toLowerCase() === "buttons") {
			const buttonData = component.buttons?.[0];

			if (buttonData) {
				const copyInput = document.querySelector(
					'input[data-type="copycode"]',
				);
				if (copyInput && buttonData.text) {
					copyInput.value = buttonData.text;
					handlePackageInput(copyInput);
				}

				if (buttonData.autofill_text) {
					const autoInput = document.querySelector(
						'input[data-type="autofill"]',
					);
					const autoFillWrapper =
						document.getElementById("auto-fill-view");

					if (autoInput) {
						autoInput.value = buttonData.autofill_text;
						handlePackageInput(autoInput);
					}
					if (autoFillWrapper) {
						autoFillWrapper.classList.remove("hidden");
					}
				}
			}
		}

		if (component.type?.toLowerCase() === "buttons") {
			otp_type = component.buttons?.[0]?.otp_type?.toLowerCase();
		}

		if (otp_type) {
			const radio = document.querySelector(
				`input[name="codeDelivery"][value="${otp_type}"]`,
			);
			if (radio) {
				radio.checked = true;
			}
		}
	});
}

function renderPreviewFromDynamicVars(dynamicVariables = {}) {
	const { body = [], footer = [], buttons = [] } = dynamicVariables;

	// Body
	const previewBody = document.getElementById("previewBody");
	previewBody.innerHTML = body?.[0]?.text || "";

	// Footer
	const previewFooter = document.getElementById("previewFooter");
	previewFooter.innerHTML = footer?.[0]?.text || "";
	previewBody.classList.remove("hidden");

	// Buttons
	const previewButtons = document.getElementById("previewButtons");
	const autofillBtn = document.getElementById("previewAuthAutofill");
	const copyBtnWrapper = document.getElementById("previewAuthCopyCode");
	const copyBtnText = document.getElementById("previewAuthCopyCodeSpan");

	const btnData = buttons?.[0] || {};

	if (btnData.auto) {
		autofillBtn.classList.remove("hidden");
		autofillBtn.textContent = btnData.auto;
	} else {
		autofillBtn.classList.add("hidden");
	}

	if (btnData.copy) {
		copyBtnWrapper.classList.remove("hidden");
		copyBtnText.textContent = btnData.copy;
	} else {
		copyBtnWrapper.classList.add("hidden");
	}
}

function renderValidatePeriod(validityPeriodValue) {
	const timeSelect = document.getElementById("validityPeriod");
	const toggle = document.getElementById("customValidityToggle");

	if (!timeSelect || !validityPeriodValue || !toggle) return;

	toggle.checked = true;

	const event = new Event("change", { bubbles: true });
	toggle.dispatchEvent(event);

	timeSelect.value = String(validityPeriodValue);
}

window.addEventListener("DOMContentLoaded", () => {
	if (data.category === "Authentication") {
		selectCategory("Authentication");
		hydrateAuthOptions(data?.components);
		renderPreviewFromDynamicVars(data?.dynamicVariables);
		renderValidatePeriod(data?.validityPeriod);
	}
});

if (mediaFileData && mediaFileName) {
	const byteString = atob(mediaFileData);
	const byteArray = new Uint8Array(byteString.length);
	for (let i = 0; i < byteString.length; i++) {
		byteArray[i] = byteString.charCodeAt(i);
	}

	// Get file extension from the filename
	const extension = mediaFileName.split(".").pop().toLowerCase();

	const extensionTypes = {
		image: ["jpg", "jpeg", "png", "gif", "webp"],
		video: ["mp4", "mov", "avi", "webm"],
		document: ["pdf", "txt", "doc", "docx", "xls", "xlsx", "csv"],
	};

	const mimeTypes = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		pdf: "application/pdf",
		txt: "text/plain",
		mp3: "audio/mpeg",
		mp4: "video/mp4",
		json: "application/json",
		csv: "text/csv",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	};

	const mimeType = mimeTypes[extension] || "application/octet-stream";

	let mediaType = null;
	for (const [type, exts] of Object.entries(extensionTypes)) {
		if (exts.includes(extension)) {
			mediaType = type;
			break;
		}
	}

	const file = new File([byteArray], mediaFileName, {
		type: mimeType,
	});

	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(file);

	const fileInput = document.getElementById("file-upload");
	fileInput.files = dataTransfer.files;

	if (mediaType) {
		document.getElementById("mediaTypeDropdown").value = "media";
		document.getElementById("mediaType").value = mediaType;
		document
			.getElementById("mediaTypeDropdown")
			.dispatchEvent(new Event("change"));
	}

	const uploadText = document.getElementById("uploadText");

	if (mediaType === "image") {
		uploadText.textContent = "Choose from .jpg, .png, .gif, .webp";
	} else if (mediaType === "video") {
		uploadText.textContent = "Choose from .mp4, .mov, .avi, .webm";
	} else if (mediaType === "document") {
		uploadText.textContent =
			"Choose from .pdf, .doc, .docx, .xls, .xlsx, .txt, .csv";
	} else {
		uploadText.textContent = "Unsupported file type. Try again maybe? 🤷‍♂️";
	}
}

const url = location.href.split("/")[4];

if (url == "edit") {
	document.querySelector(
		"input[placeholder='Give new template a name']",
	).value = data.name;
}

// Access the BODY component from the `data` object
selectLanguage(data.language.language, data.language.code);
const bodyText = data?.body_preview || data.components.find((c) => c.type == "BODY")?.text || "";
document.getElementById("bodyInput").innerHTML = bodyText.replace(
	/\n/g,
	"<br>",
);

// Access the FOOTER component from the `data` object
const footerText = data.components.find((c) => c.type == "FOOTER")?.text || "";
document.getElementById("footerInput").value =   footerText.replace(
	/\n/g,
	"<br>",
); 

const headerComponent = data.components.find((c) => c.type == "HEADER");
const headerText = headerComponent?.text || "";

// If it's a text header
if (headerText) {
	document.getElementById("noneInputContainer").classList.add("hidden");
	document.getElementById("headerInputContainer").classList.toggle("hidden");
	document.getElementById("mediaTypeDropdown").value = "text";
	document.getElementById("headerInput").value = headerText;

	// Update the preview for the header text
	document.getElementById("previewHeader").innerHTML = headerText.replace(
		/\n/g,
		"<br>",
	);
	document.getElementById("previewHead").innerHTML = headerText.replace(
		/\n/g,
		"<br>",
	);
}
// If it's an image in the header component
else if (
	headerComponent?.format === "IMAGE" &&
	headerComponent?.example?.header_url
) {
	document.getElementById("mediaTypeDropdown").value = "media";

	const imageUrl = headerComponent.example.header_url
		.split("/")
		.slice(3)
		.join("/");

	// Update the preview for the image
	document.getElementById(
		"previewHeader",
	).innerHTML = `<img src="/${imageUrl}" alt="Header Media" class="custom-card-img">`;
	document.getElementById(
		"previewHead",
	).innerHTML = `<img src="/${imageUrl}" alt="Header Media" class="custom-card-img">`;
}
// If it's a document in the header component
else if (
	headerComponent?.format === "DOCUMENT" &&
	headerComponent?.example?.header_url
) {
	document.getElementById("mediaTypeDropdown").value = "media";
	const documentUrl = headerComponent.example.header_url
		.split("/")
		.slice(3)
		.join("/");

	// Update the preview for the document
	document.getElementById(
		"previewHeader",
	).innerHTML = `<iframe src="/${documentUrl}" class="max-w-full h-auto object-contain"></iframe>`;
	document.getElementById(
		"previewHead",
	).innerHTML = `<iframe src="/${documentUrl}" class="max-w-full h-auto object-contain"></iframe>`;
} else if (
	headerComponent?.format === "VIDEO" &&
	headerComponent?.example?.header_url
) {
	// 1️⃣ Switch dropdown to video mode
	document.getElementById("mediaTypeDropdown").value = "media";

	// 2️⃣ Strip off the first three path segments, same as docs
	const videoUrl = headerComponent.example.header_url
		.split("/")
		.slice(3)
		.join("/");

	// 3️⃣ Render the video player with controls + fallback text
	const videoMarkup = `
    <video controls class="max-w-full h-auto object-contain">
      <source src="/${videoUrl}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
  `;

	document.getElementById("previewHeader").innerHTML = videoMarkup;
	document.getElementById("previewHead").innerHTML = videoMarkup;
}

// If no headerText or media, default the dropdown to "none"
else {
	document.getElementById("mediaTypeDropdown").value = "none";
	document.getElementById("previewHeader").innerHTML = "";
	document.getElementById("previewHead").innerHTML = "";
}

document.getElementById("previewBody").innerHTML = bodyText.replace(
	/\n/g,
	"<br>",
);
document.getElementById("previewBod").innerHTML = bodyText;
document.getElementById("charCount").textContent = bodyText.length + "/1024";

document.getElementById("previewFooter").innerHTML = footerText.replace(
	/\n/g,
	"<br>",
);
document.getElementById("previewFoot").innerHTML = footerText.replace(
	/\n/g,
	"<br>",
);
document.querySelector(".footer-count").textContent = footerText.length + "/64";

(() => {
	const previewContainers = ["previewButtons", "previewButton"];
	let websiteBtnCount = 0;
	let callBtnCount = 0;

	const websiteForm = document.getElementById("websiteForm");
	const callForm = document.getElementById("callForm");
	const websiteLabel = document.getElementById("websiteBtnLabel");
	const websiteUrl = document.getElementById("websiteUrl");
	const callLabel = document.getElementById("callBtnLabel");
	const phoneNumber = document.getElementById("phoneNumber");

	document.getElementById("addWebsiteBtn").addEventListener("click", () => {
		if (websiteBtnCount >= 1) {
			toast("info", "You can only add 1 website button.");
			return;
		}
		websiteForm.style.display = "block";
		websiteBtnCount++;
		updateWebsitePreview();
	});

	document.getElementById("closeWebsite").addEventListener("click", () => {
		websiteForm.style.display = "none";
		websiteBtnCount = Math.max(0, websiteBtnCount - 1);
		removePreview("website");
	});

	document.getElementById("addCallBtn").addEventListener("click", () => {
		if (callBtnCount >= 1) {
			toast("info", "You can only add 1 call button.");
			return;
		}
		callForm.style.display = "block";
		callBtnCount++;
		updateCallPreview();
	});

	document.getElementById("closeCall").addEventListener("click", () => {
		callForm.style.display = "none";
		callBtnCount = Math.max(0, callBtnCount - 1);
		removePreview("call");
	});

	websiteLabel.addEventListener("input", updateWebsitePreview);
	websiteUrl.addEventListener("input", updateWebsitePreview);
	callLabel.addEventListener("input", updateCallPreview);
	phoneNumber.addEventListener("input", updateCallPreview);

	function updateWebsitePreview() {
		const label = (websiteLabel?.value || "").trim() || "Visit Now";
		const url = document.getElementById("websiteUrl").value || "#";
		createOrUpdate("website", label, url);
	}

	function updateCallPreview() {
		const label = (callLabel?.value || "").trim() || "Call Now";
		const phone = document.getElementById("phoneNumber").value || "#";
		createOrUpdate("call", label, phone);
	}

	function createOrUpdate(type, label, value) {
		previewContainers.forEach((cid) => {
			const c = document.getElementById(cid);
			if (!c) return;

			// Clear existing preview of that type first
			const existing = c.querySelector(`[data-preview-type="${type}"]`);
			if (existing) existing.remove();

			// Add new button if label exists
			if (label) {
				const btn = document.createElement("button");
				btn.setAttribute("data-preview-type", type);
				btn.setAttribute("draggable", "true");
				btn.className = `btn ${type}Btn`;
				btn.style.color = "#6A67FF";

				if (type === "website") {
					btn.setAttribute(
						"onclick",
						`window.open('${value}', '_blank')`,
					);
					btn.innerHTML = `<i class="fa fa-external-link mx-2"></i>${label}`;
				} else if (type === "call") {
					btn.setAttribute(
						"onclick",
						`window.location.href='tel:${value}'`,
					);
					btn.innerHTML = `<i class="fa fa-phone mx-2"></i>${label}`;
				}

				c.appendChild(btn);
			}
		});
		makeButtonsDraggable();
	}

	function removePreview(type) {
		previewContainers.forEach((cid) => {
			const c = document.getElementById(cid);
			if (!c) return;
			const el = c.querySelector(`[data-preview-type="${type}"]`);
			if (el) el.remove();
			Array.from(c.childNodes).forEach((node) => {
				if (
					node.nodeType === Node.TEXT_NODE &&
					!node.textContent.trim()
				)
					node.remove();
			});
			if (!c.querySelector("[data-preview-type]")) c.innerHTML = "";
		});
	}

	const buttons =
		data.components.find((c) => c.type == "BUTTONS")?.buttons || "";

	if (buttons) {
		buttons.forEach((element) => {
			if (element.type == "URL") {
				document.getElementById("websiteForm").style.display = "block";
				document.querySelector('input[placeholder="Visit Now"]').value =
					element.text;
				document.querySelector(
					'input[placeholder="example.com"]',
				).value = element.url;

				websiteBtnCount = 1;
				createOrUpdate(
					"website",
					element.text || "Visit Now",
					element.url,
				);
			} else if (element.type == "PHONE_NUMBER") {
				document.getElementById("callForm").style.display = "block";
				document.querySelector('input[placeholder="Call Now"]').value =
					element.text;
				document.querySelector(
					'input[placeholder="9999999999"]',
				).value = element.phone_number.slice(2);

				callBtnCount = 1;
				createOrUpdate(
					"call",
					element.text || "Call Now",
					element.phone_number,
				);
			}
		});
	}
})();

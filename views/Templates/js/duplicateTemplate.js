const url = location.href.split("/")[4];

if (url == "edit") {
	document.querySelector(
		"input[placeholder='Give new template a name']",
	).value = data.name;
}

// Access the BODY component from the `data` object
selectLanguage(data.language.language, data.language.code);
const bodyText = data.components.find((c) => c.type == "BODY")?.text || "";
document.getElementById("bodyInput").innerHTML = bodyText.replace(
	/\n/g,
	"<br>",
);

// Access the FOOTER component from the `data` object
const footerText = data.components.find((c) => c.type == "FOOTER")?.text || "";
document.getElementById("footerInput").innerHTML = footerText.replace(
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
	headerComponent?.example?.header_handle?.[0]
) {
	document.getElementById("mediaTypeDropdown").value = "media";

	const imageUrl = headerComponent.example.header_handle[0]
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
	headerComponent?.example?.header_handle?.[0]
) {
	document.getElementById("mediaTypeDropdown").value = "media";
	const documentUrl = headerComponent.example.header_handle[0]
		.split("/")
		.slice(3)
		.join("/");

	// Update the preview for the document
	document.getElementById(
		"previewHeader",
	).innerHTML = `<a href="${documentUrl}" target="_blank" class="custom-card-document">View Document</a>`;
	document.getElementById(
		"previewHead",
	).innerHTML = `<a href="${documentUrl}" target="_blank" class="custom-card-document">View Document</a>`;
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

const buttons = data.components.find((c) => c.type == "BUTTONS")?.buttons || "";
if (buttons) {
	buttons.forEach((element) => {
		if (element.type == "URL") {
			document.getElementById("websiteForm").style.display = "block";
			generatePrevWebsite(element.text, element.url);
			document.querySelector('input[placeholder="Visit Now"]').value =
				element.text;
			document.querySelector('input[placeholder="example.com"]').value =
				element.url;

			websiteBtnCount++;
		} else {
			document.getElementById("callForm").style.display = "block";
			generatePrevCall(element.text, element.phone_number);

			// Check for 'Call Now' (Phone Call) button
			document.querySelector('input[placeholder="Call Now"]').value =
				element.text;
			document.querySelector('input[placeholder="9999999999"]').value =
				element.phone_number;
			callBtnCount++;
		}
	});
}

document.getElementById("closeWebsite").addEventListener("click", function () {
	document.getElementById("websiteForm").style.display = "none";
	removePreviewButton("websiteBtn");
	document.querySelector('input[placeholder="Visit Now"]').value = "";
	document.querySelector('input[placeholder="example.com"]').value = "";

	websiteBtnCount--;
});

document.getElementById("closeCall").addEventListener("click", function () {
	document.getElementById("callForm").style.display = "none";
	removePreviewButton("callBtn");
	document.querySelector('input[placeholder="Call Now"]').value = "";
	document.querySelector('input[placeholder="9999999999"]').value = "";

	callBtnCount--;
});

function generatePrevWebsite(label, url) {
	// console.log(label, url);
	let preview = `
				<button class="btn" id="websiteBtn" draggable="true" onclick="window.open('${url}', '_blank')" style="color: #6A67FF;">
					<i class="fa fa-external-link mx-2"></i>${label}
				</button>
				`;

	let existingBtn = document.getElementById("websiteBtn");
	if (existingBtn) {
		existingBtn.outerHTML = preview;
	} else {
		document.getElementById("previewButtons").innerHTML += preview;
		document.getElementById("previewButton").innerHTML += preview;
	}

	makeButtonsDraggable();
}

function generatePrevCall(label, phone) {
	let preview = `
				<button class="btn" id="callBtn" draggable="true" onclick="window.location.href='tel:${phone}'" style="color: #6A67FF;">
					<i class="fa fa-phone mx-2"></i>${label}
				</button>
				`;

	let existingBtn = document.getElementById("callBtn");
	if (existingBtn) {
		existingBtn.outerHTML = preview;
	} else {
		document.getElementById("previewButtons").innerHTML += preview;
		document.getElementById("previewButton").innerHTML += preview;
	}

	makeButtonsDraggable();
}

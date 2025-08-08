const previewBody = document.getElementById("previewBody");
const previewBod = document.getElementById("previewBody");
const previewFooter = document.getElementById("previewFooter");
const previewFoot = document.getElementById("previewFoot");
const authDiv = document.getElementById("authenticationBody");


// ............................Code Delivery Setup...........................................


const radios = document.querySelectorAll('input[name="codeDelivery"]');
const appSetup = document.getElementById("appSetup");
const appRows = document.getElementById("appRows");
const addAppBtn = document.getElementById("addAppBtn");
const validationErrors = document.getElementById("validationErrors");
const autofillPreview = document.getElementById("previewAuthAutofill");
const copycodePreview = document.getElementById("previewAuthCopyCode");
const copycodePreviewSpan = document.getElementById("previewAuthCopyCodeSpan");
const autofillInput = document.getElementById("auto-fill-view");

let appCount = 0;

const toggleAppSetup = (show) => {
	if (show) {
		appSetup.classList.remove("max-h-0", "overflow-hidden");
		appSetup.classList.add("max-h-[62.5rem]");
		if (appCount === 0) addNewAppRow();
	} else {
		appSetup.classList.add("max-h-0", "overflow-hidden");
		appSetup.classList.remove("max-h-[62.5rem]");
	}
};

function updatePreviewUI(isCopy) {
	if (isCopy) {
		copycodePreview.classList.remove("hidden");
		autofillPreview.classList.add("hidden");
		autofillInput.classList.add("hidden");
	} else {
		copycodePreview.classList.add("hidden");
		autofillPreview.classList.remove("hidden");
		autofillInput.classList.remove("hidden");
	}
	toggleAppSetup(!isCopy);
}

function checkAndApplyInitialState() {
	if (!authDiv.classList.contains("hidden")) {
		const selected = document.querySelector(
			'input[name="codeDelivery"]:checked',
		);
		if (selected) updatePreviewUI(selected.value === "copy_code");
	}
}

radios.forEach((radio) => {
	radio.addEventListener("change", () => {
		updatePreviewUI(radio.value === "copy_code");
	});
});

new MutationObserver(() => {
	checkAndApplyInitialState();
}).observe(authDiv, { attributes: true, attributeFilter: ["class"] });

checkAndApplyInitialState();

const isValidPackageName = (name) => {
	return /^[a-zA-Z]+([a-zA-Z0-9_]*\.)+[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
};

const validateRows = () => {
	let errors = new Set();
	const packageNames = new Set();
	const hashes = new Set();

	const rows = document.querySelectorAll("#appRows > div");

	rows.forEach((row) => {
		const pkgInput = row.querySelector(".package");
		const hashInput = row.querySelector(".hash");

		const pkg = pkgInput.value.trim();
		const hash = hashInput.value.trim();

		// Highlight error on input
		pkgInput.classList.toggle("border-red-500", !isValidPackageName(pkg));
		hashInput.classList.toggle("border-red-500", hash.length !== 11);

		if (!pkg || !hash) errors.add("All fields are required.");
		if (!isValidPackageName(pkg))
			errors.add(
				"Your package name is not a valid Android application ID.",
			);
		if (hash.length !== 11)
			errors.add("Your signature hash must be 11 characters long.");

		const key = `${pkg}_${hash}`;
		if (packageNames.has(pkg)) errors.add("Duplicate package name.");
		if (hashes.has(hash)) errors.add("Duplicate signature hash.");

		packageNames.add(pkg);
		hashes.add(hash);
	});

	validationErrors.innerHTML = [...errors]
		.map((e) => `<p class="text-sm">⚠️ ${e}</p>`)
		.join("");
};

const addNewAppRow = () => {
	if (appCount >= 5) return;

	const rowId = `appRow-${Date.now()}`;
	const row = document.createElement("div");
	row.className = "flex flex-col md:flex-row md:items-start gap-4 group";
	row.id = rowId;
	row.innerHTML = `
    <div class="flex-1">
        <div class="flex items-center w-full border border-gray-300 rounded p-2 text-sm">
      <input type="text" placeholder="com.example.myapplication" maxlength="224"
             class="package grow"
             oninput="this.nextElementSibling.textContent = this.value.length + '/224'; validateRows();" />
      <p class="text-xs text-right text-gray-400 shrink">0/224</p></div>
    </div>
    <div class="flex-1">
        <div class="flex items-center w-full border border-gray-300 rounded p-2 text-sm">
      <input type="text" placeholder="Enter hash" maxlength="11"
             class="hash grow"
             oninput="this.nextElementSibling.textContent = this.value.length + '/11'; validateRows();" />
      <p class="text-xs text-right text-gray-400 shrink">0/11</p></div>
    </div>
    <button type="button" class="text-red-500 mt-1 md:mt-6 remove-btn">✕</button>
  `;
	appRows.appendChild(row);
	appCount++;
	attachRowEvents(row);
	validateRows();
};

const attachRowEvents = (row) => {
	row.querySelector(".remove-btn").addEventListener("click", () => {
		if (appCount <= 1)
			return toast("info", "At least one app config is required.");
		row.remove();
		appCount--;
		validateRows();
	});
};

addAppBtn.addEventListener("click", () => {
	addNewAppRow();
});

setInterval(validateRows, 500);


// ..................................Content..........................................


const securityPreview = document.createElement("span");
const dupSecurity = securityPreview.cloneNode();
securityPreview.innerHTML = " For your security, do not share this code.";

function toggleCustomCheck(el) {
	const wrapper = el.parentElement;
	const tick = wrapper.querySelector(".custom-tick");
	const box = wrapper.querySelector(".custom-box");

	if (el.name === "otpCheckbox") {
		const otpDiv = document.getElementById("otpDiv");
		if (el.checked) {
			otpDiv.classList.remove("hidden");
			tick.classList.remove("hidden");
			box.style.border = "1px solid black";
		} else {
			otpDiv.classList.add("hidden");
			tick.classList.add("hidden");
			box.style.border = "1px solid #9ca3af";
		}
	}

	if (el.name === "addSecurityCheckbox") {
		if (el.checked) {
			tick.classList.remove("hidden");
			box.style.border = "1px solid black";
			previewBody.appendChild(securityPreview);
			previewBod.appendChild(dupSecurity);
		} else {
			tick.classList.add("hidden");
			box.style.border = "1px solid #9ca3af";
			previewBody.removeChild(securityPreview);
			previewBod.removeChild(dupSecurity);
		}
	}
}

const deliveryRadios = document.querySelectorAll('input[name="codeDelivery"]');
const link = document.getElementById("deliveryLink");
const container = document.getElementById("deliveryInfo");

deliveryRadios.forEach((radio) => {
	radio.addEventListener("change", () => {
		if (radio.checked && radio.value === "zero_tap") {
			container.innerHTML = `ℹ️ Make sure your app meets the eligibility criteria for zero-tap autofill. 
				<a href="https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates/zero-tap-authentication-templates" target="_blank" class="underline text-sm">View Zero-Tap Requirements</a>`;
		} else {
			container.innerHTML = `ℹ️ Only add different builds of the same app (not totally different apps). 
				<a href="https://developers.facebook.com/docs/whatsapp/business-management-api/authentication-templates/autofill-button-authentication-templates#eligibility-check" target="_blank" class="underline text-sm">Learn more</a>`;
		}
	});
});


// ..................................otp validation...........................................


const otpInput = document.getElementById("otpExpiration");
const otpError = document.getElementById("otpError");
const otpWrapper = document.getElementById("otpInputWrapper");
previewFoot.innerHTML = "";
previewFooter.innerHTML = "";

otpWrapper.addEventListener("click", () => {
	otpInput.focus();
});

otpInput.addEventListener("keydown", (e) => {
	if (
		["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(
			e.key,
		)
	)
		return;

	if (!/^\d$/.test(e.key)) {
		e.preventDefault();
	}
});

otpInput.addEventListener("input", (e) => {
	const val = otpInput.value.trim();

	if (val === "" || isNaN(val) || val < 0 || val > 90) {
		otpError.classList.remove("hidden");
		otpInput.classList.add("border-red-500");
		previewFooter.innerHTML = ``;
		previewFoot.innerHTML = "";
	} else {
		otpError.classList.add("hidden");
		otpInput.classList.remove("border-red-500");
		previewFooter.innerHTML = `This code expires in ${val} minutes.`;
		previewFoot.innerHTML = `This code expires in ${val} minutes.`;
	}
});


// ..................................Buttons..............................................


function handlePackageInput(input) {
	const charCount = input.value.length;
	const counter = input.nextElementSibling;
	const type = input.dataset.type;

	counter.textContent = `${charCount}/25`;

	if (type === "autofill") {
		autofillPreview.innerHTML = charCount ? input.value : "Autofill";
	} else if (type === "copycode") {
		copycodePreviewSpan.innerHTML = charCount ? input.value : "Copy code";
	}
}


// ..................... Message Validation .............................


const toggle = document.getElementById("customValidityToggle");
const section = document.getElementById("messageValidityPeriod");

toggle.addEventListener("change", () => {
	if (toggle.checked) {
		section.classList.remove("hidden");
	} else {
		section.classList.add("hidden");
	}
});


// ...............................tooltip.....................................


document.querySelectorAll(".tooltip-container").forEach((container) => {
	const tooltip = container.querySelector(".tooltip");

	const showTooltip = () => {
		tooltip.style.opacity = "1";
		tooltip.style.visibility = "visible";
	};

	const hideTooltip = () => {
		tooltip.style.opacity = "0";
		tooltip.style.visibility = "hidden";
	};

	[".info-icon", ".info-icon-small"].forEach((selector) => {
		const icon = container.querySelector(selector);
		if (icon) {
			icon.addEventListener("mouseenter", showTooltip);
			icon.addEventListener("mouseleave", hideTooltip);
		}
	});
});

$(document).ready(function () {
  $(".dropdown-item").on("click", function () {
    var selectedText = $(this).text();
    $("#mediaTypeDropdown").text(selectedText);
  });
});

// Header Input Preview
document.getElementById("chooseText").addEventListener("click", function () {
  document.getElementById("headerInputContainer").style.display = "block";
  document.getElementById("mediaInputContainer").style.display = "none";
  document.getElementById("previewHeader").textContent = "";
});

document.getElementById("chooseMedia").addEventListener("click", function () {
  document.getElementById("headerInputContainer").style.display = "none";
  document.getElementById("mediaInputContainer").style.display = "block";
  document.getElementById("previewHeader").innerHTML = "";
});

document.getElementById("headerInput").addEventListener("input", function () {
  document.getElementById("previewHeader").textContent = this.value;
});

document.getElementById("mediaInput").addEventListener("change", function () {
  const file = this.files[0];
  const previewHeader = document.getElementById("previewHeader");
  previewHeader.innerHTML = "";

  if (file) {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = document.createElement("img");
        img.src = e.target.result;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "250px";
        previewHeader.appendChild(img);
      };
      reader.readAsDataURL(file);
    } else {
      const maxLength = 14;
      let fileName = file.name;
      const fileExtension = fileName.split(".").pop();

      if (fileName.length > maxLength) {
        fileName =
          fileName.slice(0, maxLength - fileExtension.length - 1) +
          "..." +
          "." +
          fileExtension;
      }

      const fileNameElement = document.createElement("p");
      fileNameElement.textContent = `File: ${fileName}`;
      previewHeader.appendChild(fileNameElement);

      const previewLink = document.createElement("p");
      previewLink.textContent = "Preview";
      previewLink.style.marginTop = "1px";
      previewLink.classList.add("preview-link-class");

      previewLink.addEventListener("click", function () {
        const newTab = window.open(URL.createObjectURL(file), "_blank");
        newTab.focus();
      });

      previewHeader.appendChild(previewLink);
    }
  }
});

// Footer Input Preview
document.getElementById("footerInput").addEventListener("input", function () {
  document.getElementById("previewFooter").textContent = this.value;
  document.querySelector(".footer-count").textContent =
    this.value.length + "/64";
});

document.getElementById("bodyInput").addEventListener("input", function () {
  document.getElementById("previewBody").innerHTML = this.innerHTML;
  document.querySelector("small.text-secondary.float-end").textContent =
    this.textContent.length + "/1024";
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

let websiteBtnCount = 0;
let callBtnCount = 0;

// Add Website Button
document.getElementById("addWebsiteBtn").addEventListener("click", function () {
  if (websiteBtnCount >= 2) {
    alert("You can only add 2 website buttons.");
    return;
  }

  let uniqueId = new Date().getTime();
  websiteBtnCount++;

  // Form for website button
  let websiteForm = `
        <div class=" border rounded shadow-sm  action-card mt-3" id="websiteForm_${uniqueId}">
            <div class="d-flex justify-content-between align-items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="websiteBtnLabel_${uniqueId}" placeholder="Visit Now">
                    </div>
                     <div class="col-3 p-1 flex justify-content-center">
                                    <label class="form-label">Website URL</label>
                                    <div class="dropdown dropdown-default w-100">
                                        <button class="btn w-100 dropdown-toggle text-secondary shadow-sm rounded border-1 py-2" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                            Static
                                        </button>
                                        <div class="dropdown-menu">
                                            <a class="dropdown-item" href="#">Static</a>
                                            <a class="dropdown-item" href="#">Dynamic</a>
                                        </div>
                                    </div>
                                </div>
                    <div class="col-4">
                        <label>Website URL</label>
                        <input type="text" class="form-control" id="websiteUrl_${uniqueId}" placeholder="example.com">
                    </div>
                    <div class="col-1 close-icon">
                        <span class="remove-btn" data-id="websiteForm_${uniqueId}">&times;</span>
                    </div>
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
document.getElementById("addCallBtn").addEventListener("click", function () {
  if (callBtnCount >= 1) {
    alert("You can only add 1 call button.");
    return;
  }

  let uniqueId = new Date().getTime();
  callBtnCount++;

  // Form for call button
  let callForm = `
        <div class=" border rounded shadow-sm action-card mt-3" id="callForm_${uniqueId}">
            <div class="d-flex justify-content-between align-items-center">
                <div class="drag-handle">::</div>
                <div class="row w-100">
                    <div class="col-4">
                        <label>Button label</label>
                        <input type="text" class="form-control" id="callBtnLabel_${uniqueId}" placeholder="Call Now">
                    </div>
                     <div class="col-3 p-1 flex justify-content-center">
                                    <label class="form-label">Website URL</label>
                                    <div class="dropdown dropdown-default w-100">
                                        <button class="btn text-secondary w-100 dropdown-toggle shadow-sm rounded border-1 py-2" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                            Static
                                        </button>
                                        <div class="dropdown-menu">
                                            <a class="dropdown-item" href="#">Static</a>
                                            <a class="dropdown-item" href="#">Dynamic</a>
                                        </div>
                                    </div>
                                </div>
                    <div class="col-4">
                        <label>Phone Number</label>
                        <input type="text" class="form-control" id="phoneNumber_${uniqueId}" placeholder="9999999999">
                    </div>
                    <div class="col-1 close-icon">
                        <span class="remove-btn" data-id="callForm_${uniqueId}">&times;</span>
                    </div>
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
    document.getElementById("websiteBtnLabel_" + id).value || "Visit Now";
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
  let label = document.getElementById("callBtnLabel_" + id).value || "Call Now";
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

document.addEventListener("DOMContentLoaded", () => {

  const removeStartScreen = document.getElementById("removeStartScreen");
  const removePreviewScreen = document.getElementById("removePreviewScreen");
  const removeSuccessScreen = document.getElementById("removeSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const removeBtn = document.getElementById("removeBtn");
  const progressBar = document.getElementById("progressBar");

  const pagesInput = document.getElementById("pagesInput");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFiles = [];
let finalPdfUrl = null;
let finalDownloadName = "updated.pdf";
let progressInterval = null;

let individualPageSelections = [];
let applySamePagesToAll = false;

  /* =========================
     INITIAL STATE
  ========================= */

  removeStartScreen.style.display = "flex";

  removePreviewScreen.classList.add("hidden-screen");
  removeSuccessScreen.classList.add("hidden-screen");

  removePreviewScreen.style.display = "none";
  removeSuccessScreen.style.display = "none";

  /* =========================
     CLICK SELECT
  ========================= */

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  /* =========================
     FILE SELECT
  ========================= */

  fileInput.addEventListener("change", (e) => {

  const files = Array.from(e.target.files);

  if (!files.length) return;

  const validFiles = files.filter((file) =>
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );

  if (validFiles.length !== files.length) {
    alert("Only PDF files are allowed");
  }

  if (!validFiles.length) return;

  const availableSlots = 10 - selectedFiles.length;

  if (availableSlots <= 0) {
    alert("You can select up to 10 PDF files.");
    return;
  }

  const filesToAdd = validFiles.slice(0, availableSlots);

  if (validFiles.length > availableSlots) {
    alert("You can select up to 10 PDF files.");
  }

  filesToAdd.forEach((file) => {
    file.previewUrl = URL.createObjectURL(file);
    selectedFiles.push(file);
  });

  renderPreview();

  // Allow selecting the same file again
  fileInput.value = "";

});

  /* =========================
     DRAG DROP
  ========================= */

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-active");
  });

  dropZone.addEventListener("drop", (e) => {

  e.preventDefault();

  dropZone.classList.remove("drag-active");

  const files = Array.from(e.dataTransfer.files);

  if (!files.length) return;

  const validFiles = files.filter((file) =>
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );

  if (validFiles.length !== files.length) {
    alert("Only PDF files are allowed");
  }

  if (!validFiles.length) return;

  const availableSlots = 10 - selectedFiles.length;

  if (availableSlots <= 0) {
    alert("You can select up to 10 PDF files.");
    return;
  }

  const filesToAdd = validFiles.slice(0, availableSlots);

  if (validFiles.length > availableSlots) {
    alert("You can select up to 10 PDF files.");
  }

  filesToAdd.forEach((file) => {
    file.previewUrl = URL.createObjectURL(file);
    selectedFiles.push(file);
  });

  renderPreview();

});
  /* =========================
     PREVIEW
  ========================= */

  function renderPreview() {

  if (!selectedFiles.length) return;

  removeStartScreen.style.display = "none";

  removePreviewScreen.classList.remove("hidden-screen");
  removePreviewScreen.style.display = "grid";

  removeSuccessScreen.classList.add("hidden-screen");
  removeSuccessScreen.style.display = "none";

  fileList.innerHTML = selectedFiles.map((file, index) => {

  const pagesValue =
    individualPageSelections[index] || "";

  return `
    <div class="merge-file-card remove-pdf-card">

      <button
        class="remove-file-btn"
        data-index="${index}"
        type="button"
      >
        ×
      </button>

      <div class="pdf-thumb-wrap">
        <embed
          src="${file.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
          type="application/pdf"
          class="pdf-thumb"
        />
      </div>

      <h3>${escapeHtml(file.name)}</h3>

      <span class="file-order-badge">${index + 1}</span>

      <div class="remove-file-pages">
        <label for="removePages-${index}">
          Pages to remove
        </label>

        <input
          type="text"
          id="removePages-${index}"
          class="individual-pages-input"
          data-index="${index}"
          placeholder="Example: 2,4,6"
          value="${escapeHtml(pagesValue)}"
        />

        <small>
          Separate page numbers with commas.
        </small>
      </div>

    </div>
  `;

}).join("");


  fileList
  .querySelectorAll(".remove-file-btn")
  .forEach((button) => {

    button.addEventListener("click", () => {

      const index = Number(button.dataset.index);

      const file = selectedFiles[index];

      if (file?.previewUrl) {
        URL.revokeObjectURL(file.previewUrl);
      }

      selectedFiles.splice(index, 1);

      individualPageSelections.splice(index, 1);

      if (!selectedFiles.length) {

        resetToStart();

        return;

      }

      renderPreview();

    });

  });


/* SAVE INDIVIDUAL PAGE SELECTIONS */

fileList
  .querySelectorAll(".individual-pages-input")
  .forEach((input) => {

    input.addEventListener("input", () => {

      const index = Number(input.dataset.index);

      individualPageSelections[index] =
        input.value.trim();

    });

  });
  /* =========================
     ADD MORE PDFs
  ========================= */

  let addMoreBtn = document.getElementById("removeAddMoreBtn");

  if (!addMoreBtn) {

    addMoreBtn = document.createElement("button");

    addMoreBtn.id = "removeAddMoreBtn";
    addMoreBtn.type = "button";
    addMoreBtn.className = "remove-add-more-btn";

addMoreBtn.innerHTML = `
  <i class="fa-solid fa-plus"></i>
`;

    removePreviewScreen
      .querySelector(".remove-preview-left")
      .appendChild(addMoreBtn);

    addMoreBtn.addEventListener("click", () => {

      if (selectedFiles.length >= 10) {
        alert("You can select up to 10 PDF files.");
        return;
      }

      fileInput.click();

    });

  }

  addMoreBtn.style.display =
    selectedFiles.length < 10 ? "flex" : "none";
  }
  /* APPLY SAME PAGES TO ALL */

  let samePagesBox =
    document.getElementById("applySamePagesBox");

  if (!samePagesBox) {

    samePagesBox = document.createElement("label");

    samePagesBox.id = "applySamePagesBox";
    samePagesBox.className = "apply-same-pages-box";

    samePagesBox.innerHTML = `
      <input
        type="checkbox"
        id="applySamePages"
      />

      <span>
        Apply same pages to all PDFs
      </span>
    `;

    const actionPanel =
      removePreviewScreen.querySelector(
        ".remove-action-panel"
      );

    const removeOptionBox =
      actionPanel?.querySelector(
        "#pagesSelectionArea"
      );

    if (removeOptionBox) {
      removeOptionBox.appendChild(samePagesBox);
    }
  }

  const samePagesCheckbox =
    document.getElementById("applySamePages");

  if (samePagesCheckbox) {

    samePagesCheckbox.checked =
      applySamePagesToAll;

    samePagesCheckbox.onchange = () => {

      applySamePagesToAll =
        samePagesCheckbox.checked;

      if (applySamePagesToAll) {

        const commonPages =
          pagesInput.value.trim();

        individualPageSelections =
          selectedFiles.map(() => commonPages);

        fileList
          .querySelectorAll(".individual-pages-input")
          .forEach((input) => {

            input.value = commonPages;
            input.disabled = true;

          });

      } else {

        fileList
          .querySelectorAll(".individual-pages-input")
          .forEach((input) => {

            input.disabled = false;

          });

      }

    };

  }

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resetToStart() {

  selectedFiles.forEach((file) => {

    if (file.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }

  });

  selectedFiles = [];

  fileList.innerHTML = "";

  removeStartScreen.style.display = "flex";

  removePreviewScreen.classList.add("hidden-screen");
  removePreviewScreen.style.display = "none";

  removeSuccessScreen.classList.add("hidden-screen");
  removeSuccessScreen.style.display = "none";

  pagesInput.value = "";

  resetProgress();

  fileInput.value = "";

}

  /* =========================
     PROGRESS
  ========================= */

  function resetProgress() {

    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startFakeProgress() {

    let progress = 18;

    progressBar.style.width = "18%";
    progressBar.textContent = "18%";

    progressInterval = setInterval(() => {

      if (progress < 90) {

        progress += 5;

        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";

      }

    }, 650);

  }

  function completeProgress() {

    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";

  }

  /* =========================
     REMOVE PAGES
  ========================= */

  removeBtn?.addEventListener("click", async () => {

    if (!selectedFiles.length) {

      alert("Please select a PDF file");

      return;
    }

    if (selectedFiles.length === 1) {

  if (!pagesInput.value.trim()) {
    alert("Please enter page numbers");
    return;
  }

} else if (applySamePagesToAll) {

  if (!pagesInput.value.trim()) {
    alert("Please enter pages to remove");
    return;
  }

} else {

  const hasEmptySelection =
    individualPageSelections.some(
      (pages) => !String(pages || "").trim()
    );

  if (hasEmptySelection) {
    alert("Please enter pages to remove for every PDF");
    return;
  }

}

    const formData = new FormData();

    selectedFiles.forEach((file) => {
  formData.append("pdf", file);
});
    formData.append("pages", pagesInput.value.trim());
    if (selectedFiles.length === 1) {

  formData.append(
    "pages",
    pagesInput.value.trim()
  );

} else if (applySamePagesToAll) {

  const commonPages =
    pagesInput.value.trim();

  formData.append(
    "pages",
    commonPages
  );

  formData.append(
    "pagesByFile",
    JSON.stringify(
      selectedFiles.map(() => commonPages)
    )
  );

} else {

  formData.append(
    "pagesByFile",
    JSON.stringify(individualPageSelections)
  );

}
const { data } = await window.supabaseClient.auth.getUser();

if (!data?.user) {
  alert("Please login first");
  return;
}

formData.append("user_id", data.user.id);
    startFakeProgress();

    removeBtn.disabled = true;

    removeBtn.innerHTML = `
      Removing...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/remove-pages", {
        method: "POST",
        body: formData
      });

    if (!response.ok) {

  const errorText = await response.text();

  if (errorText.includes("Daily free limit reached")) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {

      const message =
        upgradeModal.querySelector("p");

      if (message) {
        message.textContent =
          "You have reached your daily free limit. Upgrade to Premium for unlimited access to all PDF tools.";
      }

      const heading =
        upgradeModal.querySelector("h2");

      if (heading) {
        heading.textContent = "Free Limit Reached";
      }

      upgradeModal.style.display = "flex";
    }

  } else if (
    errorText.includes(
      "Multiple PDF files are available for Premium users only"
    )
  ) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {

      const heading =
        upgradeModal.querySelector("h2");

      if (heading) {
        heading.textContent = "Upgrade to Premium";
      }

      const message =
        upgradeModal.querySelector("p");

      if (message) {
        message.textContent =
          "Multiple PDF files are a Premium feature. Upgrade to Premium to process multiple PDFs at once.";
      }

      upgradeModal.style.display = "flex";
    }

  } else {

    alert(errorText || "Failed to remove pages");

  }

  resetProgress();
  return;
}

      const blob = await response.blob();
      if (blob.type === "application/zip") {

  finalDownloadName = "removed-pages.zip";

} else {

  finalDownloadName = "updated.pdf";

}

      if (!blob || blob.size < 100) {

        alert("Failed to remove pages");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        removePreviewScreen.classList.add("hidden-screen");
        removePreviewScreen.style.display = "none";

        removeSuccessScreen.classList.remove("hidden-screen");
        removeSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("REMOVE PAGES ERROR:", error);

      alert("Failed to remove pages");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      removeBtn.disabled = false;

      removeBtn.innerHTML = `
        Remove Pages
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* =========================
     DOWNLOAD
  ========================= */

  downloadBtn?.addEventListener("click", () => {

  if (!finalPdfUrl) {
    alert("File not ready yet");
    return;
  }

  const a = document.createElement("a");

  a.href = finalPdfUrl;
  a.download = finalDownloadName;

  document.body.appendChild(a);

  a.click();

  a.remove();

});
  const closeUpgradeModal =
  document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

  closeUpgradeModal.addEventListener("click", () => {

    document.getElementById("upgradeModal")
      .style.display = "none";

  });

}

});
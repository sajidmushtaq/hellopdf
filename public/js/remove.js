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

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;

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

    const file = e.target.files[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a PDF file");
      return;
    }

    selectedFile = file;

    selectedFile.previewUrl = URL.createObjectURL(file);

    renderPreview();

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

    const file = e.dataTransfer.files[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a PDF file");
      return;
    }

    selectedFile = file;

    selectedFile.previewUrl = URL.createObjectURL(file);

    renderPreview();

  });

  /* =========================
     PREVIEW
  ========================= */

  function renderPreview() {

    if (!selectedFile) return;

    removeStartScreen.style.display = "none";

    removePreviewScreen.classList.remove("hidden-screen");
    removePreviewScreen.style.display = "grid";

    removeSuccessScreen.classList.add("hidden-screen");
    removeSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card remove-pdf-card">

        <button class="remove-file-btn" id="removeSelectedFile" type="button">
          ×
        </button>

        <div class="pdf-thumb-wrap">
          <embed
            src="${selectedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
            type="application/pdf"
            class="pdf-thumb"
          />
        </div>

        <h3>${selectedFile.name}</h3>

        <span class="file-order-badge">1</span>

      </div>
    `;

    const removeSelectedFileBtn = document.getElementById("removeSelectedFile");

    removeSelectedFileBtn.addEventListener("click", () => {

      if (selectedFile.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }

      selectedFile = null;

      fileList.innerHTML = "";

      removeStartScreen.style.display = "flex";

      removePreviewScreen.classList.add("hidden-screen");
      removePreviewScreen.style.display = "none";

      removeSuccessScreen.classList.add("hidden-screen");
      removeSuccessScreen.style.display = "none";

      pagesInput.value = "";

      resetProgress();

    });

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

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    if (!pagesInput.value.trim()) {

      alert("Please enter page numbers");

      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);
    formData.append("pages", pagesInput.value.trim());

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

        alert(errorText || "Failed to remove pages");

        return;
      }

      const blob = await response.blob();

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

      alert("PDF not ready yet");

      return;
    }

    const a = document.createElement("a");

    a.href = finalPdfUrl;

    a.download = "updated.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
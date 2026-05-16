document.addEventListener("DOMContentLoaded", () => {

  const extractStartScreen = document.getElementById("extractStartScreen");
  const extractPreviewScreen = document.getElementById("extractPreviewScreen");
  const extractSuccessScreen = document.getElementById("extractSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const extractBtn = document.getElementById("extractBtn");
  const progressBar = document.getElementById("progressBar");

  const pagesInput = document.getElementById("pagesInput");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;

  /* =========================
     INITIAL STATE
  ========================= */

  extractStartScreen.style.display = "flex";

  extractPreviewScreen.classList.add("hidden-screen");
  extractSuccessScreen.classList.add("hidden-screen");

  extractPreviewScreen.style.display = "none";
  extractSuccessScreen.style.display = "none";

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

    extractStartScreen.style.display = "none";

    extractPreviewScreen.classList.remove("hidden-screen");
    extractPreviewScreen.style.display = "grid";

    extractSuccessScreen.classList.add("hidden-screen");
    extractSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card extract-pdf-card">

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

      extractStartScreen.style.display = "flex";

      extractPreviewScreen.classList.add("hidden-screen");
      extractPreviewScreen.style.display = "none";

      extractSuccessScreen.classList.add("hidden-screen");
      extractSuccessScreen.style.display = "none";

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
     EXTRACT PAGES
  ========================= */

  extractBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    if (!pagesInput.value.trim()) {

      alert("Please enter page numbers");

      return;
    }

    const formData = new FormData();

    formData.append("pdfFile", selectedFile);
    formData.append("pages", pagesInput.value.trim());

    startFakeProgress();

    extractBtn.disabled = true;

    extractBtn.innerHTML = `
      Extracting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/extract-pages", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        const errorText = await response.text();

        alert(errorText || "Failed to extract pages");

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Failed to extract pages");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        extractPreviewScreen.classList.add("hidden-screen");
        extractPreviewScreen.style.display = "none";

        extractSuccessScreen.classList.remove("hidden-screen");
        extractSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("EXTRACT PAGES ERROR:", error);

      alert("Failed to extract pages");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      extractBtn.disabled = false;

      extractBtn.innerHTML = `
        Extract Pages
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

    a.download = "extracted-pages.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
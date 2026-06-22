document.addEventListener("DOMContentLoaded", () => {

  const compressStartScreen = document.getElementById("compressStartScreen");
  const compressPreviewScreen = document.getElementById("compressPreviewScreen");
  const compressSuccessScreen = document.getElementById("compressSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const compressBtn = document.getElementById("compressBtn");
  const progressBar = document.getElementById("progressBar");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let compressedPdfUrl = null;
  let progressInterval = null;

  /* =========================
     INITIAL STATE
  ========================= */

  compressStartScreen.style.display = "flex";

  compressPreviewScreen.classList.add("hidden-screen");
  compressSuccessScreen.classList.add("hidden-screen");

  compressPreviewScreen.style.display = "none";
  compressSuccessScreen.style.display = "none";

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

    compressStartScreen.style.display = "none";

    compressPreviewScreen.classList.remove("hidden-screen");
    compressPreviewScreen.style.display = "grid";

    compressSuccessScreen.classList.add("hidden-screen");
    compressSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card compress-pdf-card">

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

    const removeBtn = document.getElementById("removeSelectedFile");

    removeBtn.addEventListener("click", () => {

      if (selectedFile.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }

      selectedFile = null;

      fileList.innerHTML = "";

      compressStartScreen.style.display = "flex";

      compressPreviewScreen.classList.add("hidden-screen");
      compressPreviewScreen.style.display = "none";

      compressSuccessScreen.classList.add("hidden-screen");
      compressSuccessScreen.style.display = "none";

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
     COMPRESS PDF
  ========================= */

  compressBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    const { data } = await window.supabaseClient.auth.getUser();

if (!data?.user) {
  alert("Please login first");
  return;
}

formData.append("user_id", data.user.id);

    startFakeProgress();

    compressBtn.disabled = true;

    compressBtn.innerHTML = `
      Compressing...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/compress", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

  const errorText = await response.text();

  if (errorText.includes("Daily free limit reached")) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {
      upgradeModal.style.display = "flex";
    }

  } else {

    alert(errorText || "Compression failed");

  }

  return;
}

      completeProgress();
      const blob = await response.blob();

      if (compressedPdfUrl) {
        URL.revokeObjectURL(compressedPdfUrl);
      }

      compressedPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        compressPreviewScreen.classList.add("hidden-screen");
        compressPreviewScreen.style.display = "none";

        compressSuccessScreen.classList.remove("hidden-screen");
        compressSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("COMPRESS ERROR:", error);

      alert("Compression failed. Please try again.");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      compressBtn.disabled = false;

      compressBtn.innerHTML = `
        Compress PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* =========================
     DOWNLOAD
  ========================= */

  downloadBtn?.addEventListener("click", () => {

    if (!compressedPdfUrl) {

      alert("Compressed PDF not ready yet");

      return;
    }

    const a = document.createElement("a");

    a.href = compressedPdfUrl;

    a.download = "compressed.pdf";

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
document.addEventListener("DOMContentLoaded", () => {

  const protectStartScreen = document.getElementById("protectStartScreen");
  const protectPreviewScreen = document.getElementById("protectPreviewScreen");
  const protectSuccessScreen = document.getElementById("protectSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const protectBtn = document.getElementById("protectBtn");
  const progressBar = document.getElementById("progressBar");

  const passwordInput = document.getElementById("passwordInput");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;

  /* INITIAL */

  protectStartScreen.style.display = "flex";

  protectPreviewScreen.classList.add("hidden-screen");
  protectSuccessScreen.classList.add("hidden-screen");

  protectPreviewScreen.style.display = "none";
  protectSuccessScreen.style.display = "none";

  /* CLICK */

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  /* SELECT */

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

  /* DRAG DROP */

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

  /* PREVIEW */

  function renderPreview() {

    if (!selectedFile) return;

    protectStartScreen.style.display = "none";

    protectPreviewScreen.classList.remove("hidden-screen");
    protectPreviewScreen.style.display = "grid";

    protectSuccessScreen.classList.add("hidden-screen");
    protectSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card protect-pdf-card">

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

      protectStartScreen.style.display = "flex";

      protectPreviewScreen.classList.add("hidden-screen");
      protectPreviewScreen.style.display = "none";

      protectSuccessScreen.classList.add("hidden-screen");
      protectSuccessScreen.style.display = "none";

      resetProgress();

    });

  }

  /* PROGRESS */

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

  /* PROTECT PDF */

  protectBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    const password = passwordInput.value.trim();
    const showPasswordToggle = document.getElementById("showPasswordToggle");
    if (showPasswordToggle && passwordInput) {
  showPasswordToggle.addEventListener("change", () => {
    if (showPasswordToggle.checked) {
      passwordInput.setAttribute("type", "text");
    } else {
      passwordInput.setAttribute("type", "password");
    }
  });
}

if (showPasswordToggle) {
  showPasswordToggle.addEventListener("change", () => {
    passwordInput.type = showPasswordToggle.checked ? "text" : "password";
  });
}

    if (!password) {

      alert("Please enter password");

      return;
    }

    const formData = new FormData();

    formData.append("pdfFile", selectedFile);
    formData.append("password", password);

    startFakeProgress();

    protectBtn.disabled = true;

    protectBtn.innerHTML = `
      Protecting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/protect-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        const errorText = await response.text();

        alert(errorText || "Failed to protect PDF");

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Failed to protect PDF");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        protectPreviewScreen.classList.add("hidden-screen");
        protectPreviewScreen.style.display = "none";

        protectSuccessScreen.classList.remove("hidden-screen");
        protectSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("PROTECT ERROR:", error);

      alert("Failed to protect PDF");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      protectBtn.disabled = false;

      protectBtn.innerHTML = `
        Protect PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* DOWNLOAD */

  downloadBtn?.addEventListener("click", () => {

    if (!finalPdfUrl) {

      alert("PDF not ready yet");

      return;
    }

    const a = document.createElement("a");

    a.href = finalPdfUrl;

    a.download = "protected.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
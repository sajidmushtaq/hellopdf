document.addEventListener("DOMContentLoaded", () => {

  /* DRAWERS */

  const toolsMenuBtn =
    document.getElementById("toolsMenuBtn");

  const mainMenuBtn =
    document.getElementById("mainMenuBtn");

  const toolsDrawer =
    document.getElementById("toolsDrawer");

  const mainDrawer =
    document.getElementById("mainDrawer");

  const toolsClose =
    document.getElementById("toolsClose");

  const mainClose =
    document.getElementById("mainClose");

  const drawerOverlay =
    document.getElementById("drawerOverlay");

  const closeUpgradeModal =
    document.getElementById("closeUpgradeModal");

  let currentUser = null;

  (async () => {

    const { data } =
      await window.supabaseClient.auth.getUser();

    if (data && data.user) {

      currentUser = data.user;

    }

  })();

  const watermarkStartScreen =
    document.getElementById("watermarkStartScreen");
  const watermarkPreviewScreen = document.getElementById("watermarkPreviewScreen");
  const watermarkSuccessScreen = document.getElementById("watermarkSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const watermarkBtn = document.getElementById("watermarkBtn");
  const progressBar = document.getElementById("progressBar");

  const watermarkText = document.getElementById("watermarkText");
  const watermarkSize = document.getElementById("watermarkSize");
  const watermarkOpacity = document.getElementById("watermarkOpacity");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;

  /* INITIAL */

  watermarkStartScreen.style.display = "flex";

  watermarkPreviewScreen.classList.add("hidden-screen");
  watermarkSuccessScreen.classList.add("hidden-screen");

  watermarkPreviewScreen.style.display = "none";
  watermarkSuccessScreen.style.display = "none";

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

    watermarkStartScreen.style.display = "none";

    watermarkPreviewScreen.classList.remove("hidden-screen");
    watermarkPreviewScreen.style.display = "grid";

    watermarkSuccessScreen.classList.add("hidden-screen");
    watermarkSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card watermark-pdf-card">

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

      watermarkStartScreen.style.display = "flex";

      watermarkPreviewScreen.classList.add("hidden-screen");
      watermarkPreviewScreen.style.display = "none";

      watermarkSuccessScreen.classList.add("hidden-screen");
      watermarkSuccessScreen.style.display = "none";

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

  /* WATERMARK */

  watermarkBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    if (!watermarkText.value.trim()) {

      alert("Please enter watermark text");

      return;
    }

    const formData = new FormData();

if (currentUser) {

  formData.append(
    "user_id",
    currentUser.id
  );

}

formData.append("pdf", selectedFile);
formData.append("text", watermarkText.value.trim());
formData.append("size", watermarkSize.value);
formData.append("opacity", watermarkOpacity.value);

resetProgress();
startFakeProgress();

    watermarkBtn.disabled = true;

    watermarkBtn.innerHTML = `
      Processing...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/watermark", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

  const errorText = await response.text();

  if (response.status === 403) {

    document.getElementById(
      "upgradeModal"
    ).style.display = "flex";

    throw new Error("");

  }

  throw new Error(
    errorText || "Failed to add watermark"
  );

}

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Failed to add watermark");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        watermarkPreviewScreen.classList.add("hidden-screen");
        watermarkPreviewScreen.style.display = "none";

        watermarkSuccessScreen.classList.remove("hidden-screen");
        watermarkSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("WATERMARK ERROR:", error);

      alert("Failed to add watermark");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      watermarkBtn.disabled = false;

      watermarkBtn.innerHTML = `
        Add Watermark
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

    a.download = "watermarked.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

  /* MOBILE DRAWERS */

  function closeDrawers() {

    toolsDrawer.classList.remove("active");
    mainDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");

  }

  if (toolsMenuBtn) {

    toolsMenuBtn.addEventListener("click", () => {

      toolsDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if (mainMenuBtn) {

    mainMenuBtn.addEventListener("click", () => {

      mainDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if (toolsClose)
    toolsClose.addEventListener("click", closeDrawers);

  if (mainClose)
    mainClose.addEventListener("click", closeDrawers);

  if (drawerOverlay)
    drawerOverlay.addEventListener("click", closeDrawers);

  if (closeUpgradeModal) {

    closeUpgradeModal.addEventListener("click", () => {

      document.getElementById("upgradeModal").style.display = "none";

    });

  }

});v
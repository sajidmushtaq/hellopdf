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

  const unlockStartScreen = document.getElementById("unlockStartScreen");
  const unlockPreviewScreen = document.getElementById("unlockPreviewScreen");
  const unlockSuccessScreen = document.getElementById("unlockSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const unlockBtn = document.getElementById("unlockBtn");
  const progressBar = document.getElementById("progressBar");

  const passwordInput = document.getElementById("passwordInput");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;
  (async () => {

  const { data } =
    await window.supabaseClient.auth.getUser();

  if (data && data.user) {

    currentUser = data.user;

  }

})();

  /* INITIAL */

  unlockStartScreen.style.display = "flex";

  unlockPreviewScreen.classList.add("hidden-screen");
  unlockSuccessScreen.classList.add("hidden-screen");

  unlockPreviewScreen.style.display = "none";
  unlockSuccessScreen.style.display = "none";

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

    unlockStartScreen.style.display = "none";

    unlockPreviewScreen.classList.remove("hidden-screen");
    unlockPreviewScreen.style.display = "grid";

    unlockSuccessScreen.classList.add("hidden-screen");
    unlockSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card unlock-pdf-card">

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

      unlockStartScreen.style.display = "flex";

      unlockPreviewScreen.classList.add("hidden-screen");
      unlockPreviewScreen.style.display = "none";

      unlockSuccessScreen.classList.add("hidden-screen");
      unlockSuccessScreen.style.display = "none";

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

  /* UNLOCK PDF */

  unlockBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    const password = passwordInput.value.trim();

    if (!password) {

      alert("Please enter PDF password");

      return;
    }

    const formData = new FormData();

if (currentUser) {

  formData.append(
    "user_id",
    currentUser.id
  );

}

formData.append("pdfFile", selectedFile);
formData.append("password", password);

    startFakeProgress();

    unlockBtn.disabled = true;

    unlockBtn.innerHTML = `
      Unlocking...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/unlock-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

  const errorText =
    await response.text();

  if (response.status === 403) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {

      upgradeModal.style.display = "flex";

    }

    throw new Error("");

  }

  throw new Error(
    errorText ||
    "Failed to unlock PDF"
  );

}

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Failed to unlock PDF");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        unlockPreviewScreen.classList.add("hidden-screen");
        unlockPreviewScreen.style.display = "none";

        unlockSuccessScreen.classList.remove("hidden-screen");
        unlockSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("UNLOCK ERROR:", error);

      alert("Failed to unlock PDF");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      unlockBtn.disabled = false;

      unlockBtn.innerHTML = `
        Unlock PDF
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

    a.download = "unlocked.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });
  /* MOBILE DRAWERS */

  function closeDrawers() {

    if (toolsDrawer) {
      toolsDrawer.classList.remove("active");
    }

    if (mainDrawer) {
      mainDrawer.classList.remove("active");
    }

    if (drawerOverlay) {
      drawerOverlay.classList.remove("active");
    }

  }

  if (toolsMenuBtn) {

    toolsMenuBtn.addEventListener("click", () => {

      if (toolsDrawer) {
        toolsDrawer.classList.add("active");
      }

      if (drawerOverlay) {
        drawerOverlay.classList.add("active");
      }

    });

  }

  if (mainMenuBtn) {

    mainMenuBtn.addEventListener("click", () => {

      if (mainDrawer) {
        mainDrawer.classList.add("active");
      }

      if (drawerOverlay) {
        drawerOverlay.classList.add("active");
      }

    });

  }

  if (toolsClose) {
    toolsClose.addEventListener("click", closeDrawers);
  }

  if (mainClose) {
    mainClose.addEventListener("click", closeDrawers);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", closeDrawers);
  }

  if (closeUpgradeModal) {

    closeUpgradeModal.addEventListener("click", () => {

      const upgradeModal =
        document.getElementById("upgradeModal");

      if (upgradeModal) {
        upgradeModal.style.display = "none";
      }

    });

  }
});
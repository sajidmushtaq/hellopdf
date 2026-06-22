document.addEventListener("DOMContentLoaded", () => {

  const reorderStartScreen = document.getElementById("reorderStartScreen");
  const reorderPreviewScreen = document.getElementById("reorderPreviewScreen");
  const reorderSuccessScreen = document.getElementById("reorderSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const reorderBtn = document.getElementById("reorderBtn");
  const progressBar = document.getElementById("progressBar");

  const orderInput = document.getElementById("orderInput");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let finalPdfUrl = null;
  let progressInterval = null;

  /* INITIAL */

  reorderStartScreen.style.display = "flex";

  reorderPreviewScreen.classList.add("hidden-screen");
  reorderSuccessScreen.classList.add("hidden-screen");

  reorderPreviewScreen.style.display = "none";
  reorderSuccessScreen.style.display = "none";

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

    reorderStartScreen.style.display = "none";

    reorderPreviewScreen.classList.remove("hidden-screen");
    reorderPreviewScreen.style.display = "grid";

    reorderSuccessScreen.classList.add("hidden-screen");
    reorderSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card reorder-pdf-card">

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

      reorderStartScreen.style.display = "flex";

      reorderPreviewScreen.classList.add("hidden-screen");
      reorderPreviewScreen.style.display = "none";

      reorderSuccessScreen.classList.add("hidden-screen");
      reorderSuccessScreen.style.display = "none";

      orderInput.value = "";

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

  /* REORDER */

  reorderBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    if (!orderInput.value.trim()) {

      alert("Please enter page order");

      return;
    }

    const formData = new FormData();

    formData.append("pdfFile", selectedFile);
    formData.append("order", orderInput.value.trim());
    const { data } =
  await window.supabaseClient.auth.getUser();

if (!data?.user) {

  alert("Please login first");

  return;

}

formData.append(
  "user_id",
  data.user.id
);

    startFakeProgress();

    reorderBtn.disabled = true;

    reorderBtn.innerHTML = `
      Reordering...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/reorder-pages", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

  const errorText = await response.text();

  if (
    errorText.includes(
      "Daily free limit reached"
    )
  ) {

    const upgradeModal =
      document.getElementById(
        "upgradeModal"
      );

    if (upgradeModal) {

      upgradeModal.style.display =
        "flex";

    }

  } else {

    alert(
      errorText ||
      "Failed to reorder pages"
    );

  }

  return;
}

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Failed to reorder pages");

        return;
      }

      completeProgress();

      if (finalPdfUrl) {
        URL.revokeObjectURL(finalPdfUrl);
      }

      finalPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        reorderPreviewScreen.classList.add("hidden-screen");
        reorderPreviewScreen.style.display = "none";

        reorderSuccessScreen.classList.remove("hidden-screen");
        reorderSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("REORDER ERROR:", error);

      alert("Failed to reorder pages");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      reorderBtn.disabled = false;

      reorderBtn.innerHTML = `
        Reorder Pages
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

    a.download = "reordered.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });
const closeUpgradeModal =
  document.getElementById(
    "closeUpgradeModal"
  );

if (closeUpgradeModal) {

  closeUpgradeModal.addEventListener(
    "click",
    () => {

      document.getElementById(
        "upgradeModal"
      ).style.display = "none";

    }
  );

}
});
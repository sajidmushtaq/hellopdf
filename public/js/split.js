document.addEventListener("DOMContentLoaded", () => {

  const splitStartScreen = document.getElementById("splitStartScreen");
  const splitPreviewScreen = document.getElementById("splitPreviewScreen");
  const splitSuccessScreen = document.getElementById("splitSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const splitBtn = document.getElementById("splitBtn");
  const progressBar = document.getElementById("progressBar");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let splitZipUrl = null;
  let progressInterval = null;

  /* =========================
     INITIAL STATE
  ========================= */

  splitStartScreen.style.display = "flex";

  splitPreviewScreen.classList.add("hidden-screen");
  splitSuccessScreen.classList.add("hidden-screen");

  splitPreviewScreen.style.display = "none";
  splitSuccessScreen.style.display = "none";

  /* =========================
     DROP ZONE CLICK
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

    splitStartScreen.style.display = "none";

    splitPreviewScreen.classList.remove("hidden-screen");
    splitPreviewScreen.style.display = "grid";

    splitSuccessScreen.classList.add("hidden-screen");
    splitSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card split-pdf-card">

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

      splitStartScreen.style.display = "flex";

      splitPreviewScreen.classList.add("hidden-screen");
      splitPreviewScreen.style.display = "none";

      splitSuccessScreen.classList.add("hidden-screen");
      splitSuccessScreen.style.display = "none";

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
     SPLIT PDF
  ========================= */

  splitBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    const { data } = await supabaseClient.auth.getUser();

if (!data?.user) {
  alert("Please login first");
  return;
}

formData.append("user_id", data.user.id);

    startFakeProgress();

    splitBtn.disabled = true;

    splitBtn.innerHTML = `
      Splitting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/split", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        const errorText = await response.text();

        alert(errorText || "Split failed");

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Split failed");

        return;
      }

      completeProgress();

      if (splitZipUrl) {
        URL.revokeObjectURL(splitZipUrl);
      }

      splitZipUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        splitPreviewScreen.classList.add("hidden-screen");
        splitPreviewScreen.style.display = "none";

        splitSuccessScreen.classList.remove("hidden-screen");
        splitSuccessScreen.style.display = "flex";

      }, 400);

    } catch (error) {

      console.error("SPLIT ERROR:", error);

      alert("Split failed. Please try again.");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      splitBtn.disabled = false;

      splitBtn.innerHTML = `
        Split PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* =========================
     DOWNLOAD
  ========================= */

  downloadBtn?.addEventListener("click", () => {

    if (!splitZipUrl) {

      alert("Split file not ready yet");

      return;
    }

    const a = document.createElement("a");

    a.href = splitZipUrl;

    a.download = "split.zip";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
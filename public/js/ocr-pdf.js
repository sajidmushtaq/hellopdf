document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");
  const ocrLanguage = document.getElementById("ocrLanguage");

  let selectedFiles = [];
  let outputUrl = null;
  let progressTimer = null;

  function resetProgress() {
    clearInterval(progressTimer);
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startProgress() {
    let progress = 10;
    progressBar.style.width = "10%";
    progressBar.textContent = "10%";

    progressTimer = setInterval(() => {
      if (progress < 90) {
        progress += 5;
        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";
      }
    }, 600);
  }

  function completeProgress() {
    clearInterval(progressTimer);
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function showPreview() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("active-screen");
    successScreen.classList.add("hidden-screen");
    successScreen.classList.remove("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("active-screen");
    successScreen.classList.remove("hidden-screen");
    successScreen.classList.add("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isValidFile(file) {
    return file && (
      file.type === "application/pdf" ||
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function handleFiles(files) {
    const valid = Array.from(files || []).filter(isValidFile);

    if (!valid.length) {
      alert("Please select PDF or image files only");
      return;
    }

    selectedFiles = selectedFiles.concat(valid);
    resetProgress();
    renderFiles();
    showPreview();
  }

  function renderFiles() {
    fileList.innerHTML = "";
    fileCounter.textContent = `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`;

    selectedFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const card = document.createElement("div");
      card.className = "ocr-file-card";

      const preview = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? `<embed src="${url}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH" type="application/pdf" class="ocr-pdf-embed">`
        : `<img src="${url}" alt="${file.name}">`;

      card.innerHTML = `
        <button class="remove-file-btn" type="button">×</button>
        <div class="ocr-file-preview">${preview}</div>
        <h3>${file.name}</h3>
        <div class="file-order-badge">${index + 1}</div>
      `;

      card.querySelector(".remove-file-btn").addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        URL.revokeObjectURL(url);

        if (!selectedFiles.length) {
          startScreen.classList.remove("hidden-screen");
          previewScreen.classList.add("hidden-screen");
          previewScreen.classList.remove("active-screen");
          return;
        }

        renderFiles();
      });

      fileList.appendChild(card);
    });
  }

  dropZone.addEventListener("click", () => fileInput.click());
  addMoreBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
    fileInput.value = "";
  });

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
    handleFiles(e.dataTransfer.files);
  });

  convertBtn.addEventListener("click", async () => {
    if (!selectedFiles.length) {
      alert("Please select files first");
      return;
    }

    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("files", file));
    formData.append("language", ocrLanguage.value);
    const { data } =
  await window.supabaseClient.auth.getUser();

if (!data.user) {
  alert("Please login first");
  return;
}

formData.append("user_id", data.user.id);

    resetProgress();
    startProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Processing... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/ocr-pdf", {
        method: "POST",
        body: formData
      });

     if (!response.ok) {

  const text = await response.text();

  if (
    response.status === 403 ||
    text.toLowerCase().includes("limit")
  ) {

    const modal = document.getElementById("upgradeModal");

    if (modal) {
      modal.style.display = "flex";
    } else {
      alert(text);
    }

    return;
  }

  alert(text || "OCR failed");

  return;
}

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("OCR failed. Please try another file.");
        return;
      }

      if (outputUrl) URL.revokeObjectURL(outputUrl);

      outputUrl = URL.createObjectURL(blob);
      completeProgress();

      setTimeout(showSuccess, 400);

    } catch (error) {
      console.error("OCR PDF ERROR:", error);
      alert("OCR failed. Please try again.");
    } finally {
      clearInterval(progressTimer);
      convertBtn.disabled = false;
     convertBtn.innerHTML =
  'Start OCR <i class="fa-solid fa-arrow-right"></i>';

resetProgress();
    }
  });
const closeUpgradeModal =
document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

  closeUpgradeModal.addEventListener("click", () => {

    document.getElementById("upgradeModal").style.display =
      "none";

  });

}
  downloadBtn.addEventListener("click", () => {
    if (!outputUrl) {
      alert("PDF is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = "ocr-output.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
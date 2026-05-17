document.addEventListener("DOMContentLoaded", () => {

  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const addMoreBtn = document.getElementById("addMoreBtn");

  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");

  const cropBtn = document.getElementById("cropBtn");
  const cropLevel = document.getElementById("cropLevel");

  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let croppedPdfUrl = null;
  let progressInterval = null;

  function showStart() {
    startScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    successScreen.classList.add("hidden-screen");
  }

  function showPreview() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("hidden-screen");
    successScreen.classList.add("hidden-screen");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showSuccess() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    successScreen.classList.remove("hidden-screen");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function resetProgress() {
    if (progressInterval) {
      clearInterval(progressInterval);
    }

    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startFakeProgress() {

    let progress = 15;

    progressBar.style.width = "15%";
    progressBar.textContent = "15%";

    progressInterval = setInterval(() => {

      if (progress < 90) {

        progress += 5;

        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";
      }

    }, 700);
  }

  function completeProgress() {

    if (progressInterval) {
      clearInterval(progressInterval);
    }

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function addFile(files) {

    const file = Array.from(files || []).find(
      f => f.type === "application/pdf"
    );

    if (!file) {
      alert("Please select PDF file only");
      return;
    }

    selectedFile = file;
    selectedFile.previewUrl = URL.createObjectURL(file);

    renderFile();
  }

  function renderFile() {

    fileList.innerHTML = "";

    if (!selectedFile) {
      showStart();
      return;
    }

    fileCounter.textContent = "1 file selected";

    const card = document.createElement("div");

    card.className = "crop-file-card";

    card.innerHTML = `
      <button class="remove-file-btn" type="button">×</button>

      <div class="pdf-thumb-wrap">
        <embed
          src="${selectedFile.previewUrl}#toolbar=0"
          type="application/pdf"
          class="pdf-thumb"
        />
      </div>

      <h3>${selectedFile.name}</h3>

      <span class="file-order-badge">1</span>
    `;

    card.querySelector(".remove-file-btn").addEventListener("click", () => {

      if (selectedFile.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }

      selectedFile = null;

      renderFile();
    });

    fileList.appendChild(card);

    resetProgress();

    showPreview();
  }

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  addMoreBtn?.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {

    addFile(fileInput.files);

    fileInput.value = "";
  });

  cropBtn.addEventListener("click", async () => {

    if (!selectedFile) {
      alert("Please select a PDF file first");
      return;
    }

    const formData = new FormData();

    formData.append("pdfFile", selectedFile);
    formData.append("cropLevel", cropLevel.value);

    resetProgress();
    startFakeProgress();

    cropBtn.disabled = true;

    cropBtn.innerHTML = `
      Cropping...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/crop-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        const errorText = await response.text();

        alert(errorText || "Crop failed");

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("Crop failed");
        return;
      }

      completeProgress();

      if (croppedPdfUrl) {
        URL.revokeObjectURL(croppedPdfUrl);
      }

      croppedPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        showSuccess();
      }, 400);

    } catch (error) {

      console.error("CROP PDF ERROR:", error);

      alert("Crop failed");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
      }

      cropBtn.disabled = false;

      cropBtn.innerHTML = `
        Crop PDF
      `;
    }
  });

  downloadBtn.addEventListener("click", () => {

    if (!croppedPdfUrl) {
      alert("Cropped PDF not ready");
      return;
    }

    const a = document.createElement("a");

    a.href = croppedPdfUrl;
    a.download = "cropped.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();
  });

  showStart();

});
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
    }, 500);
  }

  function completeProgress() {
    clearInterval(progressTimer);
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function showStart() {
    startScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("active-screen");
    successScreen.classList.add("hidden-screen");
    successScreen.classList.remove("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function isImage(file) {
    return file && (
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg") ||
      file.name.toLowerCase().endsWith(".png")
    );
  }

  function handleFiles(files) {
    const validFiles = Array.from(files || []).filter(isImage);

    if (validFiles.length === 0) {
      alert("Please select JPG, JPEG, or PNG images only");
      return;
    }

    selectedFiles = selectedFiles.concat(validFiles);
    resetProgress();
    renderFiles();
    showPreview();
  }

  function renderFiles() {
    fileList.innerHTML = "";
    fileCounter.textContent = `${selectedFiles.length} image${selectedFiles.length > 1 ? "s" : ""} selected`;

    selectedFiles.forEach((file, index) => {
      const previewUrl = URL.createObjectURL(file);
      const card = document.createElement("div");
      card.className = "scan-file-card";

      card.innerHTML = `
        <button class="remove-file-btn" type="button">×</button>

        <div class="scan-image-preview">
          <img src="${previewUrl}" alt="${file.name}">
        </div>

        <h3>${file.name}</h3>
        <div class="file-order-badge">${index + 1}</div>
      `;

      card.querySelector(".remove-file-btn").addEventListener("click", () => {
        URL.revokeObjectURL(previewUrl);
        selectedFiles.splice(index, 1);

        if (selectedFiles.length === 0) {
          showStart();
          fileList.innerHTML = "";
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
    if (selectedFiles.length === 0) {
      alert("Please select images first");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach((file) => {
      formData.append("images", file);
    });

    resetProgress();
    startProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Creating PDF... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/scan-to-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        alert(text || "Scan to PDF failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("PDF creation failed. Please try again.");
        return;
      }

      if (outputUrl) URL.revokeObjectURL(outputUrl);

      outputUrl = URL.createObjectURL(blob);
      completeProgress();

      setTimeout(showSuccess, 400);

    } catch (error) {
      console.error("SCAN TO PDF ERROR:", error);
      alert("Scan to PDF failed. Please try again.");
    } finally {
      clearInterval(progressTimer);
      convertBtn.disabled = false;
      convertBtn.textContent = "Create PDF";
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!outputUrl) {
      alert("PDF file is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = "scanned.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
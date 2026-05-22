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

  let selectedFile = null;
  let previewUrl = null;
  let zipUrl = null;

  function resetProgress() {
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
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

  function isPdf(file) {
    return file && (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function handleFile(file) {
    if (!isPdf(file)) {
      alert("Please select PDF file only");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    resetProgress();
    renderFile();
    showPreview();
  }

  function renderFile() {
    fileList.innerHTML = "";
    fileCounter.textContent = "1 file selected";

    const card = document.createElement("div");
    card.className = "pdf-image-file-card";

    card.innerHTML = `
      <button class="remove-file-btn" type="button">×</button>

      <div class="pdf-image-pdf-preview">
        <embed
          src="${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
          type="application/pdf"
          class="pdf-image-pdf-embed"
        />
      </div>

      <h3>${selectedFile.name}</h3>
      <div class="file-order-badge">1</div>
    `;

    card.querySelector(".remove-file-btn").addEventListener("click", () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      selectedFile = null;
      previewUrl = null;
      fileList.innerHTML = "";
      showStart();
    });

    fileList.appendChild(card);
  }

  dropZone.addEventListener("click", () => fileInput.click());
  addMoreBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
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
    handleFile(e.dataTransfer.files[0]);
  });

  convertBtn.addEventListener("click", () => {
    if (!selectedFile) {
      alert("Please select PDF file first");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/pdf-to-image");
    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressBar.textContent = percent + "%";
      }
    };

    xhr.onload = () => {
      convertBtn.disabled = false;
      convertBtn.textContent = "Convert to Images";

      if (xhr.status !== 200) {
        alert("Server error");
        return;
      }

      const blob = xhr.response;

      if (!blob || blob.size < 1000) {
        alert("Conversion failed");
        return;
      }

      if (zipUrl) URL.revokeObjectURL(zipUrl);

      zipUrl = URL.createObjectURL(blob);
      progressBar.style.width = "100%";
      progressBar.textContent = "100%";

      setTimeout(showSuccess, 400);
    };

    xhr.onerror = () => {
      convertBtn.disabled = false;
      convertBtn.textContent = "Convert to Images";
      alert("Conversion failed. Please try again.");
    };

    xhr.send(formData);
  });

  downloadBtn.addEventListener("click", () => {
    if (!zipUrl) {
      alert("ZIP file is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = zipUrl;
    a.download = "pdf-images.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
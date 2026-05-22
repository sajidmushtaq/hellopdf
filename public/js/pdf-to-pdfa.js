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
    card.className = "pdfa-file-card";

    card.innerHTML = `
      <button class="remove-file-btn" type="button">×</button>

      <div class="pdfa-pdf-preview">
        <embed
          src="${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
          type="application/pdf"
          class="pdfa-pdf-embed"
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

  convertBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      alert("Please select PDF file first");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", selectedFile);

    resetProgress();
    startProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/pdf-to-pdfa", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        alert(text || "PDF/A conversion failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("Conversion failed. Please try another PDF.");
        return;
      }

      if (outputUrl) URL.revokeObjectURL(outputUrl);

      outputUrl = URL.createObjectURL(blob);
      completeProgress();

      setTimeout(showSuccess, 400);

    } catch (error) {
      console.error("PDF TO PDFA ERROR:", error);
      alert("Conversion failed. Please try again.");
    } finally {
      clearInterval(progressTimer);
      convertBtn.disabled = false;
      convertBtn.textContent = "Convert to PDF/A";
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!outputUrl) {
      alert("PDF/A file is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = "converted-pdfa.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
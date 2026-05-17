document.addEventListener("DOMContentLoaded", () => {

  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const addMoreBtn = document.getElementById("addMoreBtn");

  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");

  const flattenBtn = document.getElementById("flattenBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  const flattenForms = document.getElementById("flattenForms");
  const flattenAnnotations = document.getElementById("flattenAnnotations");

  let selectedFile = null;
  let flattenedUrl = null;
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

  function startProgress() {

    let p = 15;

    progressBar.style.width = "15%";
    progressBar.textContent = "15%";

    progressInterval = setInterval(() => {

      if (p < 90) {

        p += 5;

        progressBar.style.width = p + "%";
        progressBar.textContent = p + "%";
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

  function isPdf(file) {
    return file &&
      (file.type === "application/pdf" ||
       file.name.toLowerCase().endsWith(".pdf"));
  }

  function addFile(files) {

    const file = Array.from(files || []).find(isPdf);

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

    card.className = "flatten-file-card";

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

    addFile(e.dataTransfer.files);
  });

  flattenBtn.addEventListener("click", async () => {

    if (!selectedFile) {
      alert("Please select a PDF file first");
      return;
    }

    const formData = new FormData();

    formData.append("pdfFile", selectedFile);

    formData.append(
      "flattenForms",
      flattenForms.checked
    );

    formData.append(
      "flattenAnnotations",
      flattenAnnotations.checked
    );

    resetProgress();
    startProgress();

    flattenBtn.disabled = true;

    flattenBtn.innerHTML = `
      Flattening...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/flatten-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        const text = await response.text();

        alert(text || "Flatten failed");

        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("Flatten failed");
        return;
      }

      completeProgress();

      if (flattenedUrl) {
        URL.revokeObjectURL(flattenedUrl);
      }

      flattenedUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        showSuccess();
      }, 400);

    } catch (err) {

      console.error(err);

      alert("Flatten failed");

    } finally {

      flattenBtn.disabled = false;

      flattenBtn.innerHTML = `
        Flatten PDF
      `;

      if (progressInterval) {
        clearInterval(progressInterval);
      }
    }
  });

  downloadBtn.addEventListener("click", () => {

    if (!flattenedUrl) {
      alert("Flattened PDF not ready");
      return;
    }

    const a = document.createElement("a");

    a.href = flattenedUrl;
    a.download = "flattened.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();
  });

  showStart();

});
document.addEventListener("DOMContentLoaded", () => {

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

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

  function setProgress(value) {
    progressBar.style.width = value + "%";
    progressBar.textContent = value + "%";
  }

  function resetProgress() {
    setProgress(0);
  }

  function isPdf(file) {
    return file &&
      (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );
  }

  function addFile(files) {

    const file = Array.from(files || []).find(isPdf);

    if (!file) {
      alert("Please select PDF file only");
      return;
    }

    if (selectedFile?.previewUrl) {
      URL.revokeObjectURL(selectedFile.previewUrl);
    }

    file.previewUrl = URL.createObjectURL(file);

    selectedFile = file;

    renderFile();
  }

  function createPdfCard(file) {

    const card = document.createElement("div");

    card.className = "flatten-file-card";

    card.innerHTML = `
      <button class="remove-file-btn" type="button">×</button>

      <div class="pdf-viewer-wrap">
        <canvas class="pdf-canvas"></canvas>

        <div class="pdf-controls">
          <button class="zoom-btn zoom-out" type="button">−</button>
          <span class="zoom-level">100%</span>
          <button class="zoom-btn zoom-in" type="button">+</button>
        </div>
      </div>

      <h3>${file.name}</h3>

      <span class="file-order-badge">1</span>
    `;

    card.querySelector(".remove-file-btn").addEventListener("click", () => {

      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }

      selectedFile = null;

      renderFile();
    });

    const canvas = card.querySelector(".pdf-canvas");
    const ctx = canvas.getContext("2d");

    const zoomText = card.querySelector(".zoom-level");
    const zoomInBtn = card.querySelector(".zoom-in");
    const zoomOutBtn = card.querySelector(".zoom-out");

    let scale = 1;

    let pdfPage = null;
    let renderTask = null;

    function renderPage() {

      if (!pdfPage) return;

      if (renderTask) {
        renderTask.cancel();
      }

      const viewport = pdfPage.getViewport({ scale });

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      renderTask = pdfPage.render({
        canvasContext: ctx,
        viewport
      });

      zoomText.textContent =
        Math.round(scale * 100) + "%";
    }

    pdfjsLib.getDocument(file.previewUrl).promise
      .then(pdf => pdf.getPage(1))
      .then(page => {

        pdfPage = page;

        renderPage();

      })
      .catch(err => {
        console.error(err);
      });

    zoomInBtn.addEventListener("click", () => {

      scale = Math.min(scale + 0.25, 3);

      renderPage();
    });

    zoomOutBtn.addEventListener("click", () => {

      scale = Math.max(scale - 0.25, 0.5);

      renderPage();
    });

    return card;
  }

  function renderFile() {

    fileList.innerHTML = "";

    if (!selectedFile) {
      showStart();
      return;
    }

    fileCounter.textContent = "1 file selected";

    fileList.appendChild(
      createPdfCard(selectedFile)
    );

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
      alert("Please select PDF first");
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

    flattenBtn.disabled = true;

    flattenBtn.innerHTML =
      `Flattening... <i class="fa-solid fa-spinner fa-spin"></i>`;

    resetProgress();

    setProgress(20);

    try {

      const response = await fetch("/flatten-pdf", {
        method: "POST",
        body: formData
      });

      setProgress(70);

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

      if (flattenedUrl) {
        URL.revokeObjectURL(flattenedUrl);
      }

      flattenedUrl = URL.createObjectURL(blob);

      setProgress(100);

      setTimeout(() => {
        showSuccess();
      }, 400);

    } catch (err) {

      console.error(err);

      alert("Flatten failed");

    } finally {

      flattenBtn.disabled = false;

      flattenBtn.innerHTML = "Flatten PDF";
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
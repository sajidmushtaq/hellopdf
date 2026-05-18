document.addEventListener("DOMContentLoaded", () => {

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone1 = document.getElementById("dropZone1");
  const secondUploadBox = document.getElementById("secondUploadBox");

  const fileInput1 = document.getElementById("fileInput1");
  const fileInput2 = document.getElementById("fileInput2");

  const fileOneBox = document.getElementById("fileOneBox");
  const fileTwoBox = document.getElementById("fileTwoBox");

  const fileCounter = document.getElementById("fileCounter");
  const compareBtn = document.getElementById("compareBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let fileOne = null;
  let fileTwo = null;
  let reportUrl = null;

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
  }

  function isPdf(file) {
    return file &&
      (
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
      );
  }

  function resetProgress() {
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function setProgress(value) {
    progressBar.style.width = value + "%";
    progressBar.textContent = value + "%";
  }

  function setFile(slot, file) {

    if (!isPdf(file)) {
      alert("Please select PDF file only");
      return;
    }

    file.previewUrl = URL.createObjectURL(file);

    if (slot === 1) {
      fileOne = file;
    } else {
      fileTwo = file;
    }

    renderFiles();
  }

  function createPdfCard(file, slot) {

    const card = document.createElement("div");
    card.className = "compare-file-card";

    card.innerHTML = `
      <button class="remove-file-btn">×</button>

      <div class="pdf-viewer-wrap">
        <canvas class="pdf-canvas"></canvas>

        <div class="pdf-controls">
          <button class="zoom-btn zoom-out">−</button>
          <span class="zoom-level">100%</span>
          <button class="zoom-btn zoom-in">+</button>
        </div>
      </div>

      <h3>${file.name}</h3>

      <span class="file-order-badge">${slot}</span>
    `;

    const removeBtn = card.querySelector(".remove-file-btn");

    removeBtn.addEventListener("click", () => {

      if (slot === 1) {
        fileOne = null;
      } else {
        fileTwo = null;
      }

      renderFiles();
    });

    const canvas = card.querySelector(".pdf-canvas");
    const ctx = canvas.getContext("2d");

    const zoomText = card.querySelector(".zoom-level");
    const zoomInBtn = card.querySelector(".zoom-in");
    const zoomOutBtn = card.querySelector(".zoom-out");

    let scale = 1;

    pdfjsLib.getDocument(file.previewUrl).promise
      .then(pdf => pdf.getPage(1))
      .then(page => {

        function renderPage() {

          const viewport = page.getViewport({
            scale: scale
          });

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          const renderContext = {
            canvasContext: ctx,
            viewport: viewport
          };

          page.render(renderContext);

          zoomText.textContent =
            Math.round(scale * 100) + "%";
        }

        renderPage();

        zoomInBtn.addEventListener("click", () => {
          scale += 0.25;
          renderPage();
        });

        zoomOutBtn.addEventListener("click", () => {

          if (scale > 0.5) {
            scale -= 0.25;
            renderPage();
          }

        });

      });

    return card;
  }

  function renderFiles() {

    fileOneBox.innerHTML = "";
    fileTwoBox.innerHTML = "";

    const count =
      [fileOne, fileTwo].filter(Boolean).length;

    fileCounter.textContent =
      `${count} file${count !== 1 ? "s" : ""} selected`;

    if (fileOne) {
      fileOneBox.appendChild(
        createPdfCard(fileOne, 1)
      );
    }

    if (fileTwo) {
      fileTwoBox.appendChild(
        createPdfCard(fileTwo, 2)
      );
    }

    secondUploadBox.style.display =
      fileTwo ? "none" : "flex";

    compareBtn.disabled =
      !(fileOne && fileTwo);

    resetProgress();

    if (fileOne || fileTwo) {
      showPreview();
    } else {
      showStart();
    }
  }

  dropZone1.addEventListener("click", () => {
    fileInput1.click();
  });

  secondUploadBox.addEventListener("click", () => {
    fileInput2.click();
  });

  fileInput1.addEventListener("change", () => {
    setFile(1, fileInput1.files[0]);
  });

  fileInput2.addEventListener("change", () => {
    setFile(2, fileInput2.files[0]);
  });

  compareBtn.addEventListener("click", async () => {

    if (!fileOne || !fileTwo) {
      alert("Please select both PDF files");
      return;
    }

    const formData = new FormData();

    formData.append("pdfOne", fileOne);
    formData.append("pdfTwo", fileTwo);

    compareBtn.disabled = true;
    compareBtn.innerHTML =
      `Comparing... <i class="fa-solid fa-spinner fa-spin"></i>`;

    resetProgress();
    setProgress(20);

    try {

      const response = await fetch("/compare-pdf", {
        method: "POST",
        body: formData
      });

      setProgress(70);

      if (!response.ok) {
        throw new Error("Compare failed");
      }

      const blob = await response.blob();

      reportUrl = URL.createObjectURL(blob);

      setProgress(100);

      setTimeout(() => {
        showSuccess();
      }, 500);

    } catch (err) {

      console.error(err);
      alert("Compare failed");

    } finally {

      compareBtn.disabled = false;
      compareBtn.innerHTML = `Compare PDF`;

    }

  });

  downloadBtn.addEventListener("click", () => {

    if (!reportUrl) return;

    const a = document.createElement("a");

    a.href = reportUrl;
    a.download = "compare-report.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

  showStart();

});
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    successScreen.classList.remove("hidden-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isPdf(file) {
    return file && (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function resetProgress() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startProgress() {
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
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function setFile(slot, file) {
    if (!isPdf(file)) {
      alert("Please select PDF file only");
      return;
    }

    if (slot === 1) {
      if (fileOne?.previewUrl) URL.revokeObjectURL(fileOne.previewUrl);
      fileOne = file;
      fileOne.previewUrl = URL.createObjectURL(file);
    }

    if (slot === 2) {
      if (fileTwo?.previewUrl) URL.revokeObjectURL(fileTwo.previewUrl);
      fileTwo = file;
      fileTwo.previewUrl = URL.createObjectURL(file);
    }

    renderFiles();
  }

  function createPdfCard(file, slot) {
    const card = document.createElement("div");
    card.className = "compare-file-card";

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
      <span class="file-order-badge">${slot}</span>
    `;

    const removeBtn = card.querySelector(".remove-file-btn");

    removeBtn.addEventListener("click", () => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);

      if (slot === 1) fileOne = null;
      if (slot === 2) fileTwo = null;

      renderFiles();
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
        renderTask = null;
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

      renderTask.promise.catch((error) => {
        if (error?.name !== "RenderingCancelledException") {
          console.error("PDF render error:", error);
        }
      });

      zoomText.textContent = Math.round(scale * 100) + "%";
    }

    if (!window.pdfjsLib) {
      card.querySelector(".pdf-viewer-wrap").innerHTML = `
        <embed src="${file.previewUrl}" type="application/pdf" class="pdf-thumb" />
      `;
      return card;
    }

    pdfjsLib.getDocument(file.previewUrl).promise
      .then((pdf) => pdf.getPage(1))
      .then((page) => {
        pdfPage = page;
        renderPage();
      })
      .catch((error) => {
        console.error("PDF load error:", error);
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

  function renderFiles() {
  fileOneBox.innerHTML = "";
  fileTwoBox.innerHTML = "";

  const count = [fileOne, fileTwo].filter(Boolean).length;
  fileCounter.textContent = `${count} file${count === 1 ? "" : "s"} selected`;

  if (fileOne) {
    fileOneBox.appendChild(createPdfCard(fileOne, 1));
  }

  if (fileTwo) {
    fileTwoBox.appendChild(createPdfCard(fileTwo, 2));
  }

  secondUploadBox.style.display = fileTwo ? "none" : "flex";

  compareBtn.disabled = !(fileOne && fileTwo);

  resetProgress();

  if (fileOne || fileTwo) {
    showPreview();

    setTimeout(() => {
      const previewScreen = document.getElementById("previewScreen");

      if (previewScreen) {
        previewScreen.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 100);
  } else {
    showStart();
  }
}
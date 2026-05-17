document.addEventListener("DOMContentLoaded", () => {
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
    <button class="zoom-btn zoom-out">−</button>
    <span class="zoom-level">100%</span>
    <button class="zoom-btn zoom-in">+</button>
  </div>
</div>

      <h3>${file.name}</h3>
      <span class="file-order-badge">${slot}</span>
    `;

    card.querySelector(".remove-file-btn").addEventListener("click", () => {
      if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);

      if (slot === 1) fileOne = null;
      if (slot === 2) fileTwo = null;

      if (!fileOne && !fileTwo) {
        showStart();
      }

      renderFiles();
    });
    const canvas = card.querySelector(".pdf-canvas");
const ctx = canvas.getContext("2d");

const zoomText = card.querySelector(".zoom-level");
const zoomInBtn = card.querySelector(".zoom-in");
const zoomOutBtn = card.querySelector(".zoom-out");

let scale = 1;

pdfjsLib.getDocument(file.previewUrl).promise.then((pdf) => {
  pdf.getPage(1).then((page) => {

    function renderPage() {
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({
        canvasContext: ctx,
        viewport
      });

      zoomText.textContent = Math.round(scale * 100) + "%";
    }

    renderPage();

    zoomInBtn.addEventListener("click", () => {
      scale += 0.2;
      renderPage();
    });

    zoomOutBtn.addEventListener("click", () => {
      if (scale > 0.6) {
        scale -= 0.2;
        renderPage();
      }
    });

  });
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
    } else {
      showStart();
    }
  }

  dropZone1.addEventListener("click", () => fileInput1.click());
  secondUploadBox.addEventListener("click", () => fileInput2.click());

  fileInput1.addEventListener("change", () => {
    setFile(1, fileInput1.files[0]);
    fileInput1.value = "";
  });

  fileInput2.addEventListener("change", () => {
    setFile(2, fileInput2.files[0]);
    fileInput2.value = "";
  });

  dropZone1.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone1.classList.add("drag-active");
  });

  dropZone1.addEventListener("dragleave", () => {
    dropZone1.classList.remove("drag-active");
  });

  dropZone1.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone1.classList.remove("drag-active");

    const file = Array.from(e.dataTransfer.files || []).find(isPdf);
    setFile(1, file);
  });

  secondUploadBox.addEventListener("dragover", (e) => {
    e.preventDefault();
    secondUploadBox.classList.add("drag-active");
  });

  secondUploadBox.addEventListener("dragleave", () => {
    secondUploadBox.classList.remove("drag-active");
  });

  secondUploadBox.addEventListener("drop", (e) => {
    e.preventDefault();
    secondUploadBox.classList.remove("drag-active");

    const file = Array.from(e.dataTransfer.files || []).find(isPdf);
    setFile(2, file);
  });

  compareBtn.addEventListener("click", async () => {
    if (!fileOne || !fileTwo) {
      alert("Please select both PDF files first");
      return;
    }

    const formData = new FormData();
    formData.append("pdfOne", fileOne);
    formData.append("pdfTwo", fileTwo);

    resetProgress();
    startProgress();

    compareBtn.disabled = true;
    compareBtn.innerHTML = `Comparing... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/compare-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        alert(text || "Compare failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100 || blob.type !== "application/pdf") {
        alert("Compare failed");
        return;
      }

      completeProgress();

      if (reportUrl) URL.revokeObjectURL(reportUrl);
      reportUrl = URL.createObjectURL(blob);

      setTimeout(showSuccess, 400);

    } catch (error) {
      console.error("COMPARE PDF ERROR:", error);
      alert("Compare failed");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      progressInterval = null;

      compareBtn.disabled = !(fileOne && fileTwo);
      compareBtn.innerHTML = `Compare PDF`;
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!reportUrl) {
      alert("Comparison report is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = reportUrl;
    a.download = "compare-report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
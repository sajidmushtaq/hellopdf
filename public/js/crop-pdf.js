document.addEventListener("DOMContentLoaded", () => {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const canvasWrap = document.getElementById("canvasWrap");
  const canvas = document.getElementById("pdfCanvas");
  const ctx = canvas.getContext("2d");
  const cropBox = document.getElementById("cropBox");

  const pageNumEl = document.getElementById("pageNum");
  const pageCountEl = document.getElementById("pageCount");
  const zoomText = document.getElementById("zoomText");
  const prevPage = document.getElementById("prevPage");
  const nextPage = document.getElementById("nextPage");
  const resetCrop = document.getElementById("resetCrop");
  const cropBtn = document.getElementById("cropBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let pdfDoc = null;
  let currentPage = 1;
  let scale = 1.35;
  let croppedUrl = null;
  let progressInterval = null;

  let dragging = false;
  let resizing = false;
  let resizeHandle = null;
  let startX = 0;
  let startY = 0;
  let box = { x: 60, y: 60, w: 250, h: 350 };

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

  function resetProgress() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
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
    }, 600);
  }

  function completeProgress() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function isPdf(file) {
    return file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
  }

  async function loadPdf(file) {
    selectedFile = file;

    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    currentPage = 1;
    pageCountEl.textContent = pdfDoc.numPages;

    await renderPage();
    showPreview();
  }

  async function renderPage() {
    const page = await pdfDoc.getPage(currentPage);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    canvasWrap.style.width = canvas.width + "px";
    canvasWrap.style.height = canvas.height + "px";

    pageNumEl.textContent = currentPage;
    zoomText.textContent = Math.round(scale * 70) + "%";

    resetCropBox();
  }

  function resetCropBox() {
    box = {
      x: 40,
      y: 40,
      w: canvas.width - 80,
      h: canvas.height - 80
    };

    updateCropBox();
  }

  function updateCropBox() {
    box.x = Math.max(0, Math.min(box.x, canvas.width - 40));
    box.y = Math.max(0, Math.min(box.y, canvas.height - 40));
    box.w = Math.max(40, Math.min(box.w, canvas.width - box.x));
    box.h = Math.max(40, Math.min(box.h, canvas.height - box.y));

    cropBox.style.left = box.x + "px";
    cropBox.style.top = box.y + "px";
    cropBox.style.width = box.w + "px";
    cropBox.style.height = box.h + "px";
  }

  function getPoint(e) {
    const rect = canvasWrap.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;

    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }

  cropBox.addEventListener("mousedown", startMove);
  cropBox.addEventListener("touchstart", startMove, { passive: false });

  document.addEventListener("mousemove", moveBox);
  document.addEventListener("touchmove", moveBox, { passive: false });

  document.addEventListener("mouseup", stopMove);
  document.addEventListener("touchend", stopMove);

  function startMove(e) {
    e.preventDefault();

    const handle = e.target.classList.contains("crop-handle")
      ? e.target
      : null;

    const p = getPoint(e);

    startX = p.x;
    startY = p.y;

    if (handle) {
      resizing = true;
      resizeHandle = [...handle.classList].find(c => ["tl", "tr", "bl", "br"].includes(c));
    } else {
      dragging = true;
    }
  }

  function moveBox(e) {
    if (!dragging && !resizing) return;

    e.preventDefault();

    const p = getPoint(e);
    const dx = p.x - startX;
    const dy = p.y - startY;

    if (dragging) {
      box.x += dx;
      box.y += dy;
    }

    if (resizing) {
      if (resizeHandle.includes("r")) box.w += dx;
      if (resizeHandle.includes("b")) box.h += dy;

      if (resizeHandle.includes("l")) {
        box.x += dx;
        box.w -= dx;
      }

      if (resizeHandle.includes("t")) {
        box.y += dy;
        box.h -= dy;
      }
    }

    startX = p.x;
    startY = p.y;

    updateCropBox();
  }

  function stopMove() {
    dragging = false;
    resizing = false;
    resizeHandle = null;
  }

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = Array.from(fileInput.files || []).find(isPdf);

    if (!file) {
      alert("Please select PDF file only");
      return;
    }

    fileInput.value = "";
    await loadPdf(file);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-active");
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-active");

    const file = Array.from(e.dataTransfer.files || []).find(isPdf);

    if (!file) {
      alert("Please select PDF file only");
      return;
    }

    await loadPdf(file);
  });

  prevPage.addEventListener("click", async () => {
    if (currentPage <= 1) return;
    currentPage--;
    await renderPage();
  });

  nextPage.addEventListener("click", async () => {
    if (currentPage >= pdfDoc.numPages) return;
    currentPage++;
    await renderPage();
  });

  resetCrop.addEventListener("click", resetCropBox);

  cropBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      alert("Please select a PDF file first");
      return;
    }

    const applyTo = document.querySelector("input[name='cropPages']:checked").value;

    const cropData = {
      page: currentPage,
      applyTo,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h
    };

    const formData = new FormData();
    formData.append("pdfFile", selectedFile);
    formData.append("cropData", JSON.stringify(cropData));

    resetProgress();
    startProgress();

    cropBtn.disabled = true;
    cropBtn.innerHTML = `Cropping... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/crop-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        alert(text || "Crop failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100 || blob.type !== "application/pdf") {
        alert("Crop failed");
        return;
      }

      completeProgress();

      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
      croppedUrl = URL.createObjectURL(blob);

      setTimeout(showSuccess, 400);

    } catch (err) {
      console.error(err);
      alert("Crop failed");
    } finally {
      cropBtn.disabled = false;
      cropBtn.innerHTML = `Crop PDF <i class="fa-solid fa-arrow-right"></i>`;
      if (progressInterval) clearInterval(progressInterval);
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!croppedUrl) {
      alert("Cropped PDF is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = croppedUrl;
    a.download = "cropped.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
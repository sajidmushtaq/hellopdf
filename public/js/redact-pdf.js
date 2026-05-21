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
  const redactBox = document.getElementById("redactBox");

  const zoomText = document.getElementById("zoomText");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  const resetBox = document.getElementById("resetBox");
  const redactBtn = document.getElementById("redactBtn");
  const acceptBtn = document.querySelector(".redact-accept-btn");
  const optionButtons = document.querySelectorAll(".redact-option");

  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let pdfDoc = null;
  let scale = 1.2;
  let redactedUrl = null;
  let selectedOption = "Text";
  let accepted = false;

  let dragging = false;
  let startX = 0;
  let startY = 0;

  let box = { x: 100, y: 100, w: 240, h: 70 };

  function showStart() {
    startScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    successScreen.classList.add("hidden-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  function setProgress(value) {
    progressBar.style.width = value + "%";
    progressBar.textContent = value + "%";
  }

  function resetProgress() {
    setProgress(0);
  }

  function isPdf(file) {
    return file && (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function updateBox() {
    redactBox.style.left = box.x + "px";
    redactBox.style.top = box.y + "px";
    redactBox.style.width = box.w + "px";
    redactBox.style.height = box.h + "px";
  }

  function resetAcceptedState() {
    accepted = false;
    redactBox.classList.remove("accepted-box");
    acceptBtn.classList.remove("accepted");
    acceptBtn.textContent = "Accept";
  }

  async function renderPage() {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = viewport.width + "px";
    canvas.style.height = viewport.height + "px";

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    canvasWrap.style.width = viewport.width + "px";
    canvasWrap.style.height = viewport.height + "px";

    zoomText.textContent = Math.round(scale * 100) + "%";
    updateBox();
  }

  async function loadPdf(file) {
    selectedFile = file;

    const arrayBuffer = await file.arrayBuffer();

    pdfDoc = await pdfjsLib.getDocument({
      data: arrayBuffer
    }).promise;

    scale = 1.2;
    box = { x: 100, y: 100, w: 240, h: 70 };
    resetAcceptedState();
    resetProgress();

    await renderPage();
    showPreview();
  }

  function setBoxByOption(type) {
    selectedOption = type;

    if (type === "Text") box = { x: 100, y: 100, w: 240, h: 70 };
    if (type === "Credit Card") box = { x: 100, y: 160, w: 320, h: 55 };
    if (type === "Phone Number") box = { x: 100, y: 230, w: 260, h: 50 };
    if (type === "Email") box = { x: 100, y: 300, w: 340, h: 50 };

    resetAcceptedState();
    updateBox();
  }

  optionButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      optionButtons.forEach((b) => b.classList.remove("active-option"));
      btn.classList.add("active-option");

      const text = btn.innerText.trim();

      if (text.includes("Credit Card")) setBoxByOption("Credit Card");
      else if (text.includes("Phone Number")) setBoxByOption("Phone Number");
      else if (text.includes("Email")) setBoxByOption("Email");
      else setBoxByOption("Text");
    });
  });

  acceptBtn.addEventListener("click", () => {
    accepted = true;
    redactBox.classList.add("accepted-box");
    acceptBtn.classList.add("accepted");
    acceptBtn.textContent = "Accepted";
  });

  redactBox.addEventListener("mousedown", (e) => {
    dragging = true;
    startX = e.clientX - box.x;
    startY = e.clientY - box.y;
    resetAcceptedState();
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    box.x = e.clientX - startX;
    box.y = e.clientY - startY;

    updateBox();
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
  });

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];

    if (!isPdf(file)) {
      alert("Please select PDF file only");
      fileInput.value = "";
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

  zoomInBtn.addEventListener("click", async () => {
    scale += 0.2;
    await renderPage();
  });

  zoomOutBtn.addEventListener("click", async () => {
    if (scale > 0.6) {
      scale -= 0.2;
      await renderPage();
    }
  });

  resetBox.addEventListener("click", () => {
    box = { x: 100, y: 100, w: 240, h: 70 };
    resetAcceptedState();
    updateBox();
  });

  redactBtn.addEventListener("click", async () => {
    if (!selectedFile) {
      alert("Please select PDF file");
      return;
    }

    if (!accepted) {
      alert("Please click Accept before redacting.");
      return;
    }

    const redactData = {
      type: selectedOption,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h
    };

    const formData = new FormData();
    formData.append("pdfFile", selectedFile);
    formData.append("redactData", JSON.stringify(redactData));

    redactBtn.disabled = true;
    redactBtn.innerHTML = `Redacting... <i class="fa-solid fa-spinner fa-spin"></i>`;
    setProgress(30);

    try {
      const response = await fetch("/redact-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        alert(text || "Redact failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {
        alert("Redact failed");
        return;
      }

      if (redactedUrl) URL.revokeObjectURL(redactedUrl);

      redactedUrl = URL.createObjectURL(blob);
      setProgress(100);

      setTimeout(showSuccess, 400);

    } catch (err) {
      console.error(err);
      alert("Redact failed");
    } finally {
      redactBtn.disabled = false;
      redactBtn.innerHTML = "Redact";
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!redactedUrl) {
      alert("Redacted PDF is not ready");
      return;
    }

    const a = document.createElement("a");
    a.href = redactedUrl;
    a.download = "redacted.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  showStart();
});
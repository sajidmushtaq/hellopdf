pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const editorScreen = document.getElementById("editorScreen");
  const successScreen = document.getElementById("successScreen");

  const pdfInput = document.getElementById("pdfInput");
  const imageInput = document.getElementById("imageInput");
  const selectPdfBtn = document.getElementById("selectPdfBtn");

  const pdfCanvasWrap = document.getElementById("pdfCanvasWrap");
  const pageThumbs = document.getElementById("pageThumbs");

  const pageNumberInput = document.getElementById("pageNumberInput");
  const totalPagesText = document.getElementById("totalPagesText");
  const fileNameText = document.getElementById("fileNameText");
  const zoomText = document.getElementById("zoomText");

  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const zoomInBtn = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");

  const textInput = document.getElementById("textInput");
  const fontSizeInput = document.getElementById("fontSizeInput");
  const colorInput = document.getElementById("colorInput");

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const newFileBtn = document.getElementById("newFileBtn");
  const againBtn = document.getElementById("againBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  const progressWrap = document.getElementById("progressWrap");
  const progressBar = document.getElementById("progressBar");

  let selectedPdfFile = null;
  let selectedImageDataUrl = null;
  let pdfDocObj = null;
  let totalPages = 0;
  let currentPage = 1;
  let zoomScale = 1.2;
  let activeTool = "text";
  let elements = [];

  selectPdfBtn.addEventListener("click", () => pdfInput.click());

  pdfInput.addEventListener("change", async () => {
    if (!pdfInput.files || !pdfInput.files[0]) return;
    selectedPdfFile = pdfInput.files[0];
    await openEditor(selectedPdfFile);
  });

  imageInput.addEventListener("change", () => {
    const file = imageInput.files && imageInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      selectedImageDataUrl = reader.result;
      alert("Image selected. Now click on the PDF page to place it.");
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll(".editpdf-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".editpdf-tool").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeTool = btn.dataset.tool;

      if (activeTool === "image") {
        imageInput.click();
      }
    });
  });

  async function openEditor(file) {
    startScreen.classList.add("hidden-screen");
    successScreen.classList.add("hidden-screen");
    editorScreen.classList.remove("hidden-screen");

    fileNameText.textContent =
      file.name.length > 32 ? file.name.slice(0, 32) + "..." : file.name;

    await renderPdf(file);
  }

  async function renderPdf(file) {
    pdfCanvasWrap.innerHTML = "";
    pageThumbs.innerHTML = "";
    elements = [];

    const arrayBuffer = await file.arrayBuffer();
    pdfDocObj = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    totalPages = pdfDocObj.numPages;

    totalPagesText.textContent = `/ ${totalPages}`;
    currentPage = 1;
    pageNumberInput.value = "1";

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocObj.getPage(pageNum);
      await renderPage(page, pageNum);
      await renderThumb(page, pageNum);
    }

    updateZoomLabel();
  }

  async function renderPage(page, pageNum) {
    const viewport = page.getViewport({ scale: zoomScale });

    const pageBox = document.createElement("div");
    pageBox.className = "editpdf-page-box";
    pageBox.dataset.page = pageNum;
    pageBox.style.width = `${viewport.width}px`;
    pageBox.style.height = `${viewport.height}px`;

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport
    }).promise;

    pageBox.appendChild(canvas);
    pdfCanvasWrap.appendChild(pageBox);

    pageBox.addEventListener("click", (e) => {
      if (e.target !== pageBox && e.target.tagName !== "CANVAS") return;
      addElement(pageBox, e);
    });
  }

  async function renderThumb(page, pageNum) {
    const viewport = page.getViewport({ scale: 0.18 });

    const thumb = document.createElement("button");
    thumb.className = "editpdf-thumb" + (pageNum === 1 ? " active" : "");
    thumb.type = "button";
    thumb.dataset.page = pageNum;

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({
      canvasContext: canvas.getContext("2d"),
      viewport
    }).promise;

    const label = document.createElement("span");
    label.textContent = pageNum;

    thumb.appendChild(canvas);
    thumb.appendChild(label);
    pageThumbs.appendChild(thumb);

    thumb.addEventListener("click", () => {
      const box = document.querySelector(`.editpdf-page-box[data-page="${pageNum}"]`);
      if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
      setCurrentPage(pageNum);
    });
  }

  function addElement(pageBox, event) {
    const rect = pageBox.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const fontSize = Number(fontSizeInput.value || 24);
    const color = colorInput.value || "#111827";

    let value = textInput.value.trim() || "Text";
    let width = 180;
    let height = 48;
    let dataUrl = null;

    if (activeTool === "highlight") {
      value = "";
      width = 220;
      height = 34;
      dataUrl = createShapeImage("highlight", width, height, color);
    } else if (activeTool === "rectangle") {
      value = "";
      width = 180;
      height = 90;
      dataUrl = createShapeImage("rectangle", width, height, color);
    } else if (activeTool === "circle") {
      value = "";
      width = 110;
      height = 110;
      dataUrl = createShapeImage("circle", width, height, color);
    } else if (activeTool === "image") {
      if (!selectedImageDataUrl) {
        alert("Please select an image first.");
        imageInput.click();
        return;
      }
      value = "";
      width = 180;
      height = 120;
      dataUrl = selectedImageDataUrl;
    } else {
      dataUrl = createTextImage(value, fontSize, color);
    }

    const item = {
      id: Date.now() + Math.random(),
      page: Number(pageBox.dataset.page),
      type: activeTool,
      value,
      fontSize,
      color,
      dataUrl,
      x,
      y,
      width,
      height,
      pageWidth: pageBox.offsetWidth,
      pageHeight: pageBox.offsetHeight
    };

    elements.push(item);
    renderElement(pageBox, item);
  }

  function renderElement(pageBox, item) {
    const el = document.createElement("div");
    el.className = `editpdf-element editpdf-${item.type}`;
    el.dataset.id = item.id;

    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
    el.style.width = `${item.width}px`;
    el.style.height = `${item.height}px`;
    el.style.fontSize = `${item.fontSize}px`;

    if (item.type === "text") {
      el.innerHTML = `
        <span class="editpdf-editable" contenteditable="true">${escapeHtml(item.value)}</span>
        <button class="editpdf-remove" type="button">×</button>
      `;
    } else {
      el.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.type}">
        <button class="editpdf-remove" type="button">×</button>
      `;
    }

    pageBox.appendChild(el);

    const editable = el.querySelector(".editpdf-editable");
    if (editable) {
      editable.addEventListener("mousedown", (e) => e.stopPropagation());
      editable.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });

      editable.addEventListener("click", (e) => {
        e.stopPropagation();

        if (window.innerWidth <= 980) {
          const newValue = prompt("Enter text:", item.value || "");
          if (newValue !== null) {
            item.value = newValue.trim() || "Text";
            editable.innerText = item.value;
            item.dataUrl = createTextImage(item.value, item.fontSize, item.color);
          }
        }
      });

      editable.addEventListener("input", () => {
        item.value = editable.innerText.trim() || "Text";
        item.dataUrl = createTextImage(item.value, item.fontSize, item.color);
      });
    }

    el.querySelector(".editpdf-remove").addEventListener("click", () => {
      elements = elements.filter((e) => String(e.id) !== String(item.id));
      el.remove();
    });

    makeDraggable(el, pageBox);
    makeResizable(el, pageBox);
  }

  function createTextImage(text, fontSize, color) {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color || "#111827";
    ctx.textBaseline = "middle";
    ctx.font = `${fontSize * 1.8}px Arial`;
    ctx.fillText(String(text || "Text"), 30, 90);

    return canvas.toDataURL("image/png");
  }

  function createShapeImage(type, width, height, color) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(100, width * 3);
    canvas.height = Math.max(80, height * 3);

    const ctx = canvas.getContext("2d");

    if (type === "highlight") {
      ctx.fillStyle = "rgba(255, 235, 59, 0.55)";
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    }

    if (type === "rectangle") {
      ctx.strokeStyle = color || "#ef4444";
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    }

    if (type === "circle") {
      ctx.strokeStyle = color || "#ef4444";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.ellipse(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2 - 14,
        canvas.height / 2 - 14,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    return canvas.toDataURL("image/png");
  }

  function makeDraggable(el, parent) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;

    el.addEventListener("mousedown", startDrag);
    el.addEventListener("touchstart", startDrag, { passive: false });

    function startDrag(e) {
      if (e.target.tagName === "BUTTON" || e.target.isContentEditable) return;
      e.preventDefault();

      dragging = true;
      const point = e.touches ? e.touches[0] : e;

      startX = point.clientX;
      startY = point.clientY;
      origX = el.offsetLeft;
      origY = el.offsetTop;

      window.addEventListener("mousemove", drag);
      window.addEventListener("mouseup", stop);
      window.addEventListener("touchmove", drag, { passive: false });
      window.addEventListener("touchend", stop);
    }

    function drag(e) {
      if (!dragging) return;
      e.preventDefault();

      const point = e.touches ? e.touches[0] : e;

      let nextX = origX + point.clientX - startX;
      let nextY = origY + point.clientY - startY;

      nextX = Math.max(0, Math.min(nextX, parent.offsetWidth - el.offsetWidth));
      nextY = Math.max(0, Math.min(nextY, parent.offsetHeight - el.offsetHeight));

      el.style.left = `${nextX}px`;
      el.style.top = `${nextY}px`;

      updateElement(el, parent);
    }

    function stop() {
      dragging = false;
      window.removeEventListener("mousemove", drag);
      window.removeEventListener("mouseup", stop);
      window.removeEventListener("touchmove", drag);
      window.removeEventListener("touchend", stop);
    }
  }

  function makeResizable(el, parent) {
    const observer = new ResizeObserver(() => updateElement(el, parent));
    observer.observe(el);
  }

  function updateElement(el, parent) {
    const item = elements.find((e) => String(e.id) === String(el.dataset.id));
    if (!item) return;

    item.x = el.offsetLeft;
    item.y = el.offsetTop;
    item.width = el.offsetWidth;
    item.height = el.offsetHeight;
    item.pageWidth = parent.offsetWidth;
    item.pageHeight = parent.offsetHeight;

    if (item.type === "text") {
      const editable = el.querySelector(".editpdf-editable");
      item.value = editable ? editable.innerText.trim() || "Text" : item.value;
      item.fontSize = parseInt(window.getComputedStyle(el).fontSize, 10) || item.fontSize;
      item.dataUrl = createTextImage(item.value, item.fontSize, item.color);
    }
  }

  function setCurrentPage(pageNum) {
    currentPage = Math.max(1, Math.min(totalPages, pageNum));
    pageNumberInput.value = currentPage;

    document.querySelectorAll(".editpdf-thumb").forEach((thumb) => {
      thumb.classList.toggle("active", Number(thumb.dataset.page) === currentPage);
    });
  }

  prevPageBtn.addEventListener("click", () => {
    const next = Math.max(1, currentPage - 1);
    const box = document.querySelector(`.editpdf-page-box[data-page="${next}"]`);
    if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
    setCurrentPage(next);
  });

  nextPageBtn.addEventListener("click", () => {
    const next = Math.min(totalPages, currentPage + 1);
    const box = document.querySelector(`.editpdf-page-box[data-page="${next}"]`);
    if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
    setCurrentPage(next);
  });

  zoomInBtn.addEventListener("click", async () => {
    zoomScale = Math.min(1.8, zoomScale + 0.1);
    await rerenderKeepElements();
  });

  zoomOutBtn.addEventListener("click", async () => {
    zoomScale = Math.max(0.7, zoomScale - 0.1);
    await rerenderKeepElements();
  });

  async function rerenderKeepElements() {
    const oldElements = JSON.parse(JSON.stringify(elements));
    pdfCanvasWrap.innerHTML = "";
    pageThumbs.innerHTML = "";

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocObj.getPage(pageNum);
      await renderPage(page, pageNum);
      await renderThumb(page, pageNum);
    }

    elements = [];

    oldElements.forEach((old) => {
      const pageBox = document.querySelector(`.editpdf-page-box[data-page="${old.page}"]`);
      if (!pageBox) return;

      const scaleX = pageBox.offsetWidth / old.pageWidth;
      const scaleY = pageBox.offsetHeight / old.pageHeight;

      const updated = {
        ...old,
        x: old.x * scaleX,
        y: old.y * scaleY,
        width: old.width * scaleX,
        height: old.height * scaleY,
        pageWidth: pageBox.offsetWidth,
        pageHeight: pageBox.offsetHeight
      };

      elements.push(updated);
      renderElement(pageBox, updated);
    });

    updateZoomLabel();
  }

  function updateZoomLabel() {
    zoomText.value = `${Math.round((zoomScale / 1.2) * 100)}%`;
  }

  downloadPdfBtn.addEventListener("click", async () => {
    if (!selectedPdfFile) return alert("Please select a PDF first.");
    if (!elements.length) return alert("Please add at least one edit.");

    progressWrap.classList.remove("hidden-screen");
    progressBar.style.width = "35%";

    const formData = new FormData();
    formData.append("file", selectedPdfFile);
    formData.append("elements", JSON.stringify(elements));

    try {
      const res = await fetch("/edit-pdf", {
        method: "POST",
        body: formData
      });

      progressBar.style.width = "80%";

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to edit PDF.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      downloadBtn.href = url;
      downloadBtn.download = "edited-pdf.pdf";

      progressBar.style.width = "100%";

      setTimeout(() => {
        document.body.classList.add("editpdf-success-active");
        editorScreen.classList.add("hidden-screen");
        editorScreen.style.display = "none";
        successScreen.classList.remove("hidden-screen");
        successScreen.style.display = "flex";
        window.scrollTo(0, 0);
      }, 350);
    } catch (err) {
      alert("Error: " + err.message);
      progressWrap.classList.add("hidden-screen");
    }
  });

  if (newFileBtn) newFileBtn.addEventListener("click", () => window.location.reload());
  if (againBtn) againBtn.addEventListener("click", () => window.location.reload());

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
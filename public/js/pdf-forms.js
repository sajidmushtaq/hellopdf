pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const editorScreen = document.getElementById("editorScreen");
  const successScreen = document.getElementById("successScreen");

  const pdfInput = document.getElementById("pdfInput");
  const selectPdfBtn = document.getElementById("selectPdfBtn");

  const formsPopup = document.getElementById("formsPopup");
  const detectBtn = document.getElementById("detectBtn");
  const manualBtn = document.getElementById("manualBtn");

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

  const fieldValueInput = document.getElementById("fieldValueInput");
  const fieldFontInput = document.getElementById("fieldFontInput");

  const fieldCount = document.getElementById("fieldCount");
  const fieldList = document.getElementById("fieldList");
  const fieldListEmpty = document.getElementById("fieldListEmpty");

  const downloadPdfBtn = document.getElementById("downloadPdfBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const againBtn = document.getElementById("againBtn");

  const progressWrap = document.getElementById("progressWrap");
  const progressBar = document.getElementById("progressBar");

  const togglePanelBtn = document.getElementById("togglePanelBtn");
  const formsRightPanel = document.getElementById("formsRightPanel");

  let selectedPdfFile = null;
  let pdfDocObj = null;
  let totalPages = 0;
  let currentPage = 1;
  let zoomScale = 1.2;
  let activeTool = "signature";
  let fields = [];

  selectPdfBtn.addEventListener("click", () => pdfInput.click());

  pdfInput.addEventListener("change", async () => {
    if (!pdfInput.files || !pdfInput.files[0]) return;
    selectedPdfFile = pdfInput.files[0];
    openPopup();
  });

  function openPopup() {
    formsPopup.classList.remove("hidden-screen");
  }

  detectBtn.addEventListener("click", () => {
    alert("Automatic field detection will be added in premium version. Please use manual edit.");
  });

  manualBtn.addEventListener("click", async () => {
    formsPopup.classList.add("hidden-screen");
    await openEditor(selectedPdfFile);
  });

  document.querySelectorAll(".forms-tool").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".forms-tool").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeTool = btn.dataset.tool;

      if (activeTool === "date") fieldValueInput.value = new Date().toLocaleDateString();
      else if (activeTool === "checkbox") fieldValueInput.value = "✓";
      else if (activeTool === "radio") fieldValueInput.value = "●";
      else if (activeTool === "signature" && !fieldValueInput.value.trim()) fieldValueInput.value = "Signature";
      else if (activeTool === "dropdown" && !fieldValueInput.value.trim()) fieldValueInput.value = "Option 1";
      else if (activeTool === "stamp" && !fieldValueInput.value.trim()) fieldValueInput.value = "APPROVED";
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
    pageBox.className = "forms-page-box";
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
      addField(pageBox, e);
    });
  }

  async function renderThumb(page, pageNum) {
    const viewport = page.getViewport({ scale: 0.18 });

    const thumb = document.createElement("button");
    thumb.className = "forms-thumb" + (pageNum === 1 ? " active" : "");
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
      const box = document.querySelector(`.forms-page-box[data-page="${pageNum}"]`);
      if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
      setCurrentPage(pageNum);
    });
  }

  function addField(pageBox, event) {
    const rect = pageBox.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const fontSize = Number(fieldFontInput.value || 22);
    const value = getDefaultValue();

    const field = {
      id: Date.now() + Math.random(),
      page: Number(pageBox.dataset.page),
      type: activeTool,
      value,
      fontSize,
      x,
      y,
      width: getDefaultWidth(activeTool),
      height: getDefaultHeight(activeTool),
      pageWidth: pageBox.offsetWidth,
      pageHeight: pageBox.offsetHeight,
      dataUrl: createFieldImage(value, activeTool, fontSize)
    };

    fields.push(field);
    renderFieldElement(pageBox, field);
    renderFieldList();
  }

  function getDefaultValue() {
    const typed = fieldValueInput.value.trim();

    if (activeTool === "checkbox") return "✓";
    if (activeTool === "radio") return "●";
    if (activeTool === "date") return typed || new Date().toLocaleDateString();
    if (activeTool === "signature") return typed || "Signature";
    if (activeTool === "textarea") return typed || "Multiline text";
    if (activeTool === "dropdown") return typed || "Option 1";
    if (activeTool === "stamp") return typed || "APPROVED";
    return typed || "Text";
  }

  function getDefaultWidth(type) {
    if (type === "checkbox" || type === "radio") return 42;
    if (type === "textarea") return 220;
    if (type === "dropdown") return 190;
    if (type === "stamp") return 170;
    return 180;
  }

  function getDefaultHeight(type) {
    if (type === "checkbox" || type === "radio") return 42;
    if (type === "textarea") return 90;
    return 46;
  }

  function renderFieldElement(pageBox, field) {
    const el = document.createElement("div");
    el.className = `forms-field forms-field-${field.type}`;
    el.dataset.id = field.id;

    el.style.left = `${field.x}px`;
    el.style.top = `${field.y}px`;
    el.style.width = `${field.width}px`;
    el.style.height = `${field.height}px`;
    el.style.fontSize = `${field.fontSize}px`;

    if (field.type === "signature") el.classList.add("forms-signature-font");
    if (field.type === "stamp") el.classList.add("forms-stamp-field");

    el.innerHTML = `
      <span>${escapeHtml(field.value)}</span>
      <button class="forms-field-remove" type="button">×</button>
    `;

    pageBox.appendChild(el);

    el.querySelector(".forms-field-remove").addEventListener("click", () => {
      fields = fields.filter((f) => String(f.id) !== String(field.id));
      el.remove();
      renderFieldList();
    });

    makeDraggable(el, pageBox);
    makeResizable(el, pageBox);
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
      if (e.target.tagName === "BUTTON") return;
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

      updateField(el, parent);
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
    const observer = new ResizeObserver(() => updateField(el, parent));
    observer.observe(el);
  }

  function updateField(el, parent) {
    const field = fields.find((f) => String(f.id) === String(el.dataset.id));
    if (!field) return;

    field.x = el.offsetLeft;
    field.y = el.offsetTop;
    field.width = el.offsetWidth;
    field.height = el.offsetHeight;
    field.pageWidth = parent.offsetWidth;
    field.pageHeight = parent.offsetHeight;
    field.fontSize = parseInt(window.getComputedStyle(el).fontSize, 10) || field.fontSize;
    field.dataUrl = createFieldImage(field.value, field.type, field.fontSize);
  }

  function renderFieldList() {
    fieldCount.textContent = fields.length;
    fieldList.innerHTML = "";
    fieldListEmpty.style.display = fields.length ? "none" : "block";

    fields.forEach((field, index) => {
      const item = document.createElement("button");
      item.className = "forms-list-item";
      item.type = "button";
      item.innerHTML = `
        <strong>${index + 1}. ${prettyType(field.type)}</strong>
        <span>Page ${field.page} — ${escapeHtml(field.value)}</span>
      `;

      item.addEventListener("click", () => {
        const box = document.querySelector(`.forms-field[data-id="${field.id}"]`);
        if (box) {
          box.scrollIntoView({ behavior: "smooth", block: "center" });
          box.classList.add("highlight");
          setTimeout(() => box.classList.remove("highlight"), 700);
        }
      });

      fieldList.appendChild(item);
    });
  }

  function prettyType(type) {
    const names = {
      signature: "Signature",
      text: "Text Field",
      checkbox: "Checkbox",
      radio: "Radio Button",
      textarea: "Multiline Text",
      dropdown: "Dropdown",
      date: "Date",
      stamp: "Stamp"
    };

    return names[type] || "Field";
  }

  function createFieldImage(value, type, fontSize) {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 180;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#111827";
    ctx.textBaseline = "middle";

    if (type === "signature") {
      ctx.font = `${fontSize * 2}px Brush Script MT, Segoe Script, cursive`;
      ctx.fillStyle = "#555";
    } else if (type === "stamp") {
      ctx.font = `bold ${fontSize * 1.6}px Arial`;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 5;
      ctx.strokeRect(20, 35, 360, 90);
      ctx.fillStyle = "#ef4444";
    } else if (type === "checkbox") {
      ctx.font = `bold ${fontSize * 2.2}px Arial`;
    } else if (type === "radio") {
      ctx.font = `bold ${fontSize * 2}px Arial`;
    } else {
      ctx.font = `${fontSize * 1.8}px Arial`;
    }

    wrapText(ctx, String(value || ""), 30, 90, 540, fontSize * 2.1);
    return canvas.toDataURL("image/png");
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let lines = [];

    words.forEach((word) => {
      const test = line + word + " ";
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line.trim());
        line = word + " ";
      } else {
        line = test;
      }
    });

    lines.push(line.trim());

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((lineText, i) => {
      ctx.fillText(lineText, x, startY + i * lineHeight);
    });
  }

  function setCurrentPage(pageNum) {
    currentPage = Math.max(1, Math.min(totalPages, pageNum));
    pageNumberInput.value = currentPage;

    document.querySelectorAll(".forms-thumb").forEach((thumb) => {
      thumb.classList.toggle("active", Number(thumb.dataset.page) === currentPage);
    });
  }

  prevPageBtn.addEventListener("click", () => {
    const next = Math.max(1, currentPage - 1);
    const box = document.querySelector(`.forms-page-box[data-page="${next}"]`);
    if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
    setCurrentPage(next);
  });

  nextPageBtn.addEventListener("click", () => {
    const next = Math.min(totalPages, currentPage + 1);
    const box = document.querySelector(`.forms-page-box[data-page="${next}"]`);
    if (box) box.scrollIntoView({ behavior: "smooth", block: "center" });
    setCurrentPage(next);
  });

  zoomInBtn.addEventListener("click", async () => {
    zoomScale = Math.min(1.8, zoomScale + 0.1);
    await rerenderPagesKeepFields();
  });

  zoomOutBtn.addEventListener("click", async () => {
    zoomScale = Math.max(0.7, zoomScale - 0.1);
    await rerenderPagesKeepFields();
  });

  async function rerenderPagesKeepFields() {
    const oldFields = JSON.parse(JSON.stringify(fields));
    pdfCanvasWrap.innerHTML = "";
    pageThumbs.innerHTML = "";

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDocObj.getPage(pageNum);
      await renderPage(page, pageNum);
      await renderThumb(page, pageNum);
    }

    fields = [];

    oldFields.forEach((old) => {
      const pageBox = document.querySelector(`.forms-page-box[data-page="${old.page}"]`);
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

      fields.push(updated);
      renderFieldElement(pageBox, updated);
    });

    renderFieldList();
    updateZoomLabel();
  }

  function updateZoomLabel() {
    zoomText.value = `${Math.round((zoomScale / 1.2) * 60)}%`;
  }

  if (togglePanelBtn) {
    togglePanelBtn.addEventListener("click", () => {
      formsRightPanel.classList.toggle("collapsed");
    });
  }

  downloadPdfBtn.addEventListener("click", async () => {
    if (!selectedPdfFile) return alert("Please select a PDF first.");
    if (!fields.length) return alert("Please add at least one form field.");

    progressWrap.classList.remove("hidden-screen");
    progressBar.style.width = "35%";

    const formData = new FormData();
    formData.append("file", selectedPdfFile);
    formData.append("fields", JSON.stringify(fields));

    try {
      const res = await fetch("/pdf-forms", {
        method: "POST",
        body: formData
      });

      progressBar.style.width = "80%";

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to process PDF form.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      downloadBtn.href = url;
      downloadBtn.download = "pdf-form-completed.pdf";

      progressBar.style.width = "100%";

      setTimeout(() => {
        document.body.classList.add("forms-success-active");
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
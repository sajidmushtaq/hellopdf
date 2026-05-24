pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const startScreen = document.getElementById("startScreen");
const editorScreen = document.getElementById("editorScreen");
const successScreen = document.getElementById("successScreen");

const pdfInput = document.getElementById("pdfInput");
const selectPdfBtn = document.getElementById("selectPdfBtn");
const pdfCanvasWrap = document.getElementById("pdfCanvasWrap");
const pageThumbs = document.getElementById("pageThumbs");

const pageNumberInput = document.getElementById("pageNumberInput");
const totalPagesText = document.getElementById("totalPagesText");
const fileNameText = document.getElementById("fileNameText");

const fieldTextInput = document.getElementById("fieldTextInput");
const fontSizeInput = document.getElementById("fontSizeInput");

const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const newFileBtn = document.getElementById("newFileBtn");
const againBtn = document.getElementById("againBtn");
const downloadBtn = document.getElementById("downloadBtn");

const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");

let selectedPdfFile = null;
let pdfDocObj = null;
let totalPages = 0;
let currentPage = 1;
let activeTool = "text";
let fields = [];

selectPdfBtn.addEventListener("click", () => pdfInput.click());

pdfInput.addEventListener("change", async () => {
  if (!pdfInput.files[0]) return;
  selectedPdfFile = pdfInput.files[0];
  await showEditor(selectedPdfFile);
});

document.querySelectorAll(".fill-tool-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".fill-tool-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    activeTool = btn.dataset.tool;

    if (activeTool === "date") {
      fieldTextInput.value = new Date().toLocaleDateString();
    } else if (activeTool === "check") {
      fieldTextInput.value = "✓";
    } else if (activeTool === "signature" && !fieldTextInput.value.trim()) {
      fieldTextInput.value = "Signature";
    }
  });
});

async function showEditor(file) {
  startScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");
  editorScreen.classList.remove("hidden-screen");

  pdfCanvasWrap.innerHTML = "";
  pageThumbs.innerHTML = "";
  fields = [];

  fileNameText.textContent = file.name.length > 28 ? file.name.slice(0, 28) + "..." : file.name;

  const buffer = await file.arrayBuffer();
  pdfDocObj = await pdfjsLib.getDocument({ data: buffer }).promise;
  totalPages = pdfDocObj.numPages;

  totalPagesText.textContent = `/ ${totalPages}`;
  pageNumberInput.value = "1";
  currentPage = 1;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDocObj.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.2 });

    const pageBox = document.createElement("div");
    pageBox.className = "fill-page-box";
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

    await createThumb(page, pageNum);
  }
}

async function createThumb(page, pageNum) {
  const viewport = page.getViewport({ scale: 0.18 });

  const thumb = document.createElement("button");
  thumb.className = "fill-thumb" + (pageNum === 1 ? " active" : "");
  thumb.type = "button";
  thumb.dataset.page = pageNum;

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: canvas.getContext("2d"),
    viewport
  }).promise;

  const span = document.createElement("span");
  span.textContent = pageNum;

  thumb.appendChild(canvas);
  thumb.appendChild(span);
  pageThumbs.appendChild(thumb);

  thumb.addEventListener("click", () => {
    const pageBox = document.querySelector(`.fill-page-box[data-page="${pageNum}"]`);
    if (pageBox) pageBox.scrollIntoView({ behavior: "smooth", block: "center" });
    setActivePage(pageNum);
  });
}

function setActivePage(pageNum) {
  currentPage = pageNum;
  pageNumberInput.value = pageNum;

  document.querySelectorAll(".fill-thumb").forEach((thumb) => {
    thumb.classList.toggle("active", Number(thumb.dataset.page) === pageNum);
  });
}

function addField(pageBox, event) {
  const rect = pageBox.getBoundingClientRect();
  const text = getFieldText(dataUrl: createFieldImage(text, activeTool, fontSize),);
  const fontSize = Number(fontSizeInput.value || 24);

  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const field = {
    id: Date.now() + Math.random(),
    page: Number(pageBox.dataset.page),
    type: activeTool,
    text,
    fontSize,
    x,
    y,
    width: activeTool === "check" ? 44 : 190,
    height: activeTool === "check" ? 44 : 48,
    pageWidth: pageBox.offsetWidth,
    pageHeight: pageBox.offsetHeight
  };

  fields.push(field);
  renderField(pageBox, field);
}

function getFieldText() {
  const value = fieldTextInput.value.trim();

  if (activeTool === "date") return value || new Date().toLocaleDateString();
  if (activeTool === "check") return "✓";
  if (activeTool === "signature") return value || "Signature";
  return value || "Text";
}

function renderField(pageBox, field) {
  const el = document.createElement("div");
  el.className = "fill-field fill-field-" + field.type;
  el.dataset.id = field.id;
  el.style.left = `${field.x}px`;
  el.style.top = `${field.y}px`;
  el.style.width = `${field.width}px`;
  el.style.height = `${field.height}px`;
  el.style.fontSize = `${field.fontSize}px`;

  if (field.type === "signature") {
    el.classList.add("fill-signature-font");
  }

  el.innerHTML = `
    <span>${field.text}</span>
    <button type="button" class="fill-remove">×</button>
  `;

  pageBox.appendChild(el);

  el.querySelector(".fill-remove").addEventListener("click", () => {
    fields = fields.filter((item) => String(item.id) !== String(field.id));
    el.remove();
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

    let x = origX + point.clientX - startX;
    let y = origY + point.clientY - startY;

    x = Math.max(0, Math.min(x, parent.offsetWidth - el.offsetWidth));
    y = Math.max(0, Math.min(y, parent.offsetHeight - el.offsetHeight));

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

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
  const field = fields.find((item) => String(item.id) === String(el.dataset.id));
  if (!field) return;

  field.x = el.offsetLeft;
  field.y = el.offsetTop;
  field.width = el.offsetWidth;
  field.height = el.offsetHeight;
  field.pageWidth = parent.offsetWidth;
  field.pageHeight = parent.offsetHeight;
  field.fontSize = parseInt(window.getComputedStyle(el).fontSize, 10) || field.fontSize;
}

downloadPdfBtn.addEventListener("click", async () => {
  if (!selectedPdfFile) return alert("Please select a PDF first.");
  if (!fields.length) return alert("Please add at least one field.");

  progressWrap.classList.remove("hidden-screen");
  progressBar.style.width = "35%";

  const formData = new FormData();
  formData.append("file", selectedPdfFile);
  formData.append("fields", JSON.stringify(fields));

  try {
    const res = await fetch("/fill-sign-pdf", {
      method: "POST",
      body: formData
    });

    progressBar.style.width = "80%";

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Failed to create PDF");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    downloadBtn.href = url;
    downloadBtn.download = "filled-signed-pdf.pdf";

    progressBar.style.width = "100%";

    setTimeout(() => {
      editorScreen.classList.add("hidden-screen");
      successScreen.classList.remove("hidden-screen");
    }, 350);
  } catch (err) {
    alert("Error: " + err.message);
    progressWrap.classList.add("hidden-screen");
  }
});

function createFieldImage(text, type, fontSize) {
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 160;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111827";
  ctx.textBaseline = "middle";

  if (type === "signature") {
    ctx.font = `${fontSize * 2}px Brush Script MT, Segoe Script, cursive`;
  } else {
    ctx.font = `${fontSize * 2}px Arial`;
  }

  ctx.fillText(text, 30, 80);

  return canvas.toDataURL("image/png");
}

newFileBtn.addEventListener("click", () => window.location.reload());
againBtn.addEventListener("click", () => window.location.reload());
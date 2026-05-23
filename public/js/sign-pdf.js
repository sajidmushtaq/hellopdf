pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const startScreen = document.getElementById("startScreen");
const previewScreen = document.getElementById("previewScreen");
const successScreen = document.getElementById("successScreen");

const pdfInput = document.getElementById("pdfInput");
const selectPdfBtn = document.getElementById("selectPdfBtn");
const pdfCanvasWrap = document.getElementById("pdfCanvasWrap");

const drawCanvas = document.getElementById("drawCanvas");
const clearDrawBtn = document.getElementById("clearDrawBtn");
const textSignature = document.getElementById("textSignature");
const signatureUpload = document.getElementById("signatureUpload");

const addSignatureBtn = document.getElementById("addSignatureBtn");
const applySignBtn = document.getElementById("applySignBtn");
const backBtn = document.getElementById("backBtn");
const newFileBtn = document.getElementById("newFileBtn");
const downloadBtn = document.getElementById("downloadBtn");

const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");

let selectedPdfFile = null;
let activeSignatureData = null;
let placements = [];
let currentTab = "draw";

selectPdfBtn.addEventListener("click", () => pdfInput.click());

pdfInput.addEventListener("change", async () => {
  if (!pdfInput.files[0]) return;
  selectedPdfFile = pdfInput.files[0];
  await showPreview(selectedPdfFile);
});

async function showPreview(file) {
  startScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");
  previewScreen.classList.remove("hidden-screen");

  pdfCanvasWrap.innerHTML = "";
  placements = [];

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.35 });

    const pageBox = document.createElement("div");
    pageBox.className = "sign-page-box";
    pageBox.dataset.page = pageNum;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    pageBox.style.width = `${viewport.width}px`;
    pageBox.style.height = `${viewport.height}px`;

    await page.render({ canvasContext: ctx, viewport }).promise;

    pageBox.appendChild(canvas);
    pdfCanvasWrap.appendChild(pageBox);
  }
}

document.querySelectorAll(".sig-tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sig-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;

    document.getElementById("drawTab").classList.toggle("hidden-screen", currentTab !== "draw");
    document.getElementById("textTab").classList.toggle("hidden-screen", currentTab !== "text");
    document.getElementById("uploadTab").classList.toggle("hidden-screen", currentTab !== "upload");
  });
});

const drawCtx = drawCanvas.getContext("2d");
drawCtx.lineWidth = 3;
drawCtx.lineCap = "round";
drawCtx.strokeStyle = "#111827";

let drawing = false;

function drawPosition(e) {
  const rect = drawCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top
  };
}

drawCanvas.addEventListener("mousedown", e => {
  drawing = true;
  const p = drawPosition(e);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
});

drawCanvas.addEventListener("mousemove", e => {
  if (!drawing) return;
  const p = drawPosition(e);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
});

window.addEventListener("mouseup", () => drawing = false);

drawCanvas.addEventListener("touchstart", e => {
  e.preventDefault();
  drawing = true;
  const p = drawPosition(e);
  drawCtx.beginPath();
  drawCtx.moveTo(p.x, p.y);
});

drawCanvas.addEventListener("touchmove", e => {
  e.preventDefault();
  if (!drawing) return;
  const p = drawPosition(e);
  drawCtx.lineTo(p.x, p.y);
  drawCtx.stroke();
});

drawCanvas.addEventListener("touchend", () => drawing = false);

clearDrawBtn.addEventListener("click", () => {
  drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
});

addSignatureBtn.addEventListener("click", async () => {
  activeSignatureData = await getSignatureData();
  if (!activeSignatureData) {
    alert("Please create or upload a signature first.");
    return;
  }

  const firstPage = document.querySelector(".sign-page-box");
  if (!firstPage) return;

  createSignatureElement(firstPage, activeSignatureData);
});

async function getSignatureData() {
  if (currentTab === "draw") {
    return drawCanvas.toDataURL("image/png");
  }

  if (currentTab === "text") {
    const text = textSignature.value.trim();
    if (!text) return null;

    const canvas = document.createElement("canvas");
    canvas.width = 420;
    canvas.height = 150;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "54px cursive";
    ctx.fillStyle = "#111827";
    ctx.fillText(text, 30, 90);
    return canvas.toDataURL("image/png");
  }

  if (currentTab === "upload") {
    const file = signatureUpload.files[0];
    if (!file) return null;

    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  return null;
}

function createSignatureElement(pageBox, dataUrl) {
  const sig = document.createElement("div");
  sig.className = "signature-placement";
  sig.style.left = "80px";
  sig.style.top = "80px";
  sig.style.width = "180px";
  sig.style.height = "70px";

  const img = document.createElement("img");
  img.src = dataUrl;

  const remove = document.createElement("button");
  remove.className = "sig-remove";
  remove.innerHTML = "×";

  sig.appendChild(img);
  sig.appendChild(remove);
  pageBox.appendChild(sig);

  const placement = {
    id: Date.now() + Math.random(),
    page: Number(pageBox.dataset.page),
    dataUrl,
    x: 80,
    y: 80,
    width: 180,
    height: 70,
    pageWidth: pageBox.offsetWidth,
    pageHeight: pageBox.offsetHeight
  };

  sig.dataset.id = placement.id;
  placements.push(placement);

  remove.addEventListener("click", () => {
    placements = placements.filter(p => String(p.id) !== String(sig.dataset.id));
    sig.remove();
  });

  makeDraggable(sig, pageBox);
}

function makeDraggable(el, parent) {
  let startX = 0;
  let startY = 0;
  let origX = 0;
  let origY = 0;
  let dragging = false;

  el.addEventListener("mousedown", startDrag);
  el.addEventListener("touchstart", startDrag, { passive: false });

  function startDrag(e) {
    if (e.target.classList.contains("sig-remove")) return;
    e.preventDefault();

    dragging = true;
    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;
    origX = el.offsetLeft;
    origY = el.offsetTop;

    window.addEventListener("mousemove", drag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", drag, { passive: false });
    window.addEventListener("touchend", stopDrag);
  }

  function drag(e) {
    if (!dragging) return;
    e.preventDefault();

    const point = e.touches ? e.touches[0] : e;
    let newX = origX + point.clientX - startX;
    let newY = origY + point.clientY - startY;

    newX = Math.max(0, Math.min(newX, parent.offsetWidth - el.offsetWidth));
    newY = Math.max(0, Math.min(newY, parent.offsetHeight - el.offsetHeight));

    el.style.left = `${newX}px`;
    el.style.top = `${newY}px`;

    updatePlacement(el, parent);
  }

  function stopDrag() {
    dragging = false;
    window.removeEventListener("mousemove", drag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", drag);
    window.removeEventListener("touchend", stopDrag);
  }
}

function updatePlacement(el, parent) {
  const item = placements.find(p => String(p.id) === String(el.dataset.id));
  if (!item) return;

  item.x = el.offsetLeft;
  item.y = el.offsetTop;
  item.width = el.offsetWidth;
  item.height = el.offsetHeight;
  item.pageWidth = parent.offsetWidth;
  item.pageHeight = parent.offsetHeight;
}

applySignBtn.addEventListener("click", async () => {
  if (!selectedPdfFile) return alert("Please select a PDF first.");
  if (!placements.length) return alert("Please add a signature first.");

  progressWrap.classList.remove("hidden-screen");
  progressBar.style.width = "35%";

  const formData = new FormData();
  formData.append("file", selectedPdfFile);
  formData.append("placements", JSON.stringify(placements));

  try {
    const res = await fetch("/sign-pdf", {
      method: "POST",
      body: formData
    });

    progressBar.style.width = "80%";

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to sign PDF");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    downloadBtn.href = url;
    downloadBtn.download = "signed-pdf.pdf";

    progressBar.style.width = "100%";

    setTimeout(() => {
      previewScreen.classList.add("hidden-screen");
      successScreen.classList.remove("hidden-screen");
    }, 400);
  } catch (err) {
    alert("Error: " + err.message);
    progressWrap.classList.add("hidden-screen");
  }
});

backBtn.addEventListener("click", () => {
  previewScreen.classList.add("hidden-screen");
  startScreen.classList.remove("hidden-screen");
  pdfInput.value = "";
  selectedPdfFile = null;
  placements = [];
});

newFileBtn.addEventListener("click", () => {
  successScreen.classList.add("hidden-screen");
  startScreen.classList.remove("hidden-screen");
  pdfInput.value = "";
  selectedPdfFile = null;
  placements = [];
  progressWrap.classList.add("hidden-screen");
  progressBar.style.width = "0%";
});
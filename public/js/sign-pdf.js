pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const startScreen = document.getElementById("startScreen");
const previewScreen = document.getElementById("previewScreen");
const successScreen = document.getElementById("successScreen");

const pdfInput = document.getElementById("pdfInput");
const selectPdfBtn = document.getElementById("selectPdfBtn");
const pdfCanvasWrap = document.getElementById("pdfCanvasWrap");
const pageThumbs = document.getElementById("pageThumbs");
const pageNumberInput = document.getElementById("pageNumberInput");
const totalPagesText = document.getElementById("totalPagesText");
const fileNameText = document.getElementById("fileNameText");

const signatureModal = document.getElementById("signatureModal");
const modalApplyBtn = document.getElementById("modalApplyBtn");
const fullNameInput = document.getElementById("fullNameInput");
const initialsInput = document.getElementById("initialsInput");
const stampInput = document.getElementById("stampInput");

const requiredFields = document.getElementById("requiredFields");
const optionalFields = document.getElementById("optionalFields");

const applySignBtn = document.getElementById("applySignBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const downloadBtn = document.getElementById("downloadBtn");
const newFileBtn = document.getElementById("newFileBtn");

let selectedPdfFile = null;
let pdfDocObj = null;
let totalPages = 0;
let signatureData = {
  fullName: "",
  initials: "",
  stamp: "",
  sigStyle: "cursive1",
  initialStyle: "cursive1"
};

let placements = [];
let currentPage = 1;

selectPdfBtn.addEventListener("click", () => pdfInput.click());

pdfInput.addEventListener("change", async () => {
  if (!pdfInput.files[0]) return;

  selectedPdfFile = pdfInput.files[0];
  fileNameText.textContent = selectedPdfFile.name.length > 28
    ? selectedPdfFile.name.slice(0, 28) + "..."
    : selectedPdfFile.name;

  openSignatureModal();
});

function openSignatureModal() {
  signatureModal.classList.remove("hidden-screen");
  fullNameInput.focus();
}

document.querySelectorAll(".hp-sign-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".hp-sign-tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    document.getElementById("signatureTab").classList.toggle("hidden-screen", btn.dataset.tab !== "signature");
    document.getElementById("initialsTab").classList.toggle("hidden-screen", btn.dataset.tab !== "initials");
    document.getElementById("stampTab").classList.toggle("hidden-screen", btn.dataset.tab !== "stamp");
  });
});

modalApplyBtn.addEventListener("click", async () => {
  signatureData.fullName = fullNameInput.value.trim() || "Signature";
  signatureData.initials = initialsInput.value.trim() || getInitials(signatureData.fullName);
  signatureData.stamp = stampInput.value.trim() || "Company Stamp";

  const sigRadio = document.querySelector("input[name='sigStyle']:checked");
  const initialRadio = document.querySelector("input[name='initialStyle']:checked");

  signatureData.sigStyle = sigRadio ? sigRadio.value : "cursive1";
  signatureData.initialStyle = initialRadio ? initialRadio.value : "cursive1";

  signatureModal.classList.add("hidden-screen");

  await showPreview(selectedPdfFile);
  addRequiredSignature();
  addOptionalInitials();
});

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || "S";
}

async function showPreview(file) {
  startScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");
  previewScreen.classList.remove("hidden-screen");

  pdfCanvasWrap.innerHTML = "";
  pageThumbs.innerHTML = "";
  placements = [];

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

    await createThumbnail(page, pageNum);
  }
}

async function createThumbnail(page, pageNum) {
  const viewport = page.getViewport({ scale: 0.18 });

  const thumb = document.createElement("button");
  thumb.className = "hp-thumb" + (pageNum === 1 ? " active" : "");
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
    const pageBox = document.querySelector(`.sign-page-box[data-page="${pageNum}"]`);
    if (pageBox) pageBox.scrollIntoView({ behavior: "smooth", block: "center" });
    setActivePage(pageNum);
  });
}

function setActivePage(pageNum) {
  currentPage = pageNum;
  pageNumberInput.value = pageNum;

  document.querySelectorAll(".hp-thumb").forEach((thumb) => {
    thumb.classList.toggle("active", Number(thumb.dataset.page) === pageNum);
  });
}

function addRequiredSignature() {
  const dataUrl = createTextImage(signatureData.fullName, signatureData.sigStyle, "signature");
  const firstPage = document.querySelector(".sign-page-box[data-page='1']");
  if (!firstPage) return;

  const placement = createPlacement(firstPage, {
    type: "signature",
    label: "Signature",
    dataUrl,
    x: firstPage.offsetWidth - 245,
    y: 55,
    width: 190,
    height: 72
  });

  renderFieldCard(requiredFields, placement);
}

function addOptionalInitials() {
  const dataUrl = createTextImage(signatureData.initials, signatureData.initialStyle, "initials");
  const cardPlacement = {
    id: "optional-initials",
    type: "initials",
    label: "Initials",
    dataUrl,
    page: 1
  };

  renderFieldCard(requiredFields.nextElementSibling ? null : requiredFields, cardPlacement);
  renderOptionalPreviewInitials(dataUrl);
}

function renderOptionalPreviewInitials(dataUrl) {
  const list = document.getElementById("optionalFields");
  const preview = document.createElement("div");
  preview.className = "hp-field-card";
  preview.innerHTML = `
    <span class="drag-dots">⠿</span>
    <span class="field-icon">AC</span>
    <div class="field-preview">
      <small>Initials</small>
      <img src="${dataUrl}" alt="Initials">
    </div>
    <button type="button" class="field-edit">✎</button>
  `;
  list.prepend(preview);
}

optionalFields.addEventListener("click", (e) => {
  const btn = e.target.closest(".hp-field-btn");
  if (!btn) return;

  const pageBox = document.querySelector(`.sign-page-box[data-page="${currentPage}"]`);
  if (!pageBox) return;

  const field = btn.dataset.field;
  let text = "";
  let style = "simple";
  let label = "";

  if (field === "initials") {
    text = signatureData.initials;
    style = signatureData.initialStyle;
    label = "Initials";
  }

  if (field === "name") {
    text = signatureData.fullName;
    label = "Name";
  }

  if (field === "date") {
    text = new Date().toLocaleDateString();
    label = "Date";
  }

  if (field === "text") {
    text = "Text";
    label = "Text";
  }

  if (field === "stamp") {
    text = signatureData.stamp;
    label = "Company Stamp";
  }

  const dataUrl = createTextImage(text, style, field);

  createPlacement(pageBox, {
    type: field,
    label,
    dataUrl,
    x: 85,
    y: 90,
    width: field === "date" ? 150 : 190,
    height: 62
  });
});

function renderFieldCard(container, placement) {
  if (!container) return;

  const card = document.createElement("div");
  card.className = "hp-field-card";
  card.dataset.id = placement.id;

  card.innerHTML = `
    <span class="drag-dots">⠿</span>
    <span class="field-icon">${placement.type === "signature" ? "✍" : "AC"}</span>
    <div class="field-preview">
      <small>${placement.label}</small>
      <img src="${placement.dataUrl}" alt="${placement.label}">
    </div>
    <button type="button" class="field-edit">✎</button>
  `;

  container.appendChild(card);
}

function createTextImage(text, style, type) {
  const canvas = document.createElement("canvas");
  canvas.width = 520;
  canvas.height = 180;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let font = "52px cursive";
  if (style === "simple") font = "48px Arial";
  if (style === "hand") font = "48px Comic Sans MS";
  if (type === "stamp") font = "42px Arial";
  if (type === "date") font = "38px Arial";
  if (type === "name") font = "42px Arial";
  if (type === "text") font = "42px Arial";

  ctx.font = font;
  ctx.fillStyle = "#555";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 30, 90);

  return canvas.toDataURL("image/png");
}

function createPlacement(pageBox, options) {
  const placement = {
    id: Date.now() + Math.random(),
    page: Number(pageBox.dataset.page),
    type: options.type,
    label: options.label,
    dataUrl: options.dataUrl,
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    pageWidth: pageBox.offsetWidth,
    pageHeight: pageBox.offsetHeight
  };

  placements.push(placement);

  const el = document.createElement("div");
  el.className = "signature-placement";
  el.dataset.id = placement.id;
  el.style.left = `${placement.x}px`;
  el.style.top = `${placement.y}px`;
  el.style.width = `${placement.width}px`;
  el.style.height = `${placement.height}px`;

  el.innerHTML = `
    <img src="${placement.dataUrl}" alt="${placement.label}">
    <button type="button" class="sig-copy">⧉</button>
    <button type="button" class="sig-remove">×</button>
  `;

  pageBox.appendChild(el);

  const removeBtn = el.querySelector(".sig-remove");
  removeBtn.addEventListener("click", () => {
    placements = placements.filter((p) => String(p.id) !== String(placement.id));
    el.remove();
    document.querySelectorAll(`.hp-field-card[data-id="${placement.id}"]`).forEach((c) => c.remove());
  });

  const copyBtn = el.querySelector(".sig-copy");
  copyBtn.addEventListener("click", () => {
    createPlacement(pageBox, {
      type: placement.type,
      label: placement.label,
      dataUrl: placement.dataUrl,
      x: placement.x + 20,
      y: placement.y + 20,
      width: placement.width,
      height: placement.height
    });
  });

  makeDraggable(el, pageBox);
  makeResizable(el, pageBox);

  return placement;
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
    if (e.target.tagName === "BUTTON") return;
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

function makeResizable(el, parent) {
  const observer = new ResizeObserver(() => updatePlacement(el, parent));
  observer.observe(el);
}

function updatePlacement(el, parent) {
  const item = placements.find((p) => String(p.id) === String(el.dataset.id));
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
  if (!placements.length) return alert("Please add at least one signature field.");

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
    }, 350);
  } catch (err) {
    alert("Error: " + err.message);
    progressWrap.classList.add("hidden-screen");
  }
});

newFileBtn.addEventListener("click", () => {
  window.location.reload();
});
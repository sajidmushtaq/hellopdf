document.addEventListener("DOMContentLoaded", () => {

  /* DRAWERS */

  const toolsMenuBtn =
  document.getElementById("toolsMenuBtn");

  const mainMenuBtn =
  document.getElementById("mainMenuBtn");

  const toolsDrawer =
  document.getElementById("toolsDrawer");

  const mainDrawer =
  document.getElementById("mainDrawer");

  const toolsClose =
  document.getElementById("toolsClose");

  const mainClose =
  document.getElementById("mainClose");

  const drawerOverlay =
  document.getElementById("drawerOverlay");

  const closeUpgradeModal =
  document.getElementById("closeUpgradeModal");

  let currentUser = null;

  (async () => {

    const { data } =
    await window.supabaseClient.auth.getUser();

    if (data && data.user) {

      currentUser = data.user;

    }

  })();

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

    if (slot === 1 && fileOne?.previewUrl) URL.revokeObjectURL(fileOne.previewUrl);
    if (slot === 2 && fileTwo?.previewUrl) URL.revokeObjectURL(fileTwo.previewUrl);

    file.previewUrl = URL.createObjectURL(file);

    if (slot === 1) fileOne = file;
    if (slot === 2) fileTwo = file;

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

    card.querySelector(".remove-file-btn").addEventListener("click", () => {
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
      card.querySelector(".pdf-viewer-wrap").innerHTML =
        `<embed src="${file.previewUrl}" type="application/pdf" class="pdf-thumb" />`;
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

    if (fileOne) fileOneBox.appendChild(createPdfCard(fileOne, 1));
    if (fileTwo) fileTwoBox.appendChild(createPdfCard(fileTwo, 2));

    secondUploadBox.style.display = fileTwo ? "none" : "flex";
    compareBtn.disabled = !(fileOne && fileTwo);

    resetProgress();

    if (fileOne || fileTwo) showPreview();
    else showStart();
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
      alert("Please select both PDF files");
      return;
    }

    const formData = new FormData();


    compareBtn.disabled = true;
    compareBtn.innerHTML = `Comparing... <i class="fa-solid fa-spinner fa-spin"></i>`;

    resetProgress();
    setProgress(20);

    try {
      const response = await fetch("/compare-pdf", {
        method: "POST",
        body: formData
      });

      setProgress(70);

      if (!response.ok) {

const text =
await response.text();

if(response.status===403){

document.getElementById(
"upgradeModal"
).style.display="flex";

throw new Error("");

}

throw new Error(
text ||
"Compare failed"
);

}

      const blob = await response.blob();

      if (!blob || blob.size < 100 || blob.type !== "application/pdf") {
        alert("Compare failed");
        return;
      }

      if (reportUrl) URL.revokeObjectURL(reportUrl);
      reportUrl = URL.createObjectURL(blob);

      setProgress(100);

      setTimeout(showSuccess, 500);

    } catch (err) {
      console.error("COMPARE PDF ERROR:", err);
      alert("Compare failed");
    } finally {
      compareBtn.disabled = !(fileOne && fileTwo);
      compareBtn.innerHTML = "Compare PDF";
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
  /* MOBILE DRAWERS */

  function closeDrawers() {

    toolsDrawer.classList.remove("active");
    mainDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");

  }

  if (toolsMenuBtn) {

    toolsMenuBtn.addEventListener("click", () => {

      toolsDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if (mainMenuBtn) {

    mainMenuBtn.addEventListener("click", () => {

      mainDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if (toolsClose)
    toolsClose.addEventListener("click", closeDrawers);

  if (mainClose)
    mainClose.addEventListener("click", closeDrawers);

  if (drawerOverlay)
    drawerOverlay.addEventListener("click", closeDrawers);

  if (closeUpgradeModal) {

    closeUpgradeModal.addEventListener("click", () => {

      document.getElementById("upgradeModal").style.display = "none";

    });

  }

});
document.addEventListener("DOMContentLoaded", () => {

  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const fileInput = document.getElementById("fileInput");
  const dropZone = document.getElementById("dropZone");

  const addMoreBtn = document.getElementById("addMoreBtn");
  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");

  const repairBtn = document.getElementById("repairBtn");
  const progressBar = document.getElementById("progressBar");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let repairedPdfUrl = null;
  let progressInterval = null;

  function showStartScreen() {

    startScreen.classList.remove("hidden-screen");

    previewScreen.classList.add("hidden-screen");
    successScreen.classList.add("hidden-screen");

    previewScreen.classList.remove("active-screen");
    successScreen.classList.remove("active-screen");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showPreviewScreen() {

    startScreen.classList.add("hidden-screen");

    previewScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("active-screen");

    successScreen.classList.add("hidden-screen");
    successScreen.classList.remove("active-screen");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function showSuccessScreen() {

    startScreen.classList.add("hidden-screen");

    previewScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("active-screen");

    successScreen.classList.remove("hidden-screen");
    successScreen.classList.add("active-screen");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  function resetProgress() {

    clearInterval(progressInterval);

    progressBar.style.width = "0%";
    progressBar.innerHTML = "0%";
  }

  function fakeProgress() {

    let progress = 10;

    progressBar.style.width = "10%";
    progressBar.innerHTML = "10%";

    progressInterval = setInterval(() => {

      if (progress < 90) {

        progress += 5;

        progressBar.style.width = progress + "%";
        progressBar.innerHTML = progress + "%";
      }

    }, 500);
  }

  function completeProgress() {

    clearInterval(progressInterval);

    progressBar.style.width = "100%";
    progressBar.innerHTML = "100%";
  }

  function handleFile(file) {

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {

      alert("Please select PDF file only");
      return;
    }

    selectedFile = file;

    selectedFile.previewUrl = URL.createObjectURL(file);

    renderFileCard();
  }

  function renderFileCard() {

    fileList.innerHTML = "";

    if (!selectedFile) {

      showStartScreen();
      return;
    }

    fileCounter.innerHTML = "1 file selected";

    const card = document.createElement("div");

    card.className = "repair-file-card";

    card.innerHTML = `
    
      <button class="repair-remove-btn" type="button">
        ×
      </button>

      <div class="repair-pdf-preview">

        <embed
          src="${selectedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=0"
          type="application/pdf"
          class="repair-pdf-embed"
        />

      </div>

      <h3>${selectedFile.name}</h3>

      <div class="repair-file-badge">
        1
      </div>
    
    `;

    card.querySelector(".repair-remove-btn")
      .addEventListener("click", () => {

        URL.revokeObjectURL(selectedFile.previewUrl);

        selectedFile = null;

        renderFileCard();
      });

    fileList.appendChild(card);

    showPreviewScreen();
  }

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  addMoreBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {

    const file = e.target.files[0];

    handleFile(file);

    fileInput.value = "";
  });

  dropZone.addEventListener("dragover", (e) => {

    e.preventDefault();

    dropZone.classList.add("drag-active");
  });

  dropZone.addEventListener("dragleave", () => {

    dropZone.classList.remove("drag-active");
  });

  dropZone.addEventListener("drop", (e) => {

    e.preventDefault();

    dropZone.classList.remove("drag-active");

    const file = e.dataTransfer.files[0];

    handleFile(file);
  });

  repairBtn.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select PDF file first");
      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    repairBtn.disabled = true;

    repairBtn.innerHTML = `
      Repairing...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    resetProgress();
    fakeProgress();

    try {

      const response = await fetch("/repair-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

        alert("Repair failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Invalid repaired PDF");
        return;
      }

      completeProgress();

      repairedPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {

        showSuccessScreen();

      }, 500);

    } catch (error) {

      console.error(error);

      alert("Repair failed. Try again.");

    } finally {

      clearInterval(progressInterval);

      repairBtn.disabled = false;

      repairBtn.innerHTML = `
        Repair PDF
      `;
    }

  });

  downloadBtn.addEventListener("click", () => {

    if (!repairedPdfUrl) {

      alert("File not ready");
      return;
    }

    const a = document.createElement("a");

    a.href = repairedPdfUrl;

    a.download = "repaired.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();
  });

  showStartScreen();

});
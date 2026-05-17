document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone1 = document.getElementById("dropZone1");
  const dropZone2 = document.getElementById("dropZone2");
  const fileInput1 = document.getElementById("fileInput1");
  const fileInput2 = document.getElementById("fileInput2");

  const fileList = document.getElementById("fileList");
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

  function renderFiles() {
    fileList.innerHTML = "";

    const files = [fileOne, fileTwo].filter(Boolean);
    fileCounter.textContent = `${files.length} file${files.length === 1 ? "" : "s"} selected`;

    files.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "compare-file-card";

      card.innerHTML = `
        <button class="remove-file-btn" type="button">×</button>

        <div class="pdf-thumb-wrap">
          <embed
            src="${file.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
            type="application/pdf"
            class="pdf-thumb"
          />
        </div>

        <h3>${file.name}</h3>
        <span class="file-order-badge">${index + 1}</span>
      `;

      card.querySelector(".remove-file-btn").addEventListener("click", () => {
        if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);

        if (file === fileOne) fileOne = null;
        if (file === fileTwo) fileTwo = null;

        if (!fileOne && !fileTwo) {
          showStart();
        } else {
          renderFiles();
        }
      });

      fileList.appendChild(card);
    });

    if (files.length > 0) {
      resetProgress();
      showPreview();
    } else {
      showStart();
    }
  }

  dropZone1.addEventListener("click", () => fileInput1.click());
  dropZone2.addEventListener("click", () => fileInput2.click());

  fileInput1.addEventListener("change", () => {
    setFile(1, fileInput1.files[0]);
    fileInput1.value = "";
  });

  fileInput2.addEventListener("change", () => {
    setFile(2, fileInput2.files[0]);
    fileInput2.value = "";
  });

  [dropZone1, dropZone2].forEach((zone, index) => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-active");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drag-active");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-active");

      const file = Array.from(e.dataTransfer.files || []).find(isPdf);
      setFile(index + 1, file);
    });
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

      compareBtn.disabled = false;
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
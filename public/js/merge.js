document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");
  const mergeBtn = document.getElementById("mergeBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let filesArray = [];
  let mergedPdfUrl = null;

  function formatFileSize(bytes) {
    if (!bytes) return "0 KB";

    const kb = bytes / 1024;
    if (kb < 1024) return kb.toFixed(1) + " KB";

    return (kb / 1024).toFixed(2) + " MB";
  }

  function addFiles(files) {
    const selectedFiles = Array.from(files).filter((file) => {
      return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    });

    if (selectedFiles.length === 0) {
      alert("Please select PDF files only");
      return;
    }

    filesArray = [...filesArray, ...selectedFiles];
    renderFiles();
  }

  function renderFiles() {
    fileList.innerHTML = "";

    if (filesArray.length === 0) {
      startScreen.style.display = "flex";
      previewScreen.style.display = "none";
      successScreen.style.display = "none";
      return;
    }

    startScreen.style.display = "none";
    previewScreen.style.display = "grid";
    successScreen.style.display = "none";

    fileCounter.textContent =
      filesArray.length === 1
        ? "1 file selected"
        : filesArray.length + " files selected";

    filesArray.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "merge-file-card";

      card.innerHTML = `
        <button class="remove-file-btn" type="button" aria-label="Remove file">×</button>

        <div class="file-card-icon">
          <i class="fa-solid fa-file-pdf"></i>
        </div>

        <h3>${file.name}</h3>
        <p>${formatFileSize(file.size)}</p>

        <span class="file-order-badge">${index + 1}</span>
      `;

      card.querySelector(".remove-file-btn").addEventListener("click", () => {
        filesArray.splice(index, 1);
        renderFiles();
      });

      fileList.appendChild(card);
    });
  }

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  addMoreBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    addFiles(fileInput.files);
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
    addFiles(e.dataTransfer.files);
  });

  mergeBtn.addEventListener("click", async () => {
    if (filesArray.length < 2) {
      alert("Please select at least 2 PDF files");
      return;
    }

    const formData = new FormData();

    filesArray.forEach((file) => {
      formData.append("pdfs", file);
    });

    progressBar.style.width = "20%";
    progressBar.textContent = "20%";
    mergeBtn.disabled = true;
    mergeBtn.innerHTML = `Merging... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
      const response = await fetch("/merge", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Merge failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 1000 || blob.type !== "application/pdf") {
        alert("Merge failed. Please try different PDF files.");
        return;
      }

      progressBar.style.width = "100%";
      progressBar.textContent = "100%";

      if (mergedPdfUrl) {
        window.URL.revokeObjectURL(mergedPdfUrl);
      }

      mergedPdfUrl = window.URL.createObjectURL(blob);

      previewScreen.style.display = "none";
      successScreen.style.display = "flex";

    } catch (error) {
      console.error("MERGE FRONTEND ERROR:", error);
      alert("Merge failed. Please try again.");
    } finally {
      mergeBtn.disabled = false;
      mergeBtn.innerHTML = `Merge PDF <i class="fa-solid fa-arrow-right"></i>`;
    }
  });

  downloadBtn.addEventListener("click", () => {
    if (!mergedPdfUrl) {
      alert("Merged PDF is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = mergedPdfUrl;
    a.download = "merged.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
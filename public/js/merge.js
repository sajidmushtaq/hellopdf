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
  let progressInterval = null;

  startScreen.style.display = "flex";
  previewScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");
  previewScreen.style.display = "none";
  successScreen.style.display = "none";

  function resetProgress() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startFakeProgress() {
    let progress = 20;

    progressBar.style.width = "20%";
    progressBar.textContent = "20%";

    progressInterval = setInterval(() => {
      if (progress < 90) {
        progress += 5;
        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";
      }
    }, 700);
  }

  function completeProgress() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  function addFiles(files) {
    const selectedFiles = Array.from(files).filter((file) => {
      return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    });

    if (selectedFiles.length === 0) {
      alert("Please select PDF files only");
      return;
    }

    selectedFiles.forEach((file) => {
      file.previewUrl = URL.createObjectURL(file);
    });

    filesArray = [...filesArray, ...selectedFiles];
    renderFiles();
  }

  function renderFiles() {
    fileList.innerHTML = "";

    if (filesArray.length === 0) {
      startScreen.style.display = "flex";

      previewScreen.classList.add("hidden-screen");
      successScreen.classList.add("hidden-screen");

      previewScreen.style.display = "none";
      successScreen.style.display = "none";

      resetProgress();
      return;
    }

    startScreen.style.display = "none";

    previewScreen.classList.remove("hidden-screen");
    previewScreen.style.display = "grid";

    successScreen.classList.add("hidden-screen");
    successScreen.style.display = "none";

    fileCounter.textContent =
      filesArray.length === 1
        ? "1 file selected"
        : `${filesArray.length} files selected`;

    filesArray.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "merge-file-card";

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
        if (file.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }

        filesArray.splice(index, 1);
        renderFiles();
      });

      fileList.appendChild(card);
    });
  }

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  addMoreBtn?.addEventListener("click", () => {
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

  mergeBtn?.addEventListener("click", async () => {
    if (filesArray.length < 2) {
      alert("Please select at least 2 PDF files");
      return;
    }

    const formData = new FormData();

filesArray.forEach((file) => {
  formData.append("pdfs", file);
});

// GET LOGGED-IN USER
const { data } = await window.supabaseClient.auth.getUser();

if (!data.user) {
  alert("Please login first");
  window.location.href = "/login.html";
  return;
}

formData.append("user_id", data.user.id);

    startFakeProgress();

    mergeBtn.disabled = true;
    mergeBtn.innerHTML = `
      Merging...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {
      const response = await fetch("/merge", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {

  const errorText = await response.text();

  if (errorText.includes("Daily free limit reached")) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {
      upgradeModal.style.display = "flex";
    }

  } else {

    alert(errorText || "Merge failed");

  }

  return;
}

      const blob = await response.blob();

      if (!blob || blob.size < 1000 || blob.type !== "application/pdf") {
        alert("Merge failed. Please try different PDF files.");
        return;
      }

      completeProgress();

      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
      }

      mergedPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        previewScreen.classList.add("hidden-screen");
        previewScreen.style.display = "none";

        successScreen.classList.remove("hidden-screen");
        successScreen.style.display = "flex";
      }, 400);

    } catch (error) {
      console.error("MERGE ERROR:", error);
      alert("Merge failed. Please try again.");
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      mergeBtn.disabled = false;
      mergeBtn.innerHTML = `
        Merge PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;
    }
  });

  downloadBtn?.addEventListener("click", () => {
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
  const closeUpgradeModal =
  document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

  closeUpgradeModal.addEventListener("click", () => {

    document.getElementById("upgradeModal")
      .style.display = "none";

  });

}
});
document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const fileList = document.getElementById("fileList");
  const fileCounter = document.getElementById("fileCounter");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let previewUrl = null;
  let zipUrl = null;

  function resetProgress() {
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function showStart() {
    startScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("active-screen");
    successScreen.classList.add("hidden-screen");
    successScreen.classList.remove("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showPreview() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("active-screen");
    successScreen.classList.add("hidden-screen");
    successScreen.classList.remove("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showSuccess() {
    startScreen.classList.add("hidden-screen");
    previewScreen.classList.add("hidden-screen");
    previewScreen.classList.remove("active-screen");
    successScreen.classList.remove("hidden-screen");
    successScreen.classList.add("active-screen");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function isPdf(file) {
    return file && (
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf")
    );
  }

  function handleFile(file) {
    if (!isPdf(file)) {
      alert("Please select PDF file only");
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    resetProgress();
    renderFile();
    showPreview();
  }

  function renderFile() {
    fileList.innerHTML = "";
    fileCounter.textContent = "1 file selected";

    const card = document.createElement("div");
    card.className = "pdf-image-file-card";

    card.innerHTML = `
      <button class="remove-file-btn" type="button">×</button>

      <div class="pdf-image-pdf-preview">
        <embed
          src="${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
          type="application/pdf"
          class="pdf-image-pdf-embed"
        />
      </div>

      <h3>${selectedFile.name}</h3>
      <div class="file-order-badge">1</div>
    `;

    card.querySelector(".remove-file-btn").addEventListener("click", () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      selectedFile = null;
      previewUrl = null;
      fileList.innerHTML = "";
      showStart();
    });

    fileList.appendChild(card);
  }

  dropZone.addEventListener("click", () => fileInput.click());
  addMoreBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
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
    handleFile(e.dataTransfer.files[0]);
  });

  convertBtn.addEventListener("click", async () => {

  if (!selectedFile) {
    alert("Please select PDF file first");
    return;
  }

  const { data } = await window.supabaseClient.auth.getUser();

  if (!data?.user) {
    alert("Please login first");
    return;
  }

  const formData = new FormData();
  formData.append("pdf", selectedFile);
  formData.append("user_id", data.user.id);

  convertBtn.disabled = true;
  convertBtn.innerHTML =
    `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

  progressBar.style.width = "15%";
  progressBar.textContent = "15%";

  let progress = 15;

  const progressInterval = setInterval(() => {

    if (progress < 90) {

      progress += 5;

      progressBar.style.width = progress + "%";
      progressBar.textContent = progress + "%";

    }

  }, 500);

  try {

    const response = await fetch("/pdf-to-image", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {

      clearInterval(progressInterval);

      const errorText = await response.text();

      if (errorText.includes("Daily free limit reached")) {

        const upgradeModal =
          document.getElementById("upgradeModal");

        if (upgradeModal) {
          upgradeModal.style.display = "flex";
        }

        convertBtn.disabled = false;
        convertBtn.innerHTML = "Convert to Images";

        return;
      }

      throw new Error(errorText || "Conversion failed");
    }

    const blob = await response.blob();

    if (!blob || blob.size < 100) {
      throw new Error("Conversion failed");
    }

    if (zipUrl) {
      URL.revokeObjectURL(zipUrl);
    }

    zipUrl = URL.createObjectURL(blob);

    clearInterval(progressInterval);

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";

    setTimeout(() => {

      showSuccess();

    }, 400);

  } catch (error) {

    clearInterval(progressInterval);

    console.error(error);

    alert(error.message || "Conversion failed");

  } finally {

    convertBtn.disabled = false;

    convertBtn.innerHTML =
      "Convert to Images";

  }

});

  const closeUpgradeModal =
  document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

  closeUpgradeModal.addEventListener("click", () => {

    document.getElementById("upgradeModal")
      .style.display = "none";

  });

}

  showStart();
});
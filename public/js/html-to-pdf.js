document.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("startScreen");
  const previewScreen = document.getElementById("previewScreen");
  const successScreen = document.getElementById("successScreen");

  const htmlCode = document.getElementById("htmlCode");
  const continueBtn = document.getElementById("continueBtn");
  const editBtn = document.getElementById("editBtn");
  const fileList = document.getElementById("fileList");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let convertedPdfUrl = null;
  let progressInterval = null;

  startScreen.style.display = "flex";
  previewScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");
  previewScreen.style.display = "none";
  successScreen.style.display = "none";

  function resetProgress() {
    if (progressInterval) clearInterval(progressInterval);
    progressInterval = null;
    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startFakeProgress() {
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

  function renderPreview() {
    const code = htmlCode.value.trim();

    fileList.innerHTML = "";

    const card = document.createElement("div");
    card.className = "html-pdf-file-card";

    card.innerHTML = `
      <div class="html-file-preview">
        <i class="fa-solid fa-code"></i>
        <span>HTML</span>
      </div>

      <h3>HTML code preview</h3>
      <p>${code.length} characters</p>

      <span class="file-order-badge">1</span>
    `;

    fileList.appendChild(card);
  }

  continueBtn?.addEventListener("click", () => {
    if (!htmlCode.value.trim()) {
      alert("Please paste HTML code first");
      return;
    }

    renderPreview();

    startScreen.style.display = "none";
    previewScreen.classList.remove("hidden-screen");
    previewScreen.style.display = "grid";
    successScreen.classList.add("hidden-screen");
    successScreen.style.display = "none";
    resetProgress();
  });

  editBtn?.addEventListener("click", () => {
    previewScreen.classList.add("hidden-screen");
    previewScreen.style.display = "none";
    successScreen.classList.add("hidden-screen");
    successScreen.style.display = "none";
    startScreen.style.display = "flex";
    resetProgress();
  });

  convertBtn?.addEventListener("click", async () => {
    const code = htmlCode.value.trim();

    if (!code) {
      alert("Please paste HTML code first");
      return;
    }

    const formData = new URLSearchParams();
    formData.append("htmlCode", code);

    resetProgress();
    startFakeProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `
      Converting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {
      const response = await fetch("/html-to-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "HTML to PDF conversion failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 100 || blob.type !== "application/pdf") {
        alert("Conversion failed. Please try different HTML code.");
        return;
      }

      completeProgress();

      if (convertedPdfUrl) URL.revokeObjectURL(convertedPdfUrl);
      convertedPdfUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        previewScreen.classList.add("hidden-screen");
        previewScreen.style.display = "none";
        successScreen.classList.remove("hidden-screen");
        successScreen.style.display = "flex";
      }, 400);

    } catch (error) {
      console.error("HTML TO PDF ERROR:", error);
      alert("Conversion failed. Please try again.");
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      progressInterval = null;

      convertBtn.disabled = false;
      convertBtn.innerHTML = `
        Convert to PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;
    }
  });

  downloadBtn?.addEventListener("click", () => {
    if (!convertedPdfUrl) {
      alert("PDF file is not ready yet");
      return;
    }

    const a = document.createElement("a");
    a.href = convertedPdfUrl;
    a.download = "html-to-pdf.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  });
});
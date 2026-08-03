pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

document.addEventListener("DOMContentLoaded", () => {
    /* DRAWERS + USER FRAMEWORK */

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

  const pdfInput = document.getElementById("translatePdfInput");
  const selectBtn = document.getElementById("translateSelectBtn");

  const popup = document.getElementById("translateSettingsPopup");
  const continueBtn = document.getElementById("continueTranslateBtn");

  const startScreen = document.getElementById("translateStartScreen");
  const editor = document.getElementById("translateEditor");

  const canvas = document.getElementById("translatePdfCanvas");

  const translatedTextBox = document.getElementById("translatedTextBox");

  const copyBtn = document.getElementById("copyTranslatedBtn");
  const downloadBtn = document.getElementById("downloadTranslatedBtn");

  const fromLang = document.getElementById("translateFromLang");
  const toLang = document.getElementById("translateToLang");
  const translationLanguageIndicator =
document.getElementById(
  "translationLanguageIndicator"
);

function updateTranslationIndicator() {

  const fromText =
    fromLang.options[fromLang.selectedIndex].text;

  const toText =
    toLang.options[toLang.selectedIndex].text;

  translationLanguageIndicator.textContent =
    `${fromText} → ${toText}`;
}

if (translationLanguageIndicator && fromLang && toLang) {

  updateTranslationIndicator();

  fromLang.addEventListener("change", () => {

  if (fromLang.value === "english") {
    toLang.value = "urdu";
  }

  if (fromLang.value === "urdu") {
    toLang.value = "english";
  }

  updateTranslationIndicator();

});

toLang.addEventListener("change", () => {

  if (toLang.value === "english") {
    fromLang.value = "urdu";
  }

  if (toLang.value === "urdu") {
    fromLang.value = "english";
  }

  updateTranslationIndicator();

});

}

  const prevBtn = document.getElementById("translatePrevPage");
  const nextBtn = document.getElementById("translateNextPage");

  const pageNumber = document.getElementById("translatePageNumber");
  const totalPages = document.getElementById("translateTotalPages");

  const fileName = document.getElementById("translateFileName");

  let selectedPdf = null;
  let pdfDoc = null;
  let currentPage = 1;

  selectBtn.addEventListener("click", () => {
    pdfInput.click();
  });

  pdfInput.addEventListener("change", () => {

    if (!pdfInput.files[0]) return;

    selectedPdf = pdfInput.files[0];

    popup.classList.remove("hidden-screen");

  });

  document.querySelectorAll(".translate-mode-btn").forEach(btn => {

    btn.addEventListener("click", () => {

      if (btn.classList.contains("locked")) {

        alert("AI Translation available in upgrade plan.");

        return;
      }

      document.querySelectorAll(".translate-mode-btn").forEach(b => {
        b.classList.remove("active");
      });

      btn.classList.add("active");

    });

  });

  continueBtn.addEventListener("click", async () => {
    if (fromLang.value === toLang.value) {

  alert("Please select two different languages.");

  return;
}

    popup.classList.add("hidden-screen");

    startScreen.classList.add("hidden-screen");

    editor.classList.remove("hidden-screen");

    fileName.textContent = selectedPdf.name;

    await loadPdf();

    await translatePdf();

  });

  async function loadPdf() {

    const fileData = await selectedPdf.arrayBuffer();

    pdfDoc = await pdfjsLib.getDocument({
      data: fileData
    }).promise;

    totalPages.textContent = `/ ${pdfDoc.numPages}`;

    currentPage = 1;

    await renderPage(currentPage);

  }

  async function renderPage(pageNum) {

    const page = await pdfDoc.getPage(pageNum);

    const viewport = page.getViewport({
      scale: window.innerWidth <= 980 ? 0.8 : 1.35
    });

    const ctx = canvas.getContext("2d");

    canvas.width = viewport.width;

    canvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    pageNumber.value = pageNum;

  }

  prevBtn.addEventListener("click", async () => {

    currentPage = Math.max(1, currentPage - 1);

    await renderPage(currentPage);

  });

  nextBtn.addEventListener("click", async () => {

    currentPage = Math.min(pdfDoc.numPages, currentPage + 1);

    await renderPage(currentPage);

  });

  async function translatePdf() {

    translatedTextBox.innerHTML = `
      <div class="translate-loading">
        Translating PDF...
      </div>
    `;

    const formData = new FormData();
if (currentUser) {

  formData.append(
    "user_id",
    currentUser.id
  );

}
    formData.append("file", selectedPdf);

    formData.append("fromLang", fromLang.value);

    formData.append("toLang", toLang.value);

    try {

      const res = await fetch("/translate-pdf", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {

  const text = await res.text();

  if (res.status === 403) {

    const upgradeModal =
      document.getElementById("upgradeModal");

    if (upgradeModal) {
      upgradeModal.style.display = "flex";
    }

    throw new Error("");

  }

  throw new Error(
    text || "PDF translation failed"
  );
}

      const data = await res.json();

      translatedTextBox.innerHTML = `
        <div class="translated-content">
          ${data.translated
            .split("\n")
            .map(line => `<p>${line}</p>`)
            .join("")}
        </div>
      `;

    } catch (err) {

      translatedTextBox.innerHTML = `
        <div class="translate-error">
          ${err.message}
        </div>
      `;

    }

  }

  copyBtn.addEventListener("click", async () => {

    await navigator.clipboard.writeText(
      translatedTextBox.innerText
    );

    alert("Translated text copied.");

  });

  downloadBtn.addEventListener("click", async () => {

  const translatedText =
    translatedTextBox.innerText.trim();

  if (!translatedText) {

    alert("No translated text available.");

    return;
  }

  const originalButtonText =
    downloadBtn.textContent;

  try {

    downloadBtn.disabled = true;
    downloadBtn.textContent = "Preparing PDF...";

    const response = await fetch(
      "/download-translated-pdf",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          translatedText: translatedText,
          targetLanguage: toLang.value
        })
      }
    );

    if (!response.ok) {

      const errorText =
        await response.text();

      throw new Error(
        errorText ||
        "Failed to generate translated PDF"
      );
    }

    const pdfBlob =
      await response.blob();

    const url =
      URL.createObjectURL(pdfBlob);

    const a =
      document.createElement("a");

    a.href = url;

    a.download =
      "translated-document.pdf";

    document.body.appendChild(a);

    a.click();

    a.remove();

    URL.revokeObjectURL(url);

  } catch (error) {

    console.error(
      "PDF DOWNLOAD ERROR =",
      error
    );

    alert(
      "Failed to download translated PDF."
    );

  } finally {

    downloadBtn.disabled = false;

    downloadBtn.textContent =
      originalButtonText;
  }

});
    /* MOBILE DRAWERS */

  function closeDrawers() {

    if (toolsDrawer) {
      toolsDrawer.classList.remove("active");
    }

    if (mainDrawer) {
      mainDrawer.classList.remove("active");
    }

    if (drawerOverlay) {
      drawerOverlay.classList.remove("active");
    }

  }

  if (toolsMenuBtn) {

    toolsMenuBtn.addEventListener("click", () => {

      if (toolsDrawer) {
        toolsDrawer.classList.add("active");
      }

      if (drawerOverlay) {
        drawerOverlay.classList.add("active");
      }

    });

  }

  if (mainMenuBtn) {

    mainMenuBtn.addEventListener("click", () => {

      if (mainDrawer) {
        mainDrawer.classList.add("active");
      }

      if (drawerOverlay) {
        drawerOverlay.classList.add("active");
      }

    });

  }

  if (toolsClose) {
    toolsClose.addEventListener("click", closeDrawers);
  }

  if (mainClose) {
    mainClose.addEventListener("click", closeDrawers);
  }

  if (drawerOverlay) {
    drawerOverlay.addEventListener("click", closeDrawers);
  }
  if (closeUpgradeModal) {

    closeUpgradeModal.addEventListener("click", () => {

      const upgradeModal =
        document.getElementById("upgradeModal");

      if (upgradeModal) {
        upgradeModal.style.display = "none";
      }

    });

  }
});
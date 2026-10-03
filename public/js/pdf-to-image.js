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

  /* =========================================================
   PDF TO IMAGE — JS STEP 1
   MULTI-PDF SELECTION + PREVIEW
========================================================= */

let selectedFiles = [];
let previewUrls = [];
let zipUrl = null;


/* =========================================================
   RESET PROGRESS
========================================================= */

function resetProgress() {

  progressBar.style.width = "0%";
  progressBar.textContent = "0%";

}


/* =========================================================
   SCREEN FUNCTIONS
========================================================= */

function showStart() {

  startScreen.classList.remove("hidden-screen");
  previewScreen.classList.add("hidden-screen");
  successScreen.classList.add("hidden-screen");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function showPreview() {

  startScreen.classList.add("hidden-screen");
  previewScreen.classList.remove("hidden-screen");
  successScreen.classList.add("hidden-screen");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


function showSuccess() {

  startScreen.classList.add("hidden-screen");
  previewScreen.classList.add("hidden-screen");
  successScreen.classList.remove("hidden-screen");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

}


/* =========================================================
   PDF VALIDATION
========================================================= */

function isPdf(file) {

  return file && (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );

}


/* =========================================================
   ADD PDF FILES
========================================================= */

function addPdfFiles(files, replaceExisting = false) {

  const incomingFiles = Array.from(files || []);

  if (!incomingFiles.length) {
    return;
  }


  /* -----------------------------------------
     Validate all selected files
  ----------------------------------------- */

  const validFiles = [];

  for (const file of incomingFiles) {

    if (!isPdf(file)) {

      alert(
        `"${file.name}" is not a PDF file.`
      );

      continue;
    }

    validFiles.push(file);

  }


  if (!validFiles.length) {
  return;
}


/* -----------------------------------------
   FREE/PREMIUM PDF LIMIT
   FRONTEND SAFETY CHECK
----------------------------------------- */

const FREE_PDF_LIMIT = 10;
const PREMIUM_PDF_LIMIT = 50;


/*
   Premium status frontend par
   assume nahi karna.
   Server final verification karega.

   Filhaal normal selection ko
   50 PDFs se upar jane se rok rahe hain.
*/

const maximumAllowedPdfs = PREMIUM_PDF_LIMIT;


/* -----------------------------------------
   CHECK TOTAL PDF COUNT
----------------------------------------- */

const totalPdfs = replaceExisting
  ? validFiles.length
  : selectedFiles.length + validFiles.length;


if (totalPdfs > maximumAllowedPdfs) {

  alert(
    `You can add a maximum of ${maximumAllowedPdfs} PDF files at a time.`
  );

  fileInput.value = "";

  return;
}


/* -----------------------------------------
   Replace existing files
   Used by first Select PDF action
----------------------------------------- */

  if (replaceExisting) {

    previewUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    selectedFiles = [];
    previewUrls = [];

  }


  /* -----------------------------------------
     Add new PDFs
  ----------------------------------------- */

  validFiles.forEach((file) => {

    selectedFiles.push(file);

    const url = URL.createObjectURL(file);

    previewUrls.push(url);

  });


  resetProgress();

  renderFiles();

  showPreview();

}


/* =========================================================
   RENDER ALL PDF CARDS
========================================================= */

function renderFiles() {

  fileList.innerHTML = "";


  const count = selectedFiles.length;


  if (count === 0) {

    fileCounter.textContent =
      "0 files selected";

    return;

  }


  fileCounter.textContent =
    count === 1
      ? "1 file selected"
      : `${count} files selected`;


  selectedFiles.forEach((file, index) => {

    const card =
      document.createElement("div");

    card.className =
      "pdf-image-file-card";


    card.innerHTML = `

      <button
        class="remove-file-btn"
        type="button"
        aria-label="Remove PDF"
      >
        ×
      </button>

      <div class="pdf-image-pdf-preview">

        <embed
          src="${previewUrls[index]}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
          type="application/pdf"
          class="pdf-image-pdf-embed"
        />

      </div>

      <h3></h3>

      <div class="file-order-badge">
        ${index + 1}
      </div>

    `;


    /* -----------------------------------------
       File name
    ----------------------------------------- */

    const fileName =
      card.querySelector("h3");

    fileName.textContent =
      file.name;


    /* -----------------------------------------
       Remove individual PDF
    ----------------------------------------- */

    card
      .querySelector(".remove-file-btn")
      .addEventListener("click", () => {

        if (previewUrls[index]) {

          URL.revokeObjectURL(
            previewUrls[index]
          );

        }


        selectedFiles.splice(index, 1);

        previewUrls.splice(index, 1);


        renderFiles();


        if (selectedFiles.length === 0) {

          showStart();

          return;

        }

      });


    fileList.appendChild(card);

  });

}


/* =========================================================
   SELECT PDF BUTTON
   FIRST SELECTION = REPLACE
========================================================= */

const selectPdfButton =
  dropZone.querySelector(
    ".master-tool-button, .pdf-image-select-btn"
  );


if (selectPdfButton) {

  selectPdfButton.addEventListener(
    "click",
    (e) => {

      e.preventDefault();
      e.stopPropagation();

      fileInput.click();

    }
  );

}


/* =========================================================
   ADD MORE PDF
   ADDITIONAL SELECTION = APPEND
========================================================= */

addMoreBtn.addEventListener(
  "click",
  (e) => {

    e.preventDefault();
    e.stopPropagation();

    fileInput.click();

  }
);


/* =========================================================
   FILE INPUT CHANGE
========================================================= */

fileInput.addEventListener(
  "change",
  (e) => {

    const files =
      Array.from(
        e.target.files || []
      );


    if (!files.length) {
      return;
    }


    /*
      If no PDF is currently selected,
      this is the first selection.

      Otherwise append as Add More.
    */

    const replaceExisting =
      selectedFiles.length === 0;


    addPdfFiles(
      files,
      replaceExisting
    );


    /*
      Allow selecting the same PDF
      again later.
    */

    fileInput.value = "";

  }
);


/* =========================================================
   DRAG OVER
========================================================= */

dropZone.addEventListener(
  "dragover",
  (e) => {

    e.preventDefault();

    dropZone.classList.add(
      "drag-active"
    );

  }
);


/* =========================================================
   DRAG LEAVE
========================================================= */

dropZone.addEventListener(
  "dragleave",
  () => {

    dropZone.classList.remove(
      "drag-active"
    );

  }
);


/* =========================================================
   DROP MULTIPLE PDFs
========================================================= */

dropZone.addEventListener(
  "drop",
  (e) => {

    e.preventDefault();

    dropZone.classList.remove(
      "drag-active"
    );


    const files =
      Array.from(
        e.dataTransfer.files || []
      );


    if (!files.length) {
      return;
    }


    const replaceExisting =
      selectedFiles.length === 0;


    addPdfFiles(
      files,
      replaceExisting
    );

  }
);

  convertBtn.addEventListener("click", async () => {

  if (!selectedFiles.length) {
    alert("Please select PDF file first");
    return;
  }

  /* =========================
     LOGIN CHECK
  ========================= */

  const { data } =
    await window.supabaseClient.auth.getUser();

  if (!data?.user) {
    alert("Please login first");
    return;
  }

  /* =========================
   SEND ALL SELECTED PDFs
========================= */

const formData = new FormData();


selectedFiles.forEach((file) => {
  formData.append("pdf", file);
});


formData.append("user_id", data.user.id);

  /* =========================
     BUTTON + PROGRESS
  ========================= */

  convertBtn.disabled = true;

  convertBtn.innerHTML =
    `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

  progressBar.style.width = "15%";
  progressBar.textContent = "15%";

  let progress = 15;

  const progressInterval = setInterval(() => {

    if (progress < 90) {

      progress += 5;

      progressBar.style.width =
        progress + "%";

      progressBar.textContent =
        progress + "%";
    }

  }, 500);

  try {

    /* =========================
       SEND PDF TO SERVER
    ========================= */

    const response = await fetch(
      "/pdf-to-image",
      {
        method: "POST",
        body: formData
      }
    );

    /* =========================
       ERROR HANDLING
    ========================= */

    if (!response.ok) {

      clearInterval(progressInterval);

      const errorText =
        await response.text();

      /* FREE DAILY LIMIT */

      if (
        errorText.includes(
          "Daily free limit reached"
        )
      ) {

        const upgradeModal =
          document.getElementById(
            "upgradeModal"
          );

        if (upgradeModal) {

          upgradeModal.style.display =
            "flex";
        }

        progressBar.style.width = "0%";
        progressBar.textContent = "0%";

        convertBtn.disabled = false;

        convertBtn.innerHTML =
          "Convert to Images";

        return;
      }

      throw new Error(
        errorText ||
        "PDF to Image conversion failed"
      );
    }

    /* =========================
       GET ZIP FILE
    ========================= */

    const blob =
      await response.blob();

    if (!blob || blob.size < 100) {

      throw new Error(
        "PDF to Image conversion failed"
      );
    }

    /* =========================
       CREATE DOWNLOAD URL
    ========================= */

    if (zipUrl) {
      URL.revokeObjectURL(zipUrl);
    }

    zipUrl =
      URL.createObjectURL(blob);

    /* =========================
       COMPLETE PROGRESS
    ========================= */

    clearInterval(progressInterval);

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";

    /* =========================
       SHOW SUCCESS SCREEN
    ========================= */

    setTimeout(() => {

      showSuccess();

    }, 400);

  } catch (error) {

    clearInterval(progressInterval);

    console.error(error);

    alert(
      error.message ||
      "PDF to Image conversion failed"
    );

  } finally {

    convertBtn.disabled = false;

    convertBtn.innerHTML =
      "Convert to Images";
  }

});

/* =========================================================
   PDF TO IMAGE — DOWNLOAD ZIP
========================================================= */

downloadBtn.addEventListener("click", () => {

  if (!zipUrl) {

    alert("ZIP file is not ready yet");

    return;
  }


  const a = document.createElement("a");

  a.href = zipUrl;

  a.download = "pdf-images.zip";

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

  showStart();
});
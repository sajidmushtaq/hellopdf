document.addEventListener("DOMContentLoaded", () => {

  const splitStartScreen = document.getElementById("splitStartScreen");
  const splitPreviewScreen = document.getElementById("splitPreviewScreen");
  const splitSuccessScreen = document.getElementById("splitSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  const fileList = document.getElementById("fileList");

  const splitBtn = document.getElementById("splitBtn");
  const progressBar = document.getElementById("progressBar");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFile = null;
  let splitZipUrl = null;
  let progressInterval = null;
    /* =========================
     SPLIT RANGE SETTINGS
  ========================= */

  const rangeContainer = document.querySelector(
    '.split-sub-panel[data-split-panel="custom"]'
  );

  const addRangeBtn = rangeContainer?.querySelector(
    ".split-add-range-btn"
  );

  const rangeCounter = document.getElementById(
    "splitRangeCounter"
  );

  function getRangeRows() {
    return Array.from(
      rangeContainer?.querySelectorAll(".split-range-row") || []
    );
  }

  function updateRangeCounter() {
    const count = getRangeRows().length;

    if (rangeCounter) {
      rangeCounter.textContent = `${count} / 3`;
    }
  }

  addRangeBtn?.addEventListener("click", () => {

    const rows = getRangeRows();

    if (rows.length >= 3) {
      alert(
        "Free users can create up to 3 ranges. Upgrade to Premium for unlimited ranges."
      );
      return;
    }

    const row = document.createElement("div");

    row.className = "split-range-row";

    row.innerHTML = `
      <input
        type="number"
        min="1"
        placeholder="From"
      >

      <span>–</span>

      <input
        type="number"
        min="1"
        placeholder="To"
      >

      <button
        type="button"
        class="split-remove-range-btn"
        aria-label="Remove range"
      >
        ×
      </button>
    `;

    rangeContainer.insertBefore(
      row,
      addRangeBtn
    );

    const removeBtn = row.querySelector(
      ".split-remove-range-btn"
    );

    removeBtn.addEventListener("click", () => {
      row.remove();
      updateRangeCounter();
    });

    updateRangeCounter();
  });

  /* =========================
     INITIAL STATE
  ========================= */

  splitStartScreen.style.display = "flex";

  splitPreviewScreen.classList.add("hidden-screen");
  splitSuccessScreen.classList.add("hidden-screen");

  splitPreviewScreen.style.display = "none";
  splitSuccessScreen.style.display = "none";

  /* =========================
     DROP ZONE CLICK
  ========================= */

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  /* =========================
     FILE SELECT
  ========================= */

  fileInput.addEventListener("change", (e) => {

    const file = e.target.files[0];

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a PDF file");
      return;
    }

    selectedFile = file;

    selectedFile.previewUrl = URL.createObjectURL(file);

    renderPreview();

  });

  /* =========================
     DRAG DROP
  ========================= */

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

    if (!file) return;

    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      alert("Please select a PDF file");
      return;
    }

    selectedFile = file;

    selectedFile.previewUrl = URL.createObjectURL(file);

    renderPreview();

  });

  /* =========================
     PREVIEW
  ========================= */

  function renderPreview() {

    if (!selectedFile) return;

    splitStartScreen.style.display = "none";

    splitPreviewScreen.classList.remove("hidden-screen");
    splitPreviewScreen.style.display = "grid";

    splitSuccessScreen.classList.add("hidden-screen");
    splitSuccessScreen.style.display = "none";

    fileList.innerHTML = `
      <div class="merge-file-card split-pdf-card">

        <button class="remove-file-btn" id="removeSelectedFile" type="button">
          ×
        </button>

        <div class="pdf-thumb-wrap">
          <embed
            src="${selectedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=1&page=1&view=FitH"
            type="application/pdf"
            class="pdf-thumb"
          />
        </div>

        <h3>${selectedFile.name}</h3>

        <span class="file-order-badge">1</span>

      </div>
    `;

    const removeBtn = document.getElementById("removeSelectedFile");

    removeBtn.addEventListener("click", () => {

      if (selectedFile.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }

      selectedFile = null;

      fileList.innerHTML = "";

      splitStartScreen.style.display = "flex";

      splitPreviewScreen.classList.add("hidden-screen");
      splitPreviewScreen.style.display = "none";

      splitSuccessScreen.classList.add("hidden-screen");
      splitSuccessScreen.style.display = "none";

      resetProgress();

    });

  }

  /* =========================
     PROGRESS
  ========================= */

  function resetProgress() {

    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "0%";
    progressBar.textContent = "0%";
  }

  function startFakeProgress() {

    let progress = 18;

    progressBar.style.width = "18%";
    progressBar.textContent = "18%";

    progressInterval = setInterval(() => {

      if (progress < 90) {

        progress += 5;

        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";

      }

    }, 650);

  }

  function completeProgress() {

    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";

  }

  /* =========================
     SPLIT PDF
  ========================= */

  splitBtn?.addEventListener("click", async () => {

    if (!selectedFile) {

      alert("Please select a PDF file");

      return;
    }

    /* =========================================================
   SPLIT MASTER UI — COLLECT SELECTED OPTIONS
========================================================= */

const activeModeTab =
  document.querySelector(".split-mode-tab.active");

const splitMode =
  activeModeTab?.dataset.mode || "range";

let splitOptions = {
  mode: splitMode
};

/* RANGE */
if (splitMode === "range") {

  const activeRangeTab =
    document.querySelector(".split-sub-tab.active");

  const rangeType =
    activeRangeTab?.dataset.splitType || "custom";

  splitOptions.rangeType = rangeType;

  /* CUSTOM */
  if (rangeType === "custom") {

    const ranges = [];

    document
      .querySelectorAll(
        '.split-sub-panel[data-split-panel="custom"] .split-range-row'
      )
      .forEach((row) => {

        const inputs = row.querySelectorAll("input");

        const from = Number(inputs[0]?.value);
        const to = Number(inputs[1]?.value);

        if (from && to && from <= to) {
          ranges.push({
            from,
            to
          });
        }

      });

    splitOptions.ranges = ranges;
  }

  /* FIXED */
  if (rangeType === "fixed") {

    const fixedInput =
      document.querySelector(
        '.split-sub-panel[data-split-panel="fixed"] input'
      );

    splitOptions.fixedPages =
      Number(fixedInput?.value) || 5;
  }

  /* SMART */
  if (rangeType === "smart") {

    splitOptions.smart = true;
  }
}

/* PAGES */
if (splitMode === "pages") {

  const selectedPageMode =
    document.querySelector(
      'input[name="pageMode"]:checked'
    );

  splitOptions.pageMode =
    selectedPageMode?.value || "all";
}

/* SIZE */
if (splitMode === "size") {

  const sizeInput =
    document.getElementById("splitMaxSize");

  splitOptions.maxSize =
    Number(sizeInput?.value) || 10;
}

console.log(
  "SPLIT OPTIONS =",
  splitOptions
);

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    const { data, error } = await supabaseClient.auth.getUser();

console.log("SPLIT AUTH DATA =", data);
console.log("SPLIT AUTH ERROR =", error);

if (!data?.user) {
  alert("Please login first");
  return;
}

console.log("SPLIT LOGGED USER =", data.user.id);
formData.append("user_id", data.user.id);

/* SPLIT MASTER — SEND SELECTED OPTIONS */

formData.append(
  "split_mode",
  splitOptions.mode
);

formData.append(
  "range_type",
  splitOptions.rangeType || ""
);

formData.append(
  "ranges",
  JSON.stringify(
    splitOptions.ranges || []
  )
);

formData.append(
  "fixed_pages",
  splitOptions.fixedPages || ""
);

formData.append(
  "page_mode",
  splitOptions.pageMode || ""
);

formData.append(
  "max_size",
  splitOptions.maxSize || ""
);
    startFakeProgress();

    splitBtn.disabled = true;

    splitBtn.innerHTML = `
      Splitting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try {

      const response = await fetch("/split", {
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

    alert(errorText || "Split failed");

  }

  return;
}

      const blob = await response.blob();

      if (!blob || blob.size < 100) {

        alert("Split failed");

        return;
      }

      completeProgress();

      if (splitZipUrl) {
        URL.revokeObjectURL(splitZipUrl);
      }

      splitZipUrl = URL.createObjectURL(blob);

      setTimeout(() => {

  /* Hide start screen */
  splitStartScreen.classList.add("hidden-screen");
  splitStartScreen.style.display = "none";

  /* Hide preview screen */
  splitPreviewScreen.classList.add("hidden-screen");
  splitPreviewScreen.style.display = "none";

  /* Show success screen */
  splitSuccessScreen.classList.remove("hidden-screen");
  splitSuccessScreen.style.display = "flex";

}, 400);

    } catch (error) {

      console.error("SPLIT ERROR:", error);

      alert("Split failed. Please try again.");

    } finally {

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      splitBtn.disabled = false;

      splitBtn.innerHTML = `
        Split PDF
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* =========================
     DOWNLOAD
  ========================= */

  downloadBtn?.addEventListener("click", () => {

    if (!splitZipUrl) {

      alert("Split file not ready yet");

      return;
    }

    const a = document.createElement("a");

    a.href = splitZipUrl;

    a.download = "split.zip";

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
/* =========================================================
   SMART SPLIT — PREMIUM BUTTON + DIRECT REQUEST
========================================================= */

const smartSplitBtn =
  document.getElementById("smartSplitBtn");

smartSplitBtn?.addEventListener("click", async () => {

  let originalSmartButton = null;

  if (!selectedFile) {
    alert("Please select a PDF file");
    return;
  }

  try {

    const { data, error } =
      await supabaseClient.auth.getUser();

    if (error || !data?.user) {
      alert("Please login first.");
      return;
    }

    const userId = data.user.id;

    const {
      data: profileData,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select("is_premium")
        .eq("id", userId)
        .single();

    if (profileError) {

      console.error(
        "SMART PREMIUM CHECK ERROR =",
        profileError
      );

      alert(
        "Unable to verify Premium account."
      );

      return;
    }

    const isPremium =
      profileData?.is_premium || false;

    if (!isPremium) {

      window.location.href =
        "/pricing.html";

      return;
    }

    console.log(
      "SMART PREMIUM VERIFIED"
    );

    const formData =
      new FormData();

    formData.append(
      "pdf",
      selectedFile
    );

    formData.append(
      "user_id",
      userId
    );

    formData.append(
      "split_mode",
      "range"
    );

    formData.append(
      "range_type",
      "smart"
    );

    formData.append(
      "ranges",
      "[]"
    );

    formData.append(
      "fixed_pages",
      ""
    );

    formData.append(
      "page_mode",
      ""
    );

    formData.append(
      "max_size",
      ""
    );

    console.log(
      "SMART SPLIT REQUEST STARTED"
    );

    startFakeProgress();

    smartSplitBtn.disabled = true;

    originalSmartButton =
      smartSplitBtn.innerHTML;

    smartSplitBtn.innerHTML = `
      Analyzing...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    const response =
      await fetch("/split", {
        method: "POST",
        body: formData
      });

    if (!response.ok) {

      const errorText =
        await response.text();

      console.error(
        "SMART SERVER ERROR =",
        errorText
      );

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

      } else {

        alert(
          errorText ||
          "Smart Split failed"
        );

      }

      return;
    }

    const blob =
      await response.blob();

    if (
      !blob ||
      blob.size < 100
    ) {

      alert(
        "Smart Split failed"
      );

      return;
    }

    completeProgress();

    if (splitZipUrl) {

      URL.revokeObjectURL(
        splitZipUrl
      );

    }

    splitZipUrl =
      URL.createObjectURL(
        blob
      );

    setTimeout(() => {

      splitStartScreen
        .classList
        .add("hidden-screen");

      splitStartScreen.style.display =
        "none";

      splitPreviewScreen
        .classList
        .add("hidden-screen");

      splitPreviewScreen.style.display =
        "none";

      splitSuccessScreen
        .classList
        .remove("hidden-screen");

      splitSuccessScreen.style.display =
        "flex";

    }, 400);

  } catch (error) {

    console.error(
      "SMART SPLIT ERROR =",
      error
    );

    alert(
      "Smart Split failed. Please try again."
    );

  } finally {

    if (progressInterval) {

      clearInterval(
        progressInterval
      );

      progressInterval = null;
    }

    smartSplitBtn.disabled =
      false;

    smartSplitBtn.innerHTML =
      originalSmartButton ||
      `
        <i class="fa-solid fa-wand-magic-sparkles"></i>
        Analyze PDF
      `;

  }

});
});

/* =========================================================
   SPLIT MASTER UI — MAIN MODE TABS
========================================================= */

document.querySelectorAll(".split-mode-tab").forEach((tab) => {

  tab.addEventListener("click", () => {

    const mode = tab.dataset.mode;

    document.querySelectorAll(".split-mode-tab")
      .forEach((item) => item.classList.remove("active"));

    tab.classList.add("active");

    document.querySelectorAll(".split-mode-panel")
      .forEach((panel) => {

        panel.classList.toggle(
          "active",
          panel.dataset.panel === mode
        );

      });

  });

});

/* =========================================================
   SPLIT MASTER UI — RANGE SUB TABS
========================================================= */

document.querySelectorAll(".split-sub-tab").forEach((tab) => {

  tab.addEventListener("click", () => {

    const type = tab.dataset.splitType;

    document.querySelectorAll(".split-sub-tab")
      .forEach((item) => item.classList.remove("active"));

    tab.classList.add("active");

    document.querySelectorAll(".split-sub-panel")
      .forEach((panel) => {

        panel.classList.toggle(
          "active",
          panel.dataset.splitPanel === type
        );

      });

  });

});

/* =========================================================
   SPLIT MASTER UI — SMART PREMIUM GATE
========================================================= */

document.querySelectorAll(
  '.split-sub-tab[data-split-type="smart"]'
).forEach((smartTab) => {

  smartTab.addEventListener("click", (event) => {

    event.preventDefault();

    const smartPanel =
      document.querySelector(
        '.split-sub-panel[data-split-panel="smart"]'
      );

    document.querySelectorAll(".split-sub-tab")
      .forEach((item) => item.classList.remove("active"));

    smartTab.classList.add("active");

    document.querySelectorAll(".split-sub-panel")
      .forEach((panel) => panel.classList.remove("active"));

    if (smartPanel) {
      smartPanel.classList.add("active");
    }

  });

});


/* =========================================================
   SPLIT MASTER UI — ADD RANGE
========================================================= */

const addRangeBtn =
  document.querySelector(".split-add-range-btn");

const customRangePanel =
  document.querySelector(
    '.split-sub-panel[data-split-panel="custom"]'
  );

if (addRangeBtn && customRangePanel) {

  addRangeBtn.addEventListener("click", () => {

    const existingRanges =
      customRangePanel.querySelectorAll(
        ".split-range-row"
      );

    if (existingRanges.length >= 3) {

      alert(
        "Free users can create up to 3 ranges. Upgrade to Premium for unlimited ranges."
      );

      return;
    }

    const rangeRow =
      document.createElement("div");

    rangeRow.className = "split-range-row";

    rangeRow.innerHTML = `
      <input
        type="number"
        min="1"
        placeholder="From"
      >

      <span>–</span>

      <input
        type="number"
        min="1"
        placeholder="To"
      >

      <button
        type="button"
        class="split-remove-range-btn"
        aria-label="Remove range"
      >
        ×
      </button>
    `;

    customRangePanel.insertBefore(
      rangeRow,
      addRangeBtn
    );

  });

}

/* =========================================================
   SPLIT MASTER UI — REMOVE RANGE
========================================================= */

document.addEventListener("click", (event) => {

  const removeBtn =
    event.target.closest(
      ".split-remove-range-btn"
    );

  if (!removeBtn) return;

  const row =
    removeBtn.closest(".split-range-row");

  if (!row) return;

  row.remove();

});

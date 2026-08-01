pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

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
  const pdfInput = document.getElementById("pdfInput");
  const selectPdfBtn = document.getElementById("selectPdfBtn");
  const settingsPopup = document.getElementById("settingsPopup");
  const continueSummaryBtn = document.getElementById("continueSummaryBtn");

  const startScreen = document.getElementById("startScreen");
  const summaryEditor = document.getElementById("summaryEditor");
  const summaryLength = document.getElementById("summaryLength");
  const summaryResult = document.getElementById("summaryResult");

  const pdfCanvas = document.getElementById("pdfCanvas");
  const prevPageBtn = document.getElementById("prevPageBtn");
  const nextPageBtn = document.getElementById("nextPageBtn");
  const pageNumberInput = document.getElementById("pageNumberInput");
  const totalPagesText = document.getElementById("totalPagesText");
  const fileNameText = document.getElementById("fileNameText");

  const copySummaryBtn = document.getElementById("copySummaryBtn");
  const downloadSummaryBtn = document.getElementById("downloadSummaryBtn");
  const askInput = document.getElementById("askInput");
  const askBtn = document.getElementById("askBtn");
  const suggestedQuestionsBox =
  document.getElementById("suggestedQuestionsBox");

const suggestedQuestionsList =
  document.getElementById("suggestedQuestionsList");

const suggestedToggleBtn =
  document.getElementById("suggestedToggleBtn");

  let selectedPdf = null;
  let pdfDocObj = null;
  let currentPage = 1;
  let totalPages = 1;
  let extractedText = "";
  let finalSummary = "";
  let summaryMode = "standard";
  (async()=>{

    const { data } =
    await window.supabaseClient.auth.getUser();

    if(data && data.user){

      currentUser = data.user;

    }

  })();
  selectPdfBtn.addEventListener("click", () => pdfInput.click());

  pdfInput.addEventListener("change", () => {
    if (!pdfInput.files || !pdfInput.files[0]) return;
    selectedPdf = pdfInput.files[0];
    settingsPopup.classList.remove("hidden-screen");
  });

  document.querySelectorAll(".process-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (btn.classList.contains("locked")) {
        alert("Advanced AI is available in upgrade plan.");
        return;
      }

      document.querySelectorAll(".process-option").forEach((b) => {
        b.classList.remove("active");
        const radio = b.querySelector(".process-radio");
        if (radio) radio.classList.remove("active");
      });

      btn.classList.add("active");
      const radio = btn.querySelector(".process-radio");
      if (radio) radio.classList.add("active");

      summaryMode = btn.dataset.mode || "standard";
    });
  });

  summaryLength.addEventListener("input", () => {
    if (Number(summaryLength.value) === 3) {
      alert("Long summary is available in upgrade plan.");
      summaryLength.value = 2;
    }
  });

  continueSummaryBtn.addEventListener("click", async () => {
    if (!selectedPdf) return;

    settingsPopup.classList.add("hidden-screen");
    startScreen.classList.add("hidden-screen");
    summaryEditor.classList.remove("hidden-screen");

    fileNameText.textContent =
      selectedPdf.name.length > 32 ? selectedPdf.name.slice(0, 32) + "..." : selectedPdf.name;

    await loadPdfPreview();
    await generateSummary();
  });

  async function loadPdfPreview() {
    const fileData = await selectedPdf.arrayBuffer();
    pdfDocObj = await pdfjsLib.getDocument({ data: fileData }).promise;
    totalPages = pdfDocObj.numPages;
    currentPage = 1;
    totalPagesText.textContent = `/ ${totalPages}`;
    pageNumberInput.value = currentPage;
    await renderPage(currentPage);
  }

  async function renderPage(pageNum) {
    const page = await pdfDocObj.getPage(pageNum);
    const viewport = page.getViewport({ scale: window.innerWidth <= 980 ? 0.8 : 1.35 });

    const ctx = pdfCanvas.getContext("2d");
    pdfCanvas.width = viewport.width;
    pdfCanvas.height = viewport.height;

    await page.render({
      canvasContext: ctx,
      viewport
    }).promise;

    pageNumberInput.value = pageNum;
  }

  prevPageBtn.addEventListener("click", async () => {
    currentPage = Math.max(1, currentPage - 1);
    await renderPage(currentPage);
  });

  nextPageBtn.addEventListener("click", async () => {
    currentPage = Math.min(totalPages, currentPage + 1);
    await renderPage(currentPage);
  });

  async function generateSummary() {
    summaryResult.innerHTML = `<div class="summary-loading">Generating AI summary...</div>`;

    const formData = new FormData();
        if(currentUser){

      formData.append(
        "user_id",
        currentUser.id
      );

    }
    formData.append("file", selectedPdf);
    formData.append("length", summaryLength.value);
    formData.append("mode", summaryMode);

    try {
      const res = await fetch("/pdf-summarizer", {
        method: "POST",
        body: formData
      });

            if (!res.ok) {
        const text = await res.text();

        if (res.status === 403) {

          document.getElementById(
            "upgradeModal"
          ).style.display = "flex";

          throw new Error("");

        }

        throw new Error(
          text ||
          "Failed to summarize PDF."
        );
      }

      const data = await res.json();
      extractedText = data.text || "";
      finalSummary = data.summary || "";

      renderSummary(finalSummary);
      renderSuggestedQuestions(extractedText);
    } catch (err) {
      summaryResult.innerHTML = `<div class="summary-error">Error: ${err.message}</div>`;
    }
  }

  function renderSummary(text) {
    const lines = String(text || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    summaryResult.innerHTML = `
      <h3>${escapeHtml(selectedPdf.name.replace(/\.pdf$/i, ""))}</h3>
      <ul>
        ${lines.map((line) => `<li>${escapeHtml(line.replace(/^[-•]\s*/, ""))}</li>`).join("")}
      </ul>
    `;
  }
  function renderSuggestedQuestions(text) {
  if (!suggestedQuestionsList) return;

  const cleanText = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) {
    suggestedQuestionsList.innerHTML = "";
    return;
  }

  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 35);

  const questions = [];

  if (sentences.length > 0) {
    questions.push(
      "What are the main points discussed in this document?"
    );
  }

  if (sentences.length > 2) {
    questions.push(
      "What are the most important findings or ideas in this document?"
    );
  }

  if (sentences.length > 4) {
    questions.push(
      "What key details should I remember from this document?"
    );
  }

  if (sentences.length > 6) {
    questions.push(
      "What conclusions can be drawn from this document?"
    );
  }

  if (sentences.length > 8) {
    questions.push(
      "Can you explain the most important section of this document?"
    );
  }

  suggestedQuestionsList.innerHTML = questions
    .slice(0, 5)
    .map(
      (question) => `
        <button
          type="button"
          class="summary-suggested-question"
        >
          ${escapeHtml(question)}
        </button>
      `
    )
    .join("");
}
if (suggestedToggleBtn && suggestedQuestionsList) {

  suggestedToggleBtn.addEventListener("click", () => {

    const isHidden =
      suggestedQuestionsList.style.display === "none";

    suggestedQuestionsList.style.display =
      isHidden ? "flex" : "none";

    suggestedToggleBtn.textContent =
      isHidden ? "⌃" : "⌄";

  });

}
suggestedQuestionsList.addEventListener("click", (e) => {
  const questionBtn = e.target.closest(".summary-suggested-question");

  if (!questionBtn) return;

  const question = questionBtn.textContent.trim();

  askInput.value = question;
  askBtn.click();
});

  askBtn.addEventListener("click", () => {
    const q = askInput.value.trim();
    if (!q) return;

    const answer = answerQuestion(q, extractedText);
    summaryResult.innerHTML += `
      <div class="summary-answer">
        <strong>Question:</strong> ${escapeHtml(q)}
        <p><strong>Answer:</strong> ${escapeHtml(answer)}</p>
      </div>
    `;
    askInput.value = "";
  });

  function answerQuestion(question, text) {
    const qWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const sentences = text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);

    const matched = sentences.filter((s) =>
      qWords.some((w) => s.toLowerCase().includes(w))
    );

    return matched.slice(0, 3).join(" ") || "I could not find a clear answer in this PDF text.";
  }

  copySummaryBtn.addEventListener("click", async () => {
    await navigator.clipboard.writeText(summaryResult.innerText);
    alert("Summary copied.");
  });

  downloadSummaryBtn.addEventListener("click", () => {
    const blob = new Blob([summaryResult.innerText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "pdf-summary.txt";
    a.click();

    URL.revokeObjectURL(url);
  });
    /* MOBILE DRAWERS */

  function closeDrawers(){

    toolsDrawer.classList.remove("active");
    mainDrawer.classList.remove("active");
    drawerOverlay.classList.remove("active");

  }

  if(toolsMenuBtn){

    toolsMenuBtn.addEventListener("click",()=>{

      toolsDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if(mainMenuBtn){

    mainMenuBtn.addEventListener("click",()=>{

      mainDrawer.classList.add("active");
      drawerOverlay.classList.add("active");

    });

  }

  if(toolsClose)
  toolsClose.addEventListener("click",closeDrawers);

  if(mainClose)
  mainClose.addEventListener("click",closeDrawers);

  if(drawerOverlay)
  drawerOverlay.addEventListener("click",closeDrawers);
  if (closeUpgradeModal) {


    closeUpgradeModal.addEventListener("click", () => {

      document.getElementById("upgradeModal").style.display = "none";

    });

  }
  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
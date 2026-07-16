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
  const textStartScreen = document.getElementById("textStartScreen");
  const textPreviewScreen = document.getElementById("textPreviewScreen");
  const textSuccessScreen = document.getElementById("textSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const textFileInput = document.getElementById("textFileInput");
  const addMoreInput = document.getElementById("addMoreInput");

  const fileList = document.getElementById("fileList");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFiles = [];
  let finalTxtUrl = null;
  function resetProgress(){

  if(progressInterval)
    clearInterval(progressInterval);

  progressInterval = null;

  progressBar.style.width = "0%";
  progressBar.textContent = "0%";

}
  let progressInterval = null;
(async()=>{

const { data } =
await window.supabaseClient.auth.getUser();

if(data && data.user){

currentUser = data.user;

}

})();
  dropZone.addEventListener("click", () => textFileInput.click());
  addMoreBtn.addEventListener("click", () => addMoreInput.click());

  textFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    selectedFiles = files;
    renderPreview();
  });

  addMoreInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    selectedFiles = [...selectedFiles, ...files];
    addMoreInput.value = "";
    renderPreview();
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

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type === "application/pdf"
    );

    if (!files.length) {
      alert("Please select PDF files");
      return;
    }

    selectedFiles = files;
    renderPreview();
  });

  function renderPreview(){
    textStartScreen.style.display = "none";

    textPreviewScreen.classList.remove("hidden-screen");
    textPreviewScreen.style.display = "grid";

    fileList.innerHTML = "";

    selectedFiles.forEach((file,index)=>{
      const card = document.createElement("div");
      card.className = "merge-file-card text-card";

      card.innerHTML = `
        <button class="remove-file-btn" data-index="${index}" type="button">×</button>

        <div class="pdf-thumb-wrap">
          <embed
            src="${URL.createObjectURL(file)}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
            type="application/pdf"
            class="pdf-thumb"
          />
        </div>

        <h3>${file.name}</h3>
        <span class="file-order-badge">${index + 1}</span>
      `;

      fileList.appendChild(card);
    });

    document.querySelectorAll(".remove-file-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const index = Number(btn.dataset.index);
        selectedFiles.splice(index,1);

        if(!selectedFiles.length){
          textPreviewScreen.classList.add("hidden-screen");
          textPreviewScreen.style.display = "none";
          textStartScreen.style.display = "flex";
          return;
        }

        renderPreview();
      });
    });
  }

  function startFakeProgress(){
    let progress = 15;
    progressBar.style.width = "15%";
    progressBar.textContent = "15%";

    progressInterval = setInterval(()=>{
      if(progress < 90){
        progress += 5;
        progressBar.style.width = progress + "%";
        progressBar.textContent = progress + "%";
      }
    },600);
  }

  function completeProgress(){
    if(progressInterval){

  clearInterval(progressInterval);

  progressInterval = null;

}
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  convertBtn.addEventListener("click", async ()=>{
    if(!selectedFiles.length){
      alert("Please select PDF files");
      return;
    }

    const formData = new FormData();
    if(currentUser){

formData.append(
"user_id",
currentUser.id
);

}
    formData.append("pdfFile", selectedFiles[0]);
resetProgress();
    startFakeProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Extracting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try{
      const response = await fetch("/pdf-to-text", {
        method:"POST",
        body:formData
      });

      if(!response.ok){

const text =
await response.text();

if(response.status===403){

document.getElementById(
"upgradeModal"
).style.display="flex";

throw new Error("");

}

throw new Error(
text ||
"PDF to Text failed"
);

}

      const blob = await response.blob();

      if(!blob || blob.size < 1){
        throw new Error("Extraction failed");
      }

      if(finalTxtUrl){

  URL.revokeObjectURL(finalTxtUrl);

  finalTxtUrl = null;

}
      finalTxtUrl = URL.createObjectURL(blob);

      completeProgress();

      setTimeout(()=>{
        textPreviewScreen.classList.add("hidden-screen");
        textPreviewScreen.style.display = "none";

        textSuccessScreen.classList.remove("hidden-screen");
        textSuccessScreen.style.display = "flex";
      },400);

    }catch(error){
      console.error(error);
      alert(error.message || "PDF to Text failed");
    }finally{
      if(progressInterval) clearInterval(progressInterval);

      convertBtn.disabled = false;
      convertBtn.innerHTML = `Extract Text <i class="fa-solid fa-arrow-right"></i>`;
    }
  });

  downloadBtn.addEventListener("click",()=>{
    if(!finalTxtUrl) return;

    const a = document.createElement("a");
    a.href = finalTxtUrl;
    a.download = "pdf-text.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{

  if(finalTxtUrl){

    URL.revokeObjectURL(finalTxtUrl);

    finalTxtUrl = null;

  }

},1000);
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
});
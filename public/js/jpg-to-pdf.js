document.addEventListener("DOMContentLoaded", () => {
    /* DRAWERS */

const toolsMenuBtn = document.getElementById("toolsMenuBtn");
const mainMenuBtn = document.getElementById("mainMenuBtn");

const toolsDrawer = document.getElementById("toolsDrawer");
const mainDrawer = document.getElementById("mainDrawer");

const toolsClose = document.getElementById("toolsClose");
const mainClose = document.getElementById("mainClose");

const drawerOverlay = document.getElementById("drawerOverlay");
  const jpgStartScreen = document.getElementById("jpgStartScreen");
  const jpgPreviewScreen = document.getElementById("jpgPreviewScreen");
  const jpgSuccessScreen = document.getElementById("jpgSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("jpgFiles");
  const addMoreInput = document.getElementById("addMoreInput");

  const fileList = document.getElementById("fileList");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");


  let selectedFiles = [];
  let finalPdfUrl = null;
  let progressInterval = null;
  let currentUser = null;

  function resetProgress(){

  if(progressInterval)
    clearInterval(progressInterval);

  progressBar.style.width = "0%";
  progressBar.textContent = "0%";

}

  (async()=>{

const { data } =
await window.supabaseClient.auth.getUser();

if(data && data.user){

currentUser = data.user;

}

})();
/* MOBILE DRAWER */

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
  dropZone.addEventListener("click", () => fileInput.click());
  addMoreBtn.addEventListener("click", () => addMoreInput.click());

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
    selectedFiles = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    renderPreview();
  });

  addMoreInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    selectedFiles = [
      ...selectedFiles,
      ...files.map(file => ({
        file,
        previewUrl: URL.createObjectURL(file)
      }))
    ];

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
      file.type.includes("jpeg") ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg")
    );

    if (!files.length) {
      alert("Please select JPG images");
      return;
    }

    selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
    selectedFiles = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));

    renderPreview();
  });

  function renderPreview(){
    jpgStartScreen.style.display = "none";
    jpgSuccessScreen.classList.add("hidden-screen");
    jpgSuccessScreen.style.display = "none";

    jpgPreviewScreen.classList.remove("hidden-screen");
    jpgPreviewScreen.style.display = "grid";

    fileList.innerHTML = "";

    selectedFiles.forEach((item,index)=>{
      const card = document.createElement("div");
      card.className = "merge-file-card jpg-card";

      card.innerHTML = `
        <button class="remove-file-btn" data-index="${index}" type="button">×</button>
        <div class="image-thumb-wrap">
          <img src="${item.previewUrl}" class="image-thumb" alt="">
        </div>
        <h3>${item.file.name}</h3>
        <span class="file-order-badge">${index + 1}</span>
      `;

      fileList.appendChild(card);
    });

    document.querySelectorAll(".remove-file-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const index = Number(btn.dataset.index);
        URL.revokeObjectURL(selectedFiles[index].previewUrl);
        selectedFiles.splice(index,1);

        if(!selectedFiles.length){
          jpgPreviewScreen.classList.add("hidden-screen");
          jpgPreviewScreen.style.display = "none";
          jpgStartScreen.style.display = "flex";
          return;
        }

        renderPreview();
      });
    });
  }
resetProgress();
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
    if(progressInterval) clearInterval(progressInterval);
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  convertBtn.addEventListener("click", async ()=>{
    if(!selectedFiles.length){
      alert("Please select JPG images");
      return;
    }

    const formData = new FormData();
    if(currentUser){

formData.append("user_id", currentUser.id);

}
    selectedFiles.forEach(item => formData.append("jpgFiles", item.file));

    startFakeProgress();

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try{
      const response = await fetch("/jpg-to-pdf", {
        method:"POST",
        body:formData
      });

      if(!response.ok){
        const text = await response.text();
        if(response.status===403){

document.getElementById("upgradeModal").style.display="flex";

throw new Error("");

}
        throw new Error(text || "Conversion failed");
      }

      const blob = await response.blob();

      if(!blob || blob.size < 100){
        throw new Error("Conversion failed");
      }

      if(finalPdfUrl){

  URL.revokeObjectURL(finalPdfUrl);

}

finalPdfUrl = null;
      finalPdfUrl = URL.createObjectURL(blob);

      completeProgress();

      setTimeout(()=>{
        jpgPreviewScreen.classList.add("hidden-screen");
        jpgPreviewScreen.style.display = "none";

        jpgSuccessScreen.classList.remove("hidden-screen");
        jpgSuccessScreen.style.display = "flex";
      },400);

    }catch(error){
      console.error(error);
      alert(error.message || "Failed to convert JPG to PDF");
    }finally{
      if(progressInterval) clearInterval(progressInterval);

      convertBtn.disabled = false;
      convertBtn.innerHTML = `Convert to PDF <i class="fa-solid fa-arrow-right"></i>`;
    }
  });
    downloadBtn.addEventListener("click",()=>{
    if(!finalPdfUrl) return;

    const a = document.createElement("a");
    a.href = finalPdfUrl;
    a.download = "jpg-to-pdf.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>{

  if(finalPdfUrl){

    URL.revokeObjectURL(finalPdfUrl);
    finalPdfUrl = null;

  }

},1000);
  });
  const closeUpgradeModal =
document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

closeUpgradeModal.addEventListener("click", () => {

document.getElementById("upgradeModal").style.display = "none";

});

}
});
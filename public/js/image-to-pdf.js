document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     SCREEN ELEMENTS
  ========================= */

  const imageStartScreen =
    document.getElementById("imageStartScreen");

  const imagePreviewScreen =
    document.getElementById("imagePreviewScreen");

  const imageSuccessScreen =
    document.getElementById("imageSuccessScreen");


  const dropZone = document.getElementById("dropZone");
const imageFilesInput = document.getElementById("imageFiles");

const fileList = document.getElementById("fileList");
const addMoreBtn = document.getElementById("addMoreBtn");


  /* =========================
     ACTION ELEMENTS
  ========================= */

  const convertBtn =
    document.getElementById("convertBtn");

  const progressBar =
    document.getElementById("progressBar");

  const downloadBtn =
    document.getElementById("downloadBtn");


  /* =========================
     TOOL STATE
  ========================= */

  let selectedFiles = [];

  let finalPdfUrl = null;

  let progressInterval = null;



 /* =========================================================
   IMAGE SELECTION
   Select Images = REPLACE
   Add More = APPEND
========================================================= */

let addMoreMode = false;



/* =========================
   ADD MORE IMAGES
   ========================= */

addMoreBtn.addEventListener("click", (e) => {

  e.preventDefault();
  e.stopPropagation();

  // Add More selection = append to existing images
  addMoreMode = true;

  imageFilesInput.click();

});


/* =========================
   FILE SELECTION
   ========================= */

imageFilesInput.addEventListener("change", (e) => {

  const files = Array.from(e.target.files);

  if (!files.length) {
    return;
  }


  /* =========================
     FREE/PREMIUM IMAGE LIMIT
     FRONTEND SAFETY CHECK
  ========================= */

  const FREE_IMAGE_LIMIT = 10;
  const PREMIUM_IMAGE_LIMIT = 50;


  /*
     Premium status frontend par
     abhi assume nahi karna.
     Server final verification karega.

     Filhaal normal selection ko
     50 images se upar jane se rok rahe hain.
  */

  const maximumAllowedImages = PREMIUM_IMAGE_LIMIT;


  /* =========================
     CHECK TOTAL IMAGE COUNT
  ========================= */

  const totalImages = addMoreMode
    ? selectedFiles.length + files.length
    : files.length;


  if (totalImages > maximumAllowedImages) {

    alert(
      `You can add a maximum of ${maximumAllowedImages} images in one PDF.`
    );

    addMoreMode = false;
    imageFilesInput.value = "";

    return;
  }


  /* =========================
     ADD MORE = APPEND
  ========================= */

  if (addMoreMode) {

    files.forEach(file => {

      selectedFiles.push({
        file: file,
        previewUrl: URL.createObjectURL(file)
      });

    });

  }


  /* =========================
     NORMAL SELECT = REPLACE
  ========================= */

  else {

    selectedFiles.forEach(item => {

      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }

    });

    selectedFiles = files.map(file => ({

      file: file,
      previewUrl: URL.createObjectURL(file)

    }));

  }


  /* =========================
     RESET MODE
  ========================= */

  addMoreMode = false;

  // Allow selecting the same file again
  imageFilesInput.value = "";

  // Show all selected images
  renderPreview();

});

  function renderPreview(){

  /* =========================
     EMPTY STATE
  ========================= */

  if(!selectedFiles.length){

    imagePreviewScreen.classList.add("hidden-screen");
    imagePreviewScreen.style.display = "none";

    imageSuccessScreen.classList.add("hidden-screen");
    imageSuccessScreen.style.display = "none";

    imageStartScreen.style.display = "flex";

    fileList.innerHTML = "";

    return;
  }


  /* =========================
     SHOW PREVIEW
  ========================= */

  imageStartScreen.style.display = "none";

  imageSuccessScreen.classList.add("hidden-screen");
  imageSuccessScreen.style.display = "none";

  imagePreviewScreen.classList.remove("hidden-screen");
  imagePreviewScreen.style.display = "grid";


  /* =========================
     CLEAR OLD CARDS
  ========================= */

  fileList.innerHTML = "";


  /* =========================
     CREATE IMAGE CARDS
  ========================= */

  selectedFiles.forEach((item,index)=>{

    const card = document.createElement("div");

    card.className = "merge-file-card image-card";

    card.innerHTML = `
      <button
        class="remove-file-btn"
        data-index="${index}"
        type="button"
      >×</button>

      <div class="image-thumb-wrap">
        <img
          src="${item.previewUrl}"
          class="image-thumb"
          alt=""
        >
      </div>

      <h3>${item.file.name}</h3>

      <span class="file-order-badge">
        ${index + 1}
      </span>
    `;

    fileList.appendChild(card);

  });


  /* =========================
     REMOVE IMAGE
  ========================= */

  document.querySelectorAll(".remove-file-btn").forEach(btn=>{

    btn.addEventListener("click",(e)=>{

      e.preventDefault();
      e.stopPropagation();

      const index = Number(btn.dataset.index);

      if(selectedFiles[index]){
        URL.revokeObjectURL(
          selectedFiles[index].previewUrl
        );
      }

      selectedFiles.splice(index,1);

      renderPreview();

    });

  });


  /* =========================
     ADD MORE BUTTON
  ========================= */

  if(addMoreBtn){
    addMoreBtn.style.display = "flex";
  }

}

  function completeProgress(){
    if(progressInterval) clearInterval(progressInterval);
    progressBar.style.width = "100%";
    progressBar.textContent = "100%";
  }

  convertBtn.addEventListener("click", async ()=>{
    if(!selectedFiles.length){
      alert("Please select images");
      return;
    }

    const formData = new FormData();

    selectedFiles.forEach(item=>{
      formData.append("images", item.file);
    });
    const { data } = await window.supabaseClient.auth.getUser();

if (!data?.user) {
  alert("Please login first");
  return;
}

formData.append("user_id", data.user.id);

    

    convertBtn.disabled = true;
    convertBtn.innerHTML = `Converting... <i class="fa-solid fa-spinner fa-spin"></i>`;

    try{
      const response = await fetch("/image-to-pdf", {
        method:"POST",
        body:formData
      });
if(!response.ok){

  const errorText = await response.text();

  if(errorText.includes("Daily free limit reached")){

  if(progressInterval){
    clearInterval(progressInterval);
    progressInterval = null;
  }

  progressBar.style.width = "0%";
  progressBar.textContent = "0%";

  const upgradeModal =
    document.getElementById("upgradeModal");

  if(upgradeModal){
    upgradeModal.style.display = "flex";
  }

  return;
}

  throw new Error(errorText || "Image to PDF failed");
}
      const blob = await response.blob();

      if(!blob || blob.size < 100){
        throw new Error("Image to PDF failed");
      }

      if(finalPdfUrl) URL.revokeObjectURL(finalPdfUrl);
      finalPdfUrl = URL.createObjectURL(blob);

      completeProgress();

      setTimeout(()=>{
        imagePreviewScreen.classList.add("hidden-screen");
        imagePreviewScreen.style.display = "none";

        imageSuccessScreen.classList.remove("hidden-screen");
        imageSuccessScreen.style.display = "flex";
      },400);

    }catch(error){
      console.error(error);
      alert(error.message || "Image to PDF failed");
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
    a.download = "image-to-pdf.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    
  });
  const closeUpgradeModal =
  document.getElementById("closeUpgradeModal");

if(closeUpgradeModal){

  closeUpgradeModal.addEventListener("click",()=>{

    document.getElementById("upgradeModal")
      .style.display = "none";

  });

}
});
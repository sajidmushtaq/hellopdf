document.addEventListener("DOMContentLoaded", () => {
  const imageStartScreen = document.getElementById("imageStartScreen");
  const imagePreviewScreen = document.getElementById("imagePreviewScreen");
  const imageSuccessScreen = document.getElementById("imageSuccessScreen");

  const dropZone = document.getElementById("dropZone");
  const imageFilesInput = document.getElementById("imageFiles");
  const addMoreInput = document.getElementById("addMoreInput");

  const fileList = document.getElementById("fileList");
  const addMoreBtn = document.getElementById("addMoreBtn");
  const convertBtn = document.getElementById("convertBtn");
  const progressBar = document.getElementById("progressBar");
  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFiles = [];
  let finalPdfUrl = null;
  let progressInterval = null;

  dropZone.addEventListener("click", () => imageFilesInput.click());
  addMoreBtn.addEventListener("click", () => addMoreInput.click());

  imageFilesInput.addEventListener("change", (e) => {
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
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.name.toLowerCase().endsWith(".jpg") ||
      file.name.toLowerCase().endsWith(".jpeg") ||
      file.name.toLowerCase().endsWith(".png")
    );

    if (!files.length) {
      alert("Please select JPG, JPEG, or PNG images");
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
    imageStartScreen.style.display = "none";

    imageSuccessScreen.classList.add("hidden-screen");
    imageSuccessScreen.style.display = "none";

    imagePreviewScreen.classList.remove("hidden-screen");
    imagePreviewScreen.style.display = "grid";

    fileList.innerHTML = "";

    selectedFiles.forEach((item,index)=>{
      const card = document.createElement("div");
      card.className = "merge-file-card image-card";

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
          imagePreviewScreen.classList.add("hidden-screen");
          imagePreviewScreen.style.display = "none";
          imageStartScreen.style.display = "flex";
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

    startFakeProgress();

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
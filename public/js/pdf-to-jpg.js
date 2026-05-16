document.addEventListener("DOMContentLoaded", () => {

  const pdfStartScreen = document.getElementById("pdfStartScreen");
  const pdfPreviewScreen = document.getElementById("pdfPreviewScreen");
  const pdfSuccessScreen = document.getElementById("pdfSuccessScreen");

  const dropZone = document.getElementById("dropZone");

  const pdfFileInput = document.getElementById("pdfFileInput");
  const addMoreInput = document.getElementById("addMoreInput");

  const fileList = document.getElementById("fileList");

  const addMoreBtn = document.getElementById("addMoreBtn");
  const convertBtn = document.getElementById("convertBtn");

  const progressBar = document.getElementById("progressBar");

  const downloadBtn = document.getElementById("downloadBtn");

  let selectedFiles = [];
  let finalZipUrl = null;
  let progressInterval = null;

  /* CLICK */

  dropZone.addEventListener("click", () => {
    pdfFileInput.click();
  });

  addMoreBtn.addEventListener("click", () => {
    addMoreInput.click();
  });

  /* FILE SELECT */

  pdfFileInput.addEventListener("change", (e) => {

    const files = Array.from(e.target.files);

    if (!files.length) return;

    selectedFiles = files;

    renderPreview();

  });

  /* ADD MORE */

  addMoreInput.addEventListener("change", (e) => {

    const files = Array.from(e.target.files);

    if (!files.length) return;

    selectedFiles = [...selectedFiles, ...files];

    renderPreview();

  });

  /* DRAG */

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

    const files = Array.from(e.dataTransfer.files)
      .filter(file =>
        file.type === "application/pdf"
      );

    if (!files.length) {

      alert("Please select PDF files");

      return;
    }

    selectedFiles = files;

    renderPreview();

  });

  /* PREVIEW */

  function renderPreview(){

    pdfStartScreen.style.display = "none";

    pdfPreviewScreen.classList.remove("hidden-screen");
    pdfPreviewScreen.style.display = "grid";

    fileList.innerHTML = "";

    selectedFiles.forEach((file,index)=>{

      const card = document.createElement("div");

      card.className = "merge-file-card pdf-card";

      card.innerHTML = `
        <button class="remove-file-btn" data-index="${index}">
          ×
        </button>

       <div class="pdf-thumb-wrap">
  <embed
    src="${URL.createObjectURL(file)}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"
    type="application/pdf"
    class="pdf-thumb"
  />
</div>

        <h3>${file.name}</h3>

        <span class="file-order-badge">
          ${index + 1}
        </span>
      `;

      fileList.appendChild(card);

    });

    document.querySelectorAll(".remove-file-btn").forEach(btn=>{

      btn.addEventListener("click",()=>{

        const index = Number(btn.dataset.index);

        selectedFiles.splice(index,1);

        if(!selectedFiles.length){

          pdfPreviewScreen.classList.add("hidden-screen");
          pdfPreviewScreen.style.display = "none";

          pdfStartScreen.style.display = "flex";

          return;
        }

        renderPreview();

      });

    });

  }

  /* PROGRESS */

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

    clearInterval(progressInterval);

    progressBar.style.width = "100%";
    progressBar.textContent = "100%";

  }

  /* CONVERT */

  convertBtn.addEventListener("click", async ()=>{

    if(!selectedFiles.length){

      alert("Please select PDF files");

      return;
    }

    const formData = new FormData();

    selectedFiles.forEach(file=>{
      formData.append("pdfFile", file);
    });

    startFakeProgress();

    convertBtn.disabled = true;

    convertBtn.innerHTML = `
      Converting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    try{

      const response = await fetch("/pdf-to-jpg",{
        method:"POST",
        body:formData
      });

      if(!response.ok){
        throw new Error("PDF to JPG failed");
      }

      const blob = await response.blob();

      if(!blob || blob.size < 100){
        throw new Error("PDF to JPG failed");
      }

      finalZipUrl = URL.createObjectURL(blob);

      completeProgress();

      setTimeout(()=>{

        pdfPreviewScreen.classList.add("hidden-screen");
        pdfPreviewScreen.style.display = "none";

        pdfSuccessScreen.classList.remove("hidden-screen");
        pdfSuccessScreen.style.display = "flex";

      },400);

    }catch(error){

      console.error(error);

      alert("PDF to JPG failed");

    }finally{

      clearInterval(progressInterval);

      convertBtn.disabled = false;

      convertBtn.innerHTML = `
        Convert to JPG
        <i class="fa-solid fa-arrow-right"></i>
      `;

    }

  });

  /* DOWNLOAD */

  downloadBtn.addEventListener("click",()=>{

    if(!finalZipUrl) return;

    const a = document.createElement("a");

    a.href = finalZipUrl;

    a.download = "pdf-to-jpg.zip";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
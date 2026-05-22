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

  let selectedFile = null;
  let zipUrl = null;

  function showPreviewScreen(){

    startScreen.classList.add("hidden-screen");

    previewScreen.classList.remove("hidden-screen");
    previewScreen.classList.add("active-screen");

    successScreen.classList.add("hidden-screen");

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }

  function showSuccessScreen(){

    previewScreen.classList.add("hidden-screen");

    successScreen.classList.remove("hidden-screen");
    successScreen.classList.add("active-screen");

    window.scrollTo({
      top:0,
      behavior:"smooth"
    });
  }

  function renderFile(){

    fileList.innerHTML = "";

    if(!selectedFile) return;

    fileCounter.innerHTML = "1 file selected";

    const card = document.createElement("div");

    card.className = "pdf-image-file-card";

    card.innerHTML = `
    
      <button class="remove-file-btn" type="button">
        ×
      </button>

      <div class="pdf-image-icon">
        <i class="fa-solid fa-file-pdf"></i>
      </div>

      <h3>${selectedFile.name}</h3>

      <div class="file-order-badge">
        1
      </div>
    
    `;

    card.querySelector(".remove-file-btn")
    .addEventListener("click", () => {

      selectedFile = null;

      startScreen.classList.remove("hidden-screen");

      previewScreen.classList.add("hidden-screen");

      fileList.innerHTML = "";
    });

    fileList.appendChild(card);

    showPreviewScreen();
  }

  function handleFile(file){

    if(!file) return;

    if(
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ){
      alert("Please select PDF file only");
      return;
    }

    selectedFile = file;

    renderFile();
  }

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  addMoreBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {

    handleFile(e.target.files[0]);

    fileInput.value = "";
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

    handleFile(e.dataTransfer.files[0]);
  });

  convertBtn.addEventListener("click", () => {

    if(!selectedFile){
      alert("Please select PDF file first");
      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    convertBtn.disabled = true;

    convertBtn.innerHTML = `
      Converting...
      <i class="fa-solid fa-spinner fa-spin"></i>
    `;

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/pdf-to-image");

    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {

      if(e.lengthComputable){

        let percent = Math.round((e.loaded / e.total) * 100);

        progressBar.style.width = percent + "%";

        progressBar.innerHTML = percent + "%";
      }
    };

    xhr.onload = () => {

      convertBtn.disabled = false;

      convertBtn.innerHTML = `
        Convert to Images
      `;

      if(xhr.status === 200){

        const blob = xhr.response;

        if(blob.size < 1000){
          alert("Conversion failed");
          return;
        }

        zipUrl = URL.createObjectURL(blob);

        progressBar.style.width = "100%";
        progressBar.innerHTML = "100%";

        setTimeout(() => {

          showSuccessScreen();

        }, 500);

      }else{
        alert("Server error");
      }

    };

    xhr.send(formData);

  });

  downloadBtn.addEventListener("click", () => {

    if(!zipUrl){
      alert("ZIP not ready");
      return;
    }

    const a = document.createElement("a");

    a.href = zipUrl;

    a.download = "pdf-images.zip";

    document.body.appendChild(a);

    a.click();

    a.remove();

  });

});
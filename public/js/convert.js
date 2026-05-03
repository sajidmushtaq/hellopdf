document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const progressBar = document.getElementById("progressBar");

  let filesArray = [];

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    filesArray = [...files];

    fileList.innerHTML = "";

    filesArray.forEach(file => {
      const div = document.createElement("div");
      div.innerText = "🖼 " + file.name;
      fileList.appendChild(div);
    });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = new FormData();

    filesArray.forEach(file => {
      formData.append("images", file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/convert-image");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        let percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressBar.innerText = percent + "%";
      }
    };

    xhr.onload = function () {
      const blob = xhr.response;
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "images.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    xhr.responseType = "blob";
    xhr.send(formData);
  });

});
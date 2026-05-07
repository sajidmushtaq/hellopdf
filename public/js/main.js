document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const progressBar = document.getElementById("progressBar");

  let filesArray = [];

  // click
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  // drag over
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  // drop
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  // select
  fileInput.addEventListener("change", () => {
    handleFiles(fileInput.files);
  });

  function handleFiles(files) {
    filesArray = [...files];

    fileList.innerHTML = "";

    filesArray.forEach(file => {
      const div = document.createElement("div");
      div.innerText = "📄 " + file.name;
      fileList.appendChild(div);
    });
  }

  // merge submit
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    if (filesArray.length === 0) {
      alert("Select PDF files first");
      return;
    }

    const formData = new FormData();

    filesArray.forEach(file => {
      formData.append("pdfs", file);
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://hellopdf-backend.onrender.com/merge");
    xhr.responseType = "blob";

    // progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        let percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressBar.innerText = percent + "%";
      }
    };

    // response
    xhr.onload = function () {
      if (xhr.status === 200) {

        const blob = xhr.response;

        if (!blob || blob.size < 500) {
          alert("Merge failed");
          return;
        }

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "merged.pdf";
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);

      } else {
        alert("Server error");
      }
    };

    xhr.onerror = function () {
      alert("Request failed");
    };

    xhr.send(formData);
  });

});
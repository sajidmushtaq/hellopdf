document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const progressBar = document.getElementById("progressBar");

  let file;

  // click
  dropZone.onclick = () => fileInput.click();

  // select
  fileInput.onchange = () => {
    file = fileInput.files[0];

    fileList.innerHTML = "";
    fileList.innerHTML = `<div>📄 ${file.name}</div>`;
  };

  // submit
  form.onsubmit = (e) => {
    e.preventDefault();

    if (!file) {
      alert("Select PDF first");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/compress");
    xhr.responseType = "blob";

    // progress
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        let percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressBar.innerText = percent + "%";
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {

        const blob = xhr.response;

        if (blob.size < 1000) {
          alert("Compression failed");
          return;
        }

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "compressed.pdf";
        a.click();

      } else {
        alert("Server error");
      }
    };

    xhr.send(formData);
  };

});
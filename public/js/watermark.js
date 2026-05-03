document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const progressBar = document.getElementById("progressBar");

  let file;

  dropZone.onclick = () => fileInput.click();

  fileInput.onchange = () => {
    file = fileInput.files[0];
    fileList.innerHTML = `<div>📄 ${file.name}</div>`;
  };

  form.onsubmit = (e) => {
    e.preventDefault();

    const text = document.getElementById("text").value;
    const size = document.getElementById("size").value;
    const opacity = document.getElementById("opacity").value;

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("text", text);
    formData.append("size", size);
    formData.append("opacity", opacity);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/watermark");
    xhr.responseType = "blob";

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
          alert("Watermark failed");
          return;
        }

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "watermarked.pdf";
        a.click();

      } else {
        alert("Server error");
      }
    };

    xhr.send(formData);
  };

});
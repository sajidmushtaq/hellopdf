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

    if (!file) {
      alert("Select PDF first");
      return;
    }

    const formData = new FormData();
    formData.append("pdf", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/pdf-to-word");
    xhr.responseType = "blob";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progressBar.style.width = percent + "%";
        progressBar.innerText = percent + "%";
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const blob = xhr.response;
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "converted.docx";
        a.click();

        window.URL.revokeObjectURL(url);
      } else {
  const reader = new FileReader();
  reader.onload = function () {
    alert("Conversion failed: " + reader.result);
  };
  reader.readAsText(xhr.response);
}
    };

    xhr.send(formData);
  };

});
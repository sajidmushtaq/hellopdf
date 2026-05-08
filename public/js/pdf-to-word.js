document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const progressBar = document.getElementById("progressBar");

  let selectedFile = null;

  // CLICK SELECT
  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  // FILE SELECT
  fileInput.addEventListener("change", () => {

    if (!fileInput.files.length) return;

    selectedFile = fileInput.files[0];

    fileList.innerHTML = `
      <div>📄 ${selectedFile.name}</div>
    `;
  });

  // DRAG OVER
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragging");
  });

  // DRAG LEAVE
  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });

  // DROP
  dropZone.addEventListener("drop", (e) => {

    e.preventDefault();

    dropZone.classList.remove("dragging");

    if (!e.dataTransfer.files.length) return;

    selectedFile = e.dataTransfer.files[0];

    fileList.innerHTML = `
      <div>📄 ${selectedFile.name}</div>
    `;
  });

  // SUBMIT
  form.addEventListener("submit", (e) => {

    e.preventDefault();

    if (!selectedFile) {
      alert("Select PDF first");
      return;
    }

    const formData = new FormData();

    formData.append("pdf", selectedFile);

    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/pdf-to-word");

    xhr.responseType = "blob";

    // PROGRESS
    xhr.upload.onprogress = (e) => {

      if (e.lengthComputable) {

        const percent = Math.round(
          (e.loaded / e.total) * 100
        );

        progressBar.style.width = percent + "%";
        progressBar.innerText = percent + "%";
      }
    };

    // SUCCESS
    xhr.onload = () => {

      if (xhr.status === 200) {

        const blob = xhr.response;

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");

        a.href = url;
        a.download = "converted.docx";

        document.body.appendChild(a);

        a.click();

        a.remove();

        window.URL.revokeObjectURL(url);

      } else {

        alert("Conversion failed");
      }
    };

    // ERROR
    xhr.onerror = () => {
      alert("Request failed");
    };

    xhr.send(formData);
  });

});
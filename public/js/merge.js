document.addEventListener("DOMContentLoaded", () => {

  console.log("merge.js loaded ✅");

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const form = document.getElementById("uploadForm");

  let filesArray = [];

  // CLICK
  if (dropZone && fileInput) {
    dropZone.addEventListener("click", () => {
      fileInput.click();
    });
  }

  // FILE SELECT
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      filesArray = [...fileInput.files];
      showFiles();
    });
  }

  // DRAG
  if (dropZone) {
    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "blue";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.style.borderColor = "#aaa";
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "#aaa";

      filesArray = [...e.dataTransfer.files];
      showFiles();
    });
  }

  function showFiles() {
    if (!fileList) return;

    fileList.innerHTML = "";

    filesArray.forEach(file => {
      fileList.innerHTML += `<div>📄 ${file.name}</div>`;
    });
  }

  // 🔥 MERGE BUTTON FIX
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      console.log("Merge clicked 🚀");

      if (filesArray.length === 0) {
        alert("Select PDF first");
        return;
      }

      const formData = new FormData();

      filesArray.forEach(file => {
        formData.append("pdfs", file);
      });

      fetch("/merge", {
        method: "POST",
        body: formData
      })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "merged.pdf";
        a.click();

        window.URL.revokeObjectURL(url);
      })
      .catch(() => {
        alert("Merge failed");
      });
    });
  }

});
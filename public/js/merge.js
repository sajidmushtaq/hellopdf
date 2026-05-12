document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const fileList = document.getElementById("fileList");
  const form = document.getElementById("uploadForm");
  const progressBar = document.getElementById("progressBar");

  let filesArray = [];

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    filesArray = Array.from(fileInput.files);
    showFiles();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#2563eb";
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.style.borderColor = "#94a3b8";
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.style.borderColor = "#94a3b8";
    filesArray = Array.from(e.dataTransfer.files);
    showFiles();
  });

  function showFiles() {
    fileList.innerHTML = "";

    filesArray.forEach((file) => {
      const div = document.createElement("div");
      div.textContent = "📄 " + file.name;
      fileList.appendChild(div);
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
      if (!checkToolLimit("merge")) {
    return;
  }

    if (filesArray.length < 2) {
      alert("Please select at least 2 PDF files");
      return;
    }

    const formData = new FormData();

    filesArray.forEach((file) => {
      formData.append("pdfs", file);
    });

    if (progressBar) {
      progressBar.style.width = "20%";
      progressBar.textContent = "20%";
    }

    try {
      const response = await fetch("/merge", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Merge failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 1000 || blob.type !== "application/pdf") {
        alert("Merge failed. Please try different PDF files.");
        return;
      }

      if (progressBar) {
        progressBar.style.width = "100%";
        progressBar.textContent = "100%";
      }

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      markToolUsed("merge");

      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error("MERGE FRONTEND ERROR:", error);
      alert("Merge failed. Please try again.");
    }
  });
});
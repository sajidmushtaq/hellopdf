document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const passwordInput = document.getElementById("passwordInput");
  const progressBar = document.getElementById("progressBar");

  let file = null;

  dropZone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    file = fileInput.files[0];

    if (file) {
      fileList.innerHTML = `<div>📄 ${file.name}</div>`;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select PDF first");
      return;
    }

    const password = passwordInput.value.trim();

    if (!password) {
      alert("Please enter PDF password");
      return;
    }

    const formData = new FormData();
    formData.append("pdfFile", file);
    formData.append("password", password);

    progressBar.style.width = "20%";
    progressBar.innerText = "20%";

    try {
      const response = await fetch("/unlock-pdf", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Unlock PDF failed");
        return;
      }

      const blob = await response.blob();

      if (!blob || blob.size < 500) {
        alert("Unlock PDF failed");
        return;
      }

      progressBar.style.width = "100%";
      progressBar.innerText = "100%";

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "unlocked.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error(err);
      alert("Unlock PDF failed");
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {

  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const form = document.getElementById("uploadForm");
  const fileList = document.getElementById("fileList");
  const pagesInput = document.getElementById("pagesInput");

  let file;

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    file = e.target.files[0];
    fileList.innerHTML = `<div>📄 ${file.name}</div>`;
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("pages", pagesInput.value);

    const res = await fetch("/remove-pages", {
      method: "POST",
      body: formData
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "updated.pdf";
    a.click();
  });

});
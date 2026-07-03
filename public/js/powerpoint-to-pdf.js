document.addEventListener("DOMContentLoaded", () => {

const startScreen =
document.getElementById("startScreen");

const previewScreen =
document.getElementById("previewScreen");

const successScreen =
document.getElementById("successScreen");

const dropZone =
document.getElementById("dropZone");

const fileInput =
document.getElementById("fileInput");

const addMoreBtn =
document.getElementById("addMoreBtn");

const fileList =
document.getElementById("fileList");

const fileCounter =
document.getElementById("fileCounter");

const convertBtn =
document.getElementById("convertBtn");

const progressBar =
document.getElementById("progressBar");

const downloadBtn =
document.getElementById("downloadBtn");

let selectedFile = null;

let convertedPdfUrl = null;

let progressInterval = null;

let currentUser = null;

let currentUserId = null;

startScreen.style.display = "flex";

previewScreen.classList.add("hidden-screen");
successScreen.classList.add("hidden-screen");

previewScreen.style.display = "none";
successScreen.style.display = "none";

function resetProgress(){

if(progressInterval)
clearInterval(progressInterval);

progressInterval = null;

progressBar.style.width = "0%";
progressBar.textContent = "0%";

}

function startFakeProgress(){

let progress = 15;

progressBar.style.width = "15%";
progressBar.textContent = "15%";

progressInterval = setInterval(()=>{

if(progress < 90){

progress += 5;

progressBar.style.width =
progress + "%";

progressBar.textContent =
progress + "%";

}

},700);

}

function completeProgress(){

if(progressInterval)
clearInterval(progressInterval);

progressInterval = null;

progressBar.style.width = "100%";
progressBar.textContent = "100%";

}

function isPowerPointFile(file){

if(!file) return false;

const name =
file.name.toLowerCase();

return(

name.endsWith(".ppt") ||

name.endsWith(".pptx") ||

name.endsWith(".pps") ||

name.endsWith(".ppsx")

);

}

function formatFileSize(bytes){

if(!bytes) return "0 KB";

const kb = bytes / 1024;

if(kb < 1024)
return kb.toFixed(1) + " KB";

return (kb / 1024).toFixed(1) + " MB";

}

function addFile(files){

const file =
Array.from(files || [])
.find(isPowerPointFile);

if(!file){

alert("Please select PowerPoint file only");

return;

}

selectedFile = file;

renderFile();

}

function renderFile(){

fileList.innerHTML = "";

if(!selectedFile){

startScreen.style.display = "flex";

previewScreen.classList.add("hidden-screen");

successScreen.classList.add("hidden-screen");

previewScreen.style.display = "none";

successScreen.style.display = "none";

resetProgress();

return;

}

startScreen.style.display = "none";

previewScreen.classList.remove("hidden-screen");

previewScreen.style.display = "grid";

successScreen.classList.add("hidden-screen");

successScreen.style.display = "none";

fileCounter.textContent =
"1 file selected";

const card =
document.createElement("div");

card.className =
"excel-pdf-file-card";

card.innerHTML = `

<button
class="remove-file-btn"
type="button">

×

</button>

<div class="excel-file-preview">

<i class="fa-solid fa-file-powerpoint"></i>

<span>PPT</span>

</div>

<h3>${selectedFile.name}</h3>

<p>${formatFileSize(selectedFile.size)}</p>

<span class="file-order-badge">1</span>

`;

card.querySelector(".remove-file-btn")
.addEventListener("click",()=>{

selectedFile = null;

renderFile();

});

fileList.appendChild(card);

}
dropZone.addEventListener("click", () => fileInput.click());

addMoreBtn?.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", () => {

addFile(fileInput.files);

fileInput.value = "";

});

dropZone.addEventListener("dragover", (e) => {

e.preventDefault();

dropZone.classList.add("drag-active");

});

dropZone.addEventListener("dragleave", () => {

dropZone.classList.remove("drag-active");

});

dropZone.addEventListener("drop", (e) => {

e.preventDefault();

dropZone.classList.remove("drag-active");

addFile(e.dataTransfer.files);

});

convertBtn?.addEventListener("click", async () => {

if (!selectedFile) {

alert("Please select a PowerPoint file first");

return;

}

const formData = new FormData();

formData.append("powerpointFile", selectedFile);

const { data } =
await window.supabaseClient.auth.getUser();

if (!data?.user) {

alert("Please login first");

return;

}

formData.append("user_id", data.user.id);

resetProgress();

startFakeProgress();

convertBtn.disabled = true;

convertBtn.innerHTML = `

Converting...

<i class="fa-solid fa-spinner fa-spin"></i>

`;

try {

const response = await fetch("/powerpoint-to-pdf", {

method: "POST",

body: formData

});

if (!response.ok) {

const errorText = await response.text();

if (errorText.includes("Daily free limit reached")) {

const upgradeModal =
document.getElementById("upgradeModal");

if (upgradeModal) {

upgradeModal.style.display = "flex";

}

} else {

alert(errorText || "PowerPoint to PDF conversion failed");

}

return;

}

const blob = await response.blob();

if (!blob || blob.size < 100) {

alert("Conversion failed. Please try another PowerPoint file.");

return;

}

completeProgress();

if (convertedPdfUrl) {

URL.revokeObjectURL(convertedPdfUrl);

}

convertedPdfUrl =
URL.createObjectURL(blob);

setTimeout(() => {

previewScreen.classList.add("hidden-screen");

previewScreen.style.display = "none";

successScreen.classList.remove("hidden-screen");

successScreen.style.display = "flex";

}, 400);

} catch (error) {

console.error("POWERPOINT TO PDF ERROR:", error);

alert("Conversion failed. Please try again.");

} finally {

if (progressInterval)
clearInterval(progressInterval);

progressInterval = null;

convertBtn.disabled = false;

convertBtn.innerHTML = `

Convert to PDF

<i class="fa-solid fa-arrow-right"></i>

`;

}

});

downloadBtn?.addEventListener("click", () => {

if (!convertedPdfUrl) {

alert("PDF file is not ready yet");

return;

}

const a = document.createElement("a");

a.href = convertedPdfUrl;

a.download = "converted.pdf";

document.body.appendChild(a);

a.click();

a.remove();

});

const closeUpgradeModal =
document.getElementById("closeUpgradeModal");

if (closeUpgradeModal) {

closeUpgradeModal.addEventListener("click", () => {

document.getElementById("upgradeModal").style.display = "none";

});

}

});
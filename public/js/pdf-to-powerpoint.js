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

let convertedPptUrl = null;

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

function isPdf(file){

return file && (

file.type === "application/pdf" ||

file.name.toLowerCase().endsWith(".pdf")

);

}

function addFile(files){

const file =
Array.from(files || []).find(isPdf);

if(!file){

alert("Please select PDF file only");

return;

}

if(selectedFile && selectedFile.previewUrl){

URL.revokeObjectURL(
selectedFile.previewUrl
);

}

selectedFile = file;

selectedFile.previewUrl =
URL.createObjectURL(file);

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
"pdf-ppt-file-card";

card.innerHTML = `

<button
class="remove-file-btn"
type="button">

×

</button>

<div class="pdf-thumb-wrap">

<embed

src="${selectedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH"

type="application/pdf"

class="pdf-thumb"

/>

</div>

<h3>

${selectedFile.name}

</h3>

<span class="file-order-badge">

1

</span>

`;

card.querySelector(".remove-file-btn")

.addEventListener("click",()=>{

if(selectedFile.previewUrl){

URL.revokeObjectURL(
selectedFile.previewUrl
);

}

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

alert("Please select a PDF file first");

return;

}

const formData = new FormData();

formData.append("pdfFile", selectedFile);

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

const response = await fetch("/pdf-to-powerpoint", {

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

alert(errorText || "PDF to PowerPoint conversion failed");

}

return;

}

const blob = await response.blob();

if (!blob || blob.size < 100) {

alert("Conversion failed. Please try another PDF file.");

return;

}

completeProgress();

if (convertedPptUrl) {

URL.revokeObjectURL(convertedPptUrl);

}

convertedPptUrl =
URL.createObjectURL(blob);

setTimeout(() => {

previewScreen.classList.add("hidden-screen");

previewScreen.style.display = "none";

successScreen.classList.remove("hidden-screen");

successScreen.style.display = "flex";

}, 400);

} catch (error) {

console.error("PDF TO POWERPOINT ERROR:", error);

alert("Conversion failed. Please try again.");

} finally {

if (progressInterval)
clearInterval(progressInterval);

progressInterval = null;

convertBtn.disabled = false;

convertBtn.innerHTML = `

Convert to PowerPoint

<i class="fa-solid fa-arrow-right"></i>

`;

}

});

downloadBtn?.addEventListener("click", () => {

if (!convertedPptUrl) {

alert("PowerPoint file is not ready yet");

return;

}

const a = document.createElement("a");

a.href = convertedPptUrl;

a.download = "converted.pptx";

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
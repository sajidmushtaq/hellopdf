document.addEventListener("DOMContentLoaded", () => {

/* ===========================
   DRAWERS
=========================== */

const toolsMenuBtn =
document.getElementById("toolsMenuBtn");

const mainMenuBtn =
document.getElementById("mainMenuBtn");

const toolsDrawer =
document.getElementById("toolsDrawer");

const mainDrawer =
document.getElementById("mainDrawer");

const toolsClose =
document.getElementById("toolsClose");

const mainClose =
document.getElementById("mainClose");

const drawerOverlay =
document.getElementById("drawerOverlay");

const closeUpgradeModal =
document.getElementById("closeUpgradeModal");


/* ===========================
   USER
=========================== */

let currentUser = null;


/* ===========================
   SCREENS
=========================== */

const scanStartScreen =
document.getElementById("scanStartScreen");

const scanPreviewScreen =
document.getElementById("scanPreviewScreen");

const scanSuccessScreen =
document.getElementById("scanSuccessScreen");


/* ===========================
   UPLOAD
=========================== */

const dropZone =
document.getElementById("dropZone");

const fileInput =
document.getElementById("fileInput");

const addMoreInput =
document.getElementById("addMoreInput");


/* ===========================
   BUTTONS
=========================== */

const addMoreBtn =
document.getElementById("addMoreBtn");

const convertBtn =
document.getElementById("convertBtn");

const downloadBtn =
document.getElementById("downloadBtn");


/* ===========================
   UI
=========================== */

const fileList =
document.getElementById("fileList");

const fileCounter =
document.getElementById("fileCounter");

const progressBar =
document.getElementById("progressBar");


/* ===========================
   VARIABLES
=========================== */

let selectedFiles = [];

let finalPdfUrl = null;

let progressInterval = null;


/* ===========================
   RESET PROGRESS
=========================== */

function resetProgress(){

if(progressInterval){

clearInterval(progressInterval);

progressInterval = null;

}

progressBar.style.width = "0%";

progressBar.textContent = "0%";

}


/* ===========================
   START PROGRESS
=========================== */

function startFakeProgress(){

let progress = 15;

progressBar.style.width = "15%";

progressBar.textContent = "15%";

progressInterval = setInterval(()=>{

if(progress < 90){

progress += 5;

progressBar.style.width = progress + "%";

progressBar.textContent = progress + "%";

}

},600);

}


/* ===========================
   COMPLETE PROGRESS
=========================== */

function completeProgress(){

if(progressInterval){

clearInterval(progressInterval);

progressInterval = null;

}

progressBar.style.width = "100%";

progressBar.textContent = "100%";
}

/* ===========================
   SUPABASE USER
=========================== */

(async()=>{

const { data } =
await window.supabaseClient.auth.getUser();

if(data && data.user){

currentUser = data.user;

}

})();


/* ===========================
   SCREEN FUNCTIONS
=========================== */

function showStart(){

scanStartScreen.style.display = "flex";

scanPreviewScreen.classList.add("hidden-screen");
scanPreviewScreen.style.display = "none";

scanSuccessScreen.classList.add("hidden-screen");
scanSuccessScreen.style.display = "none";

}

function showPreview(){

scanStartScreen.style.display = "none";

scanPreviewScreen.classList.remove("hidden-screen");
scanPreviewScreen.style.display = "grid";

scanSuccessScreen.classList.add("hidden-screen");
scanSuccessScreen.style.display = "none";

}

function showSuccess(){

scanPreviewScreen.classList.add("hidden-screen");
scanPreviewScreen.style.display = "none";

scanSuccessScreen.classList.remove("hidden-screen");
scanSuccessScreen.style.display = "flex";

}


/* ===========================
   IMAGE VALIDATION
=========================== */

function isImage(file){

return file && (

file.type==="image/jpeg" ||
file.type==="image/png" ||
file.name.toLowerCase().endsWith(".jpg") ||
file.name.toLowerCase().endsWith(".jpeg") ||
file.name.toLowerCase().endsWith(".png")

);

}


/* ===========================
   HANDLE FILES
=========================== */

function handleFiles(files){

const validFiles =
Array.from(files).filter(isImage);

if(!validFiles.length){

alert("Please select JPG, JPEG or PNG images.");

return;

}

selectedFiles = [
...selectedFiles,
...validFiles
];

renderPreview();

}


/* ===========================
   PREVIEW
=========================== */

function renderPreview(){

showPreview();

fileList.innerHTML = "";

fileCounter.textContent =
`${selectedFiles.length} image${selectedFiles.length===1?"":"s"} selected`;

selectedFiles.forEach((file,index)=>{

const card =
document.createElement("div");

card.className =
"scan-file-card";

card.innerHTML = `

<button
class="remove-file-btn"
data-index="${index}"
type="button">

×

</button>

<div class="scan-image-preview">

<img
src="${URL.createObjectURL(file)}"
alt="${file.name}">

</div>

<h3>${file.name}</h3>

<span class="file-order-badge">

${index+1}

</span>

`;

fileList.appendChild(card);

});

document.querySelectorAll(
".remove-file-btn"
).forEach(btn=>{

btn.addEventListener("click",()=>{

const index =
Number(btn.dataset.index);

selectedFiles.splice(index,1);

if(!selectedFiles.length){

showStart();

fileList.innerHTML="";

return;

}

renderPreview();

});

});

}


/* ===========================
   EVENTS
=========================== */

dropZone.addEventListener("click",()=>{

fileInput.click();

});

addMoreBtn.addEventListener("click",()=>{

addMoreInput.click();

});

fileInput.addEventListener("change",(e)=>{

handleFiles(e.target.files);

fileInput.value="";

});

addMoreInput.addEventListener("change",(e)=>{

handleFiles(e.target.files);

addMoreInput.value="";

});

dropZone.addEventListener("dragover",(e)=>{

e.preventDefault();

dropZone.classList.add("drag-active");

});

dropZone.addEventListener("dragleave",()=>{

dropZone.classList.remove("drag-active");

});

dropZone.addEventListener("drop",(e)=>{

e.preventDefault();

dropZone.classList.remove("drag-active");

handleFiles(e.dataTransfer.files);
});
/* ===========================
   CREATE PDF
=========================== */

convertBtn.addEventListener("click", async()=>{

if(!selectedFiles.length){

alert("Please select images.");

return;

}

const formData = new FormData();

if(currentUser){

formData.append(
"user_id",
currentUser.id
);

}

selectedFiles.forEach(file=>{

formData.append(
"images",
file
);

});

resetProgress();

startFakeProgress();

convertBtn.disabled = true;

convertBtn.innerHTML =
`Creating PDF <i class="fa-solid fa-spinner fa-spin"></i>`;

try{

const response =
await fetch("/scan-to-pdf",{

method:"POST",

body:formData

});

if(!response.ok){

const text =
await response.text();

if(response.status===403){

document.getElementById(
"upgradeModal"
).style.display="flex";

throw new Error("");

}

throw new Error(
text ||
"Scan to PDF failed"
);

}

const blob =
await response.blob();

if(!blob || blob.size<100){

throw new Error(
"PDF creation failed"
);

}

if(finalPdfUrl){

URL.revokeObjectURL(
finalPdfUrl
);

finalPdfUrl = null;

}

finalPdfUrl =
URL.createObjectURL(blob);

completeProgress();

setTimeout(()=>{

showSuccess();

},400);

}catch(error){

console.error(error);

alert(
error.message ||
"Scan to PDF failed"
);

}finally{

if(progressInterval){

clearInterval(
progressInterval
);

progressInterval = null;

}

convertBtn.disabled = false;

convertBtn.innerHTML =
`Create PDF <i class="fa-solid fa-arrow-right"></i>`;

}

});


/* ===========================
   DOWNLOAD
=========================== */

downloadBtn.addEventListener("click",()=>{

if(!finalPdfUrl)
return;

const a =
document.createElement("a");

a.href = finalPdfUrl;

a.download = "scanned.pdf";

document.body.appendChild(a);

a.click();

a.remove();

setTimeout(()=>{

if(finalPdfUrl){

URL.revokeObjectURL(
finalPdfUrl
);

finalPdfUrl = null;

}

},1000);

});


/* ===========================
   DRAWERS
=========================== */

function closeDrawers(){

toolsDrawer.classList.remove("active");

mainDrawer.classList.remove("active");

drawerOverlay.classList.remove("active");

}

if(toolsMenuBtn){

toolsMenuBtn.addEventListener("click",()=>{

toolsDrawer.classList.add("active");

drawerOverlay.classList.add("active");

});

}

if(mainMenuBtn){

mainMenuBtn.addEventListener("click",()=>{

mainDrawer.classList.add("active");

drawerOverlay.classList.add("active");

});

}

if(toolsClose)
toolsClose.addEventListener(
"click",
closeDrawers
);

if(mainClose)
mainClose.addEventListener(
"click",
closeDrawers
);

if(drawerOverlay)
drawerOverlay.addEventListener(
"click",
closeDrawers
);


/* ===========================
   UPGRADE MODAL
=========================== */

if(closeUpgradeModal){

closeUpgradeModal.addEventListener("click",()=>{

document.getElementById(
"upgradeModal"
).style.display="none";

});

}


/* ===========================
   START SCREEN
=========================== */

/* ===========================
   START SCREEN + QR
=========================== */

showStart();

const scannerStatus =
document.getElementById("scannerStatus");

const qrContainer =
document.getElementById("qrContainer");


let scanSessionId = null;

async function createScanSession() {

  const response = await fetch("/scan-session", {
    method: "POST"
  });

  const data = await response.json();

  scanSessionId = data.sessionId;

  const mobileScanUrl =
    `${window.location.origin}/scan-mobile.html?session=${scanSessionId}`;

  QRCode.toCanvas(
    mobileScanUrl,
    {
      width: 220,
      margin: 2
    },
    (err, canvas) => {

      if (err) {
        console.error(err);
        scannerStatus.textContent = "QR generation failed";
        return;
      }

      qrContainer.innerHTML = "";
      qrContainer.appendChild(canvas);

      scannerStatus.textContent = "Waiting for connection...";

    }
  );

  startConnectionWatcher();

}

function startConnectionWatcher() {

  setInterval(async () => {

    if (!scanSessionId) return;

    try {

      const response =
        await fetch(`/scan-session/${scanSessionId}`);

      const data =
        await response.json();

      if (data.connected) {

        scannerStatus.innerHTML =
          `Connected <i class="fa-solid fa-circle-check"></i>`;

      }

    } catch (e) {

      console.error(e);

    }

  }, 2000);

}
createScanSession();

});
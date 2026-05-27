document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("headerContainer");

  if (headerContainer) {
    try {
      const response = await fetch("/components/header.html?v=3");
      const headerHTML = await response.text();
      headerContainer.innerHTML = headerHTML;
    } catch (err) {
      console.error("Header load failed:", err);
    }
  }

  const toolsBtn = document.getElementById("toolsMenuBtn");
  const mainBtn = document.getElementById("mainMenuBtn");
  const toolsDrawer = document.getElementById("toolsDrawer");
  const mainDrawer = document.getElementById("mainDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const toolsClose = document.getElementById("toolsClose");
  const mainClose = document.getElementById("mainClose");

  function forceHideOverlay() {
    document.body.classList.remove("modal-open");
    document.body.classList.remove("drawer-open");
    document.body.style.overflow = "auto";

    if (overlay) {
      overlay.classList.remove("active");
      overlay.removeAttribute("style");
    }
  }

  function closeDrawers() {
    if (toolsDrawer) toolsDrawer.classList.remove("active");
    if (mainDrawer) mainDrawer.classList.remove("active");
    forceHideOverlay();
  }

  function openDrawer(drawer) {
    closeDrawers();

    if (drawer) drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");

    document.body.classList.add("drawer-open");
    document.body.style.overflow = "auto";
  }

  forceHideOverlay();

  if (toolsBtn) {
    toolsBtn.addEventListener("click", () => openDrawer(toolsDrawer));
  }

  if (mainBtn) {
    mainBtn.addEventListener("click", () => openDrawer(mainDrawer));
  }

  if (toolsClose) toolsClose.addEventListener("click", closeDrawers);
  if (mainClose) mainClose.addEventListener("click", closeDrawers);
  if (overlay) overlay.addEventListener("click", closeDrawers);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawers();
  });

  document.querySelectorAll(".upgrade-btn, .premium-upgrade-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeDrawers();
      alert("Premium payment system coming soon.");
    });
  });
});
document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("headerContainer");

  if (headerContainer) {
    try {
      const response = await fetch("/components/header.html?v=2");
      const headerHTML = await response.text();
      headerContainer.innerHTML = headerHTML;
    } catch (err) {
      console.error("Header load failed:", err);
    }
  }

  document.body.classList.remove("modal-open");
  document.body.style.overflow = "auto";

  const oldAuthModal = document.getElementById("authModal");
  if (oldAuthModal) {
    oldAuthModal.remove();
  }

  const toolsBtn = document.getElementById("toolsMenuBtn");
  const mainBtn = document.getElementById("mainMenuBtn");
  const toolsDrawer = document.getElementById("toolsDrawer");
  const mainDrawer = document.getElementById("mainDrawer");
  const overlay = document.getElementById("drawerOverlay");
  const toolsClose = document.getElementById("toolsClose");
  const mainClose = document.getElementById("mainClose");

  function closeDrawers() {
    if (toolsDrawer) toolsDrawer.classList.remove("active");
    if (mainDrawer) mainDrawer.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    document.body.style.overflow = "auto";
  }

  if (toolsBtn && toolsDrawer && overlay) {
    toolsBtn.addEventListener("click", () => {
      closeDrawers();
      toolsDrawer.classList.add("active");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    });
  }

  if (mainBtn && mainDrawer && overlay) {
    mainBtn.addEventListener("click", () => {
      closeDrawers();
      mainDrawer.classList.add("active");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
    });
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
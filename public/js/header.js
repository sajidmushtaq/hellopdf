document.addEventListener("DOMContentLoaded", async () => {
  const headerContainer = document.getElementById("headerContainer");

  if (headerContainer) {
    try {
      const response = await fetch("/components/header.html?v=1");
      const headerHTML = await response.text();
      headerContainer.innerHTML = headerHTML;
    } catch (err) {
      console.error("Header load failed:", err);
    }
  }

  let loggedIn = false;

  try {
    const res = await fetch("/check-auth");
    const data = await res.json();
    loggedIn = data.loggedIn;
  } catch (err) {
    loggedIn = false;
  }

  const desktopAuthButtons = document.getElementById("desktopAuthButtons");

  if (desktopAuthButtons) {
    desktopAuthButtons.innerHTML = loggedIn
      ? `<button class="signup-btn" id="logoutBtn" type="button">Logout</button>`
      : `
        <button class="login-btn" id="loginBtn" type="button">Login</button>
        <button class="signup-btn" id="signupBtn" type="button">Sign Up</button>
      `;
  }

  if (!document.getElementById("authModal")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="auth-modal" id="authModal">
        <div class="auth-box">
          <button class="close-modal" id="closeModal" type="button">×</button>
          <h2 id="modalTitle">Login</h2>

          <input type="email" id="authEmail" placeholder="Email address">
          <input type="password" id="authPassword" placeholder="Password">

          <button class="auth-submit" id="authSubmit" type="button">Login</button>
          <p id="authMessage"></p>
        </div>
      </div>
    `);
  }

  const modal = document.getElementById("authModal");
  const modalTitle = document.getElementById("modalTitle");
  const authSubmit = document.getElementById("authSubmit");
  const authMessage = document.getElementById("authMessage");

  let mode = "login";

  function openModal(type) {
    mode = type;
    modalTitle.textContent = type === "login" ? "Login" : "Sign Up";
    authSubmit.textContent = type === "login" ? "Login" : "Create Account";
    authMessage.textContent = "";
    modal.style.display = "flex";
  }

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const closeModal = document.getElementById("closeModal");

  if (loginBtn) loginBtn.onclick = () => openModal("login");
  if (signupBtn) signupBtn.onclick = () => openModal("signup");

  if (closeModal) {
    closeModal.onclick = () => {
      modal.style.display = "none";
    };
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await fetch("/logout");
      location.reload();
    };
  }

  if (authSubmit) {
    authSubmit.onclick = async () => {
      const email = document.getElementById("authEmail").value.trim();
      const password = document.getElementById("authPassword").value.trim();

      if (!email || !password) {
        authMessage.textContent = "Please enter email and password.";
        return;
      }

      const endpoint = mode === "login" ? "/login" : "/signup";

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email, password })
        });

        const text = await res.text();

        if (!res.ok) {
          authMessage.textContent = text;
          return;
        }

        authMessage.textContent = text;

        if (mode === "login") {
          setTimeout(() => location.reload(), 700);
        }
      } catch (err) {
        authMessage.textContent = "Something went wrong.";
      }
    };
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
  }

  if (toolsBtn && toolsDrawer && overlay) {
    toolsBtn.addEventListener("click", () => {
      toolsDrawer.classList.add("active");
      overlay.classList.add("active");
    });
  }

  if (mainBtn && mainDrawer && overlay) {
    mainBtn.addEventListener("click", () => {
      mainDrawer.classList.add("active");
      overlay.classList.add("active");
    });
  }

  if (toolsClose) toolsClose.addEventListener("click", closeDrawers);
  if (mainClose) mainClose.addEventListener("click", closeDrawers);
  if (overlay) overlay.addEventListener("click", closeDrawers);
});
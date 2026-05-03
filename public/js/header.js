document.addEventListener("DOMContentLoaded", async () => {
  const oldHeader = document.querySelector(".main-header");
  if (oldHeader) oldHeader.remove();

  let loggedIn = false;

  try {
    const res = await fetch("/check-auth");
    const data = await res.json();
    loggedIn = data.loggedIn;
  } catch (err) {
    loggedIn = false;
  }

  document.body.insertAdjacentHTML("afterbegin", `
    <header class="main-header">
      <div class="header-container">
        <a href="index.html" class="site-logo">HelloPDF</a>

        <nav class="main-nav">
          <a href="index.html">Home</a>
          <a href="index.html#convert-tools">Tools</a>
        </nav>

        <div class="header-actions">
          ${
            loggedIn
              ? `<button class="signup-link" id="logoutBtn">Logout</button>`
              : `
                <button class="login-link" id="loginBtn">Login</button>
                <button class="signup-link" id="signupBtn">Sign Up</button>
              `
          }
        </div>
      </div>
    </header>

    <div class="auth-modal" id="authModal">
      <div class="auth-box">
        <button class="close-modal" id="closeModal">×</button>
        <h2 id="modalTitle">Login</h2>

        <input type="email" id="authEmail" placeholder="Email address">
        <input type="password" id="authPassword" placeholder="Password">

        <button class="auth-submit" id="authSubmit">Login</button>
        <p id="authMessage"></p>
      </div>
    </div>
  `);

  const modal = document.getElementById("authModal");
  const modalTitle = document.getElementById("modalTitle");
  const authSubmit = document.getElementById("authSubmit");
  const authMessage = document.getElementById("authMessage");

  let mode = "login";

  const openModal = (type) => {
    mode = type;
    modalTitle.textContent = type === "login" ? "Login" : "Sign Up";
    authSubmit.textContent = type === "login" ? "Login" : "Create Account";
    authMessage.textContent = "";
    modal.style.display = "flex";
  };

  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginBtn) loginBtn.onclick = () => openModal("login");
  if (signupBtn) signupBtn.onclick = () => openModal("signup");

  document.getElementById("closeModal").onclick = () => {
    modal.style.display = "none";
  };

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await fetch("/logout");
      location.reload();
    };
  }

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
});
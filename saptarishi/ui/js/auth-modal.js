// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Login / register popup modal. */

(function authModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const DEFAULT_LEAD =
    "Try 5 free kundali and 2 free auspicious scans without login. " +
    "After that, sign in or register for premium access.";

  const PREMIUM_LEAD =
    "Your free limit is used. Login or register to continue with premium access.";

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let loginForm = null;
  let registerForm = null;
  let leadEl = null;

  function ensureMounted() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "auth-modal-overlay";
    overlay.className = "auth-modal-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `
      <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <button type="button" class="auth-modal__close" id="auth-modal-close" aria-label="Close">&times;</button>
        <h2 id="auth-modal-title" class="auth-modal__title">Saptarishi</h2>
        <p id="auth-modal-lead" class="auth-modal__lead"></p>
        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tabs__btn auth-tabs__btn--active" data-tab="login" role="tab" aria-selected="true">Login</button>
          <button type="button" class="auth-tabs__btn" data-tab="register" role="tab" aria-selected="false">Register</button>
        </div>
        <div id="auth-modal-panel-login" class="auth-modal__panel">
          <form id="auth-modal-login-form" class="auth-form" autocomplete="on">
            <div class="form-field">
              <label for="auth-modal-login-mobile">Mobile number</label>
              <input type="tel" id="auth-modal-login-mobile" inputmode="numeric" required placeholder="10-digit mobile" />
            </div>
            <div class="form-field">
              <label for="auth-modal-login-password">Password</label>
              <input type="password" id="auth-modal-login-password" required minlength="4" />
            </div>
            <div class="form-field form-field--submit">
              <button type="submit">Sign in</button>
            </div>
          </form>
        </div>
        <div id="auth-modal-panel-register" class="auth-modal__panel auth-modal__panel--hidden" hidden>
          <form id="auth-modal-register-form" class="auth-form" autocomplete="on">
            <div class="form-field">
              <label for="auth-modal-reg-name">Full name</label>
              <input type="text" id="auth-modal-reg-name" required maxlength="120" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-mobile">Mobile number</label>
              <input type="tel" id="auth-modal-reg-mobile" inputmode="numeric" required placeholder="10-digit mobile" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-email">Email</label>
              <input type="email" id="auth-modal-reg-email" required maxlength="240" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-password">Password</label>
              <input type="password" id="auth-modal-reg-password" required minlength="4" />
            </div>
            <div class="form-field form-field--submit">
              <button type="submit">Create account</button>
            </div>
          </form>
        </div>
        <p id="auth-modal-status" class="status auth-modal__status" role="status" aria-live="polite" hidden></p>
      </div>
    `;
    document.body.appendChild(overlay);

    statusEl = overlay.querySelector("#auth-modal-status");
    leadEl = overlay.querySelector("#auth-modal-lead");
    loginForm = overlay.querySelector("#auth-modal-login-form");
    registerForm = overlay.querySelector("#auth-modal-register-form");

    overlay.querySelector("#auth-modal-close").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && overlay.dataset.required !== "true") {
        close(false);
      }
    });

    overlay.querySelectorAll(".auth-tabs__btn").forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay && !overlay.hidden && overlay.dataset.required !== "true") {
        close(false);
      }
    });

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showStatus("Signing in…");
      try {
        await AUTH.login(
          overlay.querySelector("#auth-modal-login-mobile").value,
          overlay.querySelector("#auth-modal-login-password").value
        );
        finishSuccess();
      } catch (err) {
        showStatus(err.message || "Login failed", true);
      }
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showStatus("Creating account…");
      try {
        await AUTH.register(
          overlay.querySelector("#auth-modal-reg-name").value,
          overlay.querySelector("#auth-modal-reg-mobile").value,
          overlay.querySelector("#auth-modal-reg-email").value,
          overlay.querySelector("#auth-modal-reg-password").value
        );
        finishSuccess();
      } catch (err) {
        showStatus(err.message || "Registration failed", true);
      }
    });
  }

  function showStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function setActiveTab(tab) {
    const isLogin = tab !== "register";
    overlay.querySelectorAll(".auth-tabs__btn").forEach((btn) => {
      const active = btn.dataset.tab === (isLogin ? "login" : "register");
      btn.classList.toggle("auth-tabs__btn--active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });

    const loginPanel = overlay.querySelector("#auth-modal-panel-login");
    const registerPanel = overlay.querySelector("#auth-modal-panel-register");
    if (loginPanel) {
      loginPanel.hidden = !isLogin;
      loginPanel.classList.toggle("auth-modal__panel--hidden", !isLogin);
    }
    if (registerPanel) {
      registerPanel.hidden = isLogin;
      registerPanel.classList.toggle("auth-modal__panel--hidden", isLogin);
    }
    showStatus("");
  }

  function finishSuccess() {
    hide();
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: AUTH.getUser(), usage: AUTH.getUsage() }
      })
    );
    if (resolvePending) {
      resolvePending(true);
      resolvePending = null;
    }
  }

  function hide() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove("auth-modal-open");
    showStatus("");
  }

  function close(success) {
    if (overlay && overlay.dataset.required === "true" && !success) return;
    hide();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function open(options = {}) {
    ensureMounted();
    const tab = options.tab === "register" ? "register" : "login";
    const required = Boolean(options.required);
    const isPremium = options.reason === "premium";

    if (leadEl) {
      leadEl.textContent = options.message || (isPremium ? PREMIUM_LEAD : DEFAULT_LEAD);
    }

    setActiveTab(tab);
    overlay.dataset.required = required ? "true" : "false";
    overlay.querySelector("#auth-modal-close").hidden = required;
    overlay.hidden = false;
    document.body.classList.add("auth-modal-open");

    const firstInput = overlay.querySelector(
      tab === "register" ? "#auth-modal-reg-name" : "#auth-modal-login-mobile"
    );
    if (firstInput) {
      window.requestAnimationFrame(() => firstInput.focus());
    }

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  global.SaptarishiAuthModal = { open, close, hide, setActiveTab };
})(window);

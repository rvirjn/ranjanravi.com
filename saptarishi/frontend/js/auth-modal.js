// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Login / register popup modal. */

(function authModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const DEFAULT_LEAD =
    "Try 2 free queries per device without login (kundali or auspicious). " +
    "After that, sign in or register for premium access.";

  const PREMIUM_LEAD =
    "Your free limit is used. Sign in, pay via the QR, and verify your coupon code (₹299 for 6 queries or ₹1899 for unlimited).";

  const FORGOT_LEAD =
    "Enter the mobile number and email on your account. If they match, we email you a temporary password.";

  const LOADING = global.SaptarishiLoading;
  const CU = global.SaptarishiCommonUtils || null;

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let loginForm = null;
  let registerForm = null;
  let forgotForm = null;
  let leadEl = null;
  let authBusy = false;
  let activePanel = "login";

  function ensureAuthModalMounted() {
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
              <input type="tel" id="auth-modal-login-mobile" name="mobile" inputmode="numeric" autocomplete="tel" required placeholder="e.g. 9876543210" />
            </div>
            <div class="form-field">
              <label for="auth-modal-login-password">Password</label>
              <input type="password" id="auth-modal-login-password" name="password" autocomplete="current-password" required minlength="4" placeholder="Enter your password" />
            </div>
            <p class="auth-modal__forgot-wrap">
              <button type="button" class="auth-modal__forgot-link" id="auth-modal-forgot-link">Forgot password?</button>
            </p>
            <div class="form-field form-field--submit">
              <button type="submit">Sign in</button>
            </div>
          </form>
        </div>
        <div id="auth-modal-panel-forgot" class="auth-modal__panel auth-modal__panel--hidden" hidden>
          <form id="auth-modal-forgot-form" class="auth-form" autocomplete="on">
            <div class="form-field">
              <label for="auth-modal-forgot-mobile">Mobile number</label>
              <input type="tel" id="auth-modal-forgot-mobile" name="mobile" inputmode="numeric" autocomplete="tel" required placeholder="e.g. 9876543210" />
            </div>
            <div class="form-field">
              <label for="auth-modal-forgot-email">Email</label>
              <input type="email" id="auth-modal-forgot-email" name="email" autocomplete="email" required maxlength="240" placeholder="you@example.com" />
            </div>
            <div class="form-field form-field--submit">
              <button type="submit">Send temporary password</button>
            </div>
            <p class="auth-modal__forgot-wrap">
              <button type="button" class="auth-modal__forgot-link" id="auth-modal-forgot-back">Back to sign in</button>
            </p>
          </form>
        </div>
        <div id="auth-modal-panel-register" class="auth-modal__panel auth-modal__panel--hidden" hidden>
          <form id="auth-modal-register-form" class="auth-form" autocomplete="on">
            <div class="form-field">
              <label for="auth-modal-reg-name">Full name</label>
              <input type="text" id="auth-modal-reg-name" name="name" autocomplete="name" required maxlength="120" placeholder="Your full name" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-mobile">Mobile number</label>
              <input type="tel" id="auth-modal-reg-mobile" name="mobile" inputmode="numeric" autocomplete="tel" required placeholder="e.g. 9876543210" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-email">Email</label>
              <input type="email" id="auth-modal-reg-email" name="email" autocomplete="email" required maxlength="240" placeholder="you@example.com" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-password">Password</label>
              <input type="password" id="auth-modal-reg-password" name="new-password" autocomplete="new-password" required minlength="4" placeholder="At least 4 characters" />
            </div>
            <div class="form-field">
              <label for="auth-modal-reg-password-confirm">Confirm password</label>
              <input type="password" id="auth-modal-reg-password-confirm" name="confirm-password" autocomplete="new-password" required minlength="4" placeholder="Re-enter password" />
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
    forgotForm = overlay.querySelector("#auth-modal-forgot-form");

    overlay.querySelector("#auth-modal-close").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && overlay.dataset.required !== "true") {
        close(false);
      }
    });

    overlay.querySelectorAll(".auth-tabs__btn").forEach((btn) => {
      btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
    });

    overlay.querySelector("#auth-modal-forgot-link").addEventListener("click", () => {
      if (authBusy) return;
      setActiveTab("forgot");
    });
    overlay.querySelector("#auth-modal-forgot-back").addEventListener("click", () => {
      if (authBusy) return;
      setActiveTab("login");
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay && !overlay.hidden && overlay.dataset.required !== "true") {
        close(false);
      }
    });

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      startAuthLoading();
      try {
        await AUTH.login(
          overlay.querySelector("#auth-modal-login-mobile").value,
          overlay.querySelector("#auth-modal-login-password").value
        );
        stopAuthLoading();
        completeAuthSuccessFlow();
      } catch (err) {
        stopAuthLoading();
        showStatus(err.message || "Login failed", true);
      }
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const password = overlay.querySelector("#auth-modal-reg-password").value;
      const confirmPassword = overlay.querySelector("#auth-modal-reg-password-confirm").value;
      if (password !== confirmPassword) {
        showStatus("Passwords do not match", true);
        return;
      }
      startAuthLoading();
      try {
        await AUTH.register(
          overlay.querySelector("#auth-modal-reg-name").value,
          overlay.querySelector("#auth-modal-reg-mobile").value,
          overlay.querySelector("#auth-modal-reg-email").value,
          password,
          confirmPassword
        );
        stopAuthLoading();
        completeAuthSuccessFlow();
      } catch (err) {
        stopAuthLoading();
        showStatus(err.message || "Registration failed", true);
      }
    });

    forgotForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      startAuthLoading();
      try {
        const payload = await AUTH.forgotPassword(
          overlay.querySelector("#auth-modal-forgot-mobile").value,
          overlay.querySelector("#auth-modal-forgot-email").value
        );
        stopAuthLoading();
        showStatus(
          payload.message ||
            "If that mobile and email match an account, a temporary password was sent to your email.",
          false
        );
      } catch (err) {
        stopAuthLoading();
        showStatus(err.message || "Could not reset password", true);
      }
    });
  }

  function setAuthBusy(busy) {
    authBusy = busy;
    if (!overlay) return;
    [loginForm, registerForm, forgotForm].forEach((form) => {
      if (!form) return;
      form.querySelectorAll("input, button[type='submit']").forEach((el) => {
        el.disabled = busy;
      });
    });
    overlay.querySelectorAll(".auth-tabs__btn").forEach((btn) => {
      btn.disabled = busy;
    });
    const forgotLink = overlay.querySelector("#auth-modal-forgot-link");
    const forgotBack = overlay.querySelector("#auth-modal-forgot-back");
    if (forgotLink) forgotLink.disabled = busy;
    if (forgotBack) forgotBack.disabled = busy;
    const closeBtn = overlay.querySelector("#auth-modal-close");
    if (closeBtn) closeBtn.disabled = busy && overlay.dataset.required !== "true";
  }

  function startAuthLoading() {
    setAuthBusy(true);
    if (LOADING && statusEl) {
      LOADING.startStatusLoadingIndicator(statusEl);
      return;
    }
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.classList.remove("error");
      statusEl.textContent = "Please wait…";
    }
  }

  function stopAuthLoading() {
    setAuthBusy(false);
    if (LOADING && statusEl) {
      LOADING.stopStatusLoadingIndicator(statusEl);
    }
  }

  function showStatus(message, isError) {
    if (CU && CU.setStatusMessage) {
      CU.setStatusMessage(statusEl, message, isError, false);
      return;
    }
    if (!statusEl) return;
    if (LOADING) LOADING.stopStatusLoadingIndicator(statusEl);
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.remove("status--loading");
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function setActiveTab(tab) {
    if (authBusy) return;
    activePanel = tab === "register" ? "register" : tab === "forgot" ? "forgot" : "login";
    const isForgot = activePanel === "forgot";
    const isLogin = activePanel === "login";
    const isRegister = activePanel === "register";

    const tabsEl = overlay.querySelector(".auth-tabs");
    if (tabsEl) tabsEl.hidden = isForgot;

    overlay.querySelectorAll(".auth-tabs__btn").forEach((btn) => {
      const active =
        (btn.dataset.tab === "login" && isLogin) || (btn.dataset.tab === "register" && isRegister);
      btn.classList.toggle("auth-tabs__btn--active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
      btn.hidden = false;
    });

    const loginPanel = overlay.querySelector("#auth-modal-panel-login");
    const registerPanel = overlay.querySelector("#auth-modal-panel-register");
    const forgotPanel = overlay.querySelector("#auth-modal-panel-forgot");
    if (loginPanel) {
      loginPanel.hidden = !isLogin;
      loginPanel.classList.toggle("auth-modal__panel--hidden", !isLogin);
    }
    if (registerPanel) {
      registerPanel.hidden = !isRegister;
      registerPanel.classList.toggle("auth-modal__panel--hidden", !isRegister);
    }
    if (forgotPanel) {
      forgotPanel.hidden = !isForgot;
      forgotPanel.classList.toggle("auth-modal__panel--hidden", !isForgot);
    }

    if (leadEl) {
      if (isForgot) {
        leadEl.textContent = FORGOT_LEAD;
      } else if (overlay.dataset.lead) {
        leadEl.textContent = overlay.dataset.lead;
      }
    }
    showStatus("");
  }

  function completeAuthSuccessFlow() {
    hideAuthModal();
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

  function hideAuthModal() {
    if (!overlay) return;
    stopAuthLoading();
    overlay.hidden = true;
    document.body.classList.remove("auth-modal-open");
    showStatus("");
  }

  function close(success) {
    if (overlay && overlay.dataset.required === "true" && !success) return;
    hideAuthModal();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function openAuthModal(options = {}) {
    ensureAuthModalMounted();
    const tab =
      options.tab === "register" ? "register" : options.tab === "forgot" ? "forgot" : "login";
    const required = Boolean(options.required);
    const isPremium = options.reason === "premium";

    if (leadEl) {
      leadEl.textContent =
        options.message ||
        (tab === "forgot" ? FORGOT_LEAD : isPremium ? PREMIUM_LEAD : DEFAULT_LEAD);
      overlay.dataset.lead = leadEl.textContent;
    }

    setActiveTab(tab);
    overlay.dataset.required = required ? "true" : "false";
    overlay.querySelector("#auth-modal-close").hidden = required;
    overlay.hidden = false;
    document.body.classList.add("auth-modal-open");

    const firstInput = overlay.querySelector(
      tab === "register"
        ? "#auth-modal-reg-name"
        : tab === "forgot"
          ? "#auth-modal-forgot-mobile"
          : "#auth-modal-login-mobile"
    );
    if (firstInput) {
      window.requestAnimationFrame(() => firstInput.focus());
    }

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  // Backward-compatible aliases for existing callers.
  const open = openAuthModal;
  const hide = hideAuthModal;
  global.SaptarishiAuthModal = {
    openAuthModal,
    close,
    hideAuthModal,
    setActiveTab,
    open,
    hide
  };
})(window);

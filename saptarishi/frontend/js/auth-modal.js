// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Login / register popup modal. */

(function authModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const LOADING = global.SaptarishiLoading;
  const FORGOT_LEAD =
    "Enter the mobile number and email on your account. If they match, we email you a temporary password.";

  function formUtils() {
    return global.SaptarishiCommonUtils || {};
  }

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
        <p id="auth-modal-lead" class="auth-modal__lead" hidden></p>
        <div class="auth-tabs" role="tablist">
          <button type="button" class="auth-tabs__btn auth-tabs__btn--active" data-tab="login" role="tab" aria-selected="true">Login</button>
          <button type="button" class="auth-tabs__btn" data-tab="register" role="tab" aria-selected="false">Register</button>
        </div>
        <div id="auth-modal-panel-login" class="auth-modal__panel">
          <form id="auth-modal-login-form" class="auth-form" autocomplete="on" novalidate>
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
          <form id="auth-modal-forgot-form" class="auth-form" autocomplete="on" novalidate>
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
          <form id="auth-modal-register-form" class="auth-form" autocomplete="on" novalidate>
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
    const utils = global.SaptarishiCommonUtils;
    if (utils && utils.applyFormFieldLimits) utils.applyFormFieldLimits(overlay);

    statusEl = overlay.querySelector("#auth-modal-status");
    leadEl = overlay.querySelector("#auth-modal-lead");
    loginForm = overlay.querySelector("#auth-modal-login-form");
    registerForm = overlay.querySelector("#auth-modal-register-form");
    forgotForm = overlay.querySelector("#auth-modal-forgot-form");

    overlay.querySelector("#auth-modal-close").addEventListener("click", () => close(false));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay && !authBusy) {
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
      if (event.key === "Escape" && overlay && !overlay.hidden && !authBusy) {
        close(false);
      }
    });

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mobile = overlay.querySelector("#auth-modal-login-mobile").value;
      const password = overlay.querySelector("#auth-modal-login-password").value;
      const loginError = formUtils().validateLoginInput
        ? formUtils().validateLoginInput(mobile, password)
        : null;
      if (loginError) {
        showStatus(loginError, true);
        return;
      }
      startAuthLoading();
      try {
        await AUTH.login(mobile, password);
        stopAuthLoading();
        completeAuthSuccessFlow();
      } catch (err) {
        stopAuthLoading();
        showStatus(err.message || "Login failed", true);
      }
    });

    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = overlay.querySelector("#auth-modal-reg-name").value;
      const mobile = overlay.querySelector("#auth-modal-reg-mobile").value;
      const email = overlay.querySelector("#auth-modal-reg-email").value;
      const password = overlay.querySelector("#auth-modal-reg-password").value;
      const confirmPassword = overlay.querySelector("#auth-modal-reg-password-confirm").value;
      const registerError = formUtils().validateRegisterInput
        ? formUtils().validateRegisterInput(name, mobile, email, password, confirmPassword)
        : password !== confirmPassword
          ? "Passwords do not match."
          : null;
      if (registerError) {
        showStatus(registerError, true);
        return;
      }
      startAuthLoading();
      try {
        await AUTH.register(name, mobile, email, password, confirmPassword);
        stopAuthLoading();
        completeAuthSuccessFlow();
      } catch (err) {
        stopAuthLoading();
        showStatus(err.message || "Registration failed", true);
      }
    });

    forgotForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const mobile = overlay.querySelector("#auth-modal-forgot-mobile").value;
      const email = overlay.querySelector("#auth-modal-forgot-email").value;
      const forgotError = formUtils().validateForgotPasswordInput
        ? formUtils().validateForgotPasswordInput(mobile, email)
        : null;
      if (forgotError) {
        showStatus(forgotError, true);
        return;
      }
      startAuthLoading();
      try {
        const payload = await AUTH.forgotPassword(mobile, email);
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
      form.querySelectorAll("input, button[type='submit'], .password-field__toggle").forEach((el) => {
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
    if (closeBtn) closeBtn.disabled = busy;
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
    const utils = formUtils();
    if (utils.setStatusMessage) {
      utils.setStatusMessage(statusEl, message, isError, false);
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

    setLeadText(isForgot ? FORGOT_LEAD : overlay.dataset.lead || "");
    showStatus("");
  }

  function setLeadText(text) {
    if (!leadEl) return;
    const value = text || "";
    leadEl.textContent = value;
    leadEl.hidden = !value;
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
    hideAuthModal();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function isOpen() {
    return Boolean(overlay && !overlay.hidden);
  }

  /** Always hide (hardware back). Required sign-in can be skipped. */
  function dismiss() {
    if (!isOpen()) return false;
    hideAuthModal();
    if (resolvePending) {
      resolvePending(false);
      resolvePending = null;
    }
    return true;
  }

  function openAuthModal(options = {}) {
    ensureAuthModalMounted();
    const tab =
      options.tab === "register" ? "register" : options.tab === "forgot" ? "forgot" : "login";

    const lead = options.message || (tab === "forgot" ? FORGOT_LEAD : "Sign in to continue.");
    overlay.dataset.lead = lead;
    setLeadText(lead);

    setActiveTab(tab);
    overlay.dataset.required = options.required ? "true" : "false";
    overlay.querySelector("#auth-modal-close").hidden = false;
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
    hide,
    isOpen,
    dismiss
  };
})(window);

// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Buy Premium modal: QR scan and coupon verification. */

(function premiumModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const AC =
    typeof SAPTARISHI_CONSTANTS !== "undefined"
      ? SAPTARISHI_CONSTANTS
      : {
          PREMIUM_AMOUNT_INR: 499,
          PREMIUM_CONTACT_PHONE: "8184046618",
          PREMIUM_SCANNER_IMAGE: "../images/RaviRanjanScanner.png",
          API_PREMIUM_ACTIVATE_PATH: "/api/premium/activate",
          API_PREMIUM_INFO_PATH: "/api/premium/info"
        };

  const LOADING = global.SaptarishiLoading;

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let form = null;
  let amountEl = null;
  let contactPhoneEl = null;
  let leadEl = null;
  let successPanel = null;
  let paymentPanel = null;
  let busy = false;

  function scannerImageUrl() {
    const rel = AC.PREMIUM_SCANNER_IMAGE || "../images/RaviRanjanScanner.png";
    if (/^https?:\/\//i.test(rel)) return rel;
    const pageDir = window.location.pathname.replace(/\/[^/]+$/, "");
    if (rel.startsWith("../")) {
      const parentDir = pageDir.replace(/\/[^/]+$/, "");
      return `${parentDir}/${rel.slice(3)}`;
    }
    return `${pageDir}/${rel.replace(/^\.\//, "")}`;
  }

  function ensureMounted() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "premium-modal-overlay";
    overlay.className = "premium-modal-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `
      <div class="premium-modal" role="dialog" aria-modal="true" aria-labelledby="premium-modal-title">
        <button type="button" class="premium-modal__close" id="premium-modal-close" aria-label="Close">&times;</button>
        <h2 id="premium-modal-title" class="premium-modal__title">Buy Premium</h2>
        <p id="premium-modal-lead" class="premium-modal__lead"></p>
        <div id="premium-modal-payment-panel" class="premium-modal__panel">
          <div class="premium-modal__qr-wrap">
            <img
              id="premium-modal-qr"
              class="premium-modal__qr"
              src="${scannerImageUrl()}"
              alt="PhonePe QR code for Premium payment"
              width="240"
              height="240"
            />
          </div>
          <p class="premium-modal__amount">
            Amount: <strong id="premium-modal-amount">₹${AC.PREMIUM_AMOUNT_INR || 499}</strong> ·
          </p>
          <ol class="premium-modal__steps">
            <li>Scan the QR code and complete payment in PhonePe or any UPI app.</li>
            <li>
              You will get a coupon code on your email and phone from
              <strong id="premium-modal-phone">${AC.PREMIUM_CONTACT_PHONE || "8184046618"}</strong>
              enter that below.
            </li>
          </ol>
          <form id="premium-modal-form" class="premium-modal__form" autocomplete="off">
            <div class="form-field">
              <label for="premium-modal-coupon">Enter coupon code</label>
              <input
                type="text"
                id="premium-modal-coupon"
                required
                minlength="4"
                maxlength="32"
                placeholder="e.g. SAPTAR2026"
                autocapitalize="characters"
                spellcheck="false"
              />
            </div>
            <div class="form-field form-field--submit">
              <button type="submit" id="premium-modal-submit">Verify</button>
            </div>
          </form>
        </div>
        <div id="premium-modal-success-panel" class="premium-modal__panel premium-modal__panel--success" hidden>
          <p class="premium-modal__success">Premium is active. Enjoy unlimited kundali and auspicious scans.</p>
          <button type="button" class="premium-modal__done" id="premium-modal-done">Continue</button>
        </div>
        <p id="premium-modal-status" class="status premium-modal__status" role="status" aria-live="polite" hidden></p>
      </div>
    `;
    document.body.appendChild(overlay);

    statusEl = overlay.querySelector("#premium-modal-status");
    leadEl = overlay.querySelector("#premium-modal-lead");
    form = overlay.querySelector("#premium-modal-form");
    amountEl = overlay.querySelector("#premium-modal-amount");
    contactPhoneEl = overlay.querySelector("#premium-modal-phone");
    successPanel = overlay.querySelector("#premium-modal-success-panel");
    paymentPanel = overlay.querySelector("#premium-modal-payment-panel");

    overlay.querySelector("#premium-modal-close").addEventListener("click", () => close(false));
    overlay.querySelector("#premium-modal-done").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && overlay && !overlay.hidden) {
        close(false);
      }
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (busy) return;

      if (!AUTH.getToken()) {
        showStatus("Please sign in first, then verify your coupon code.", true);
        return;
      }

      const coupon = overlay.querySelector("#premium-modal-coupon").value.trim();
      setBusy(true);
      startLoading();
      try {
        const payload = await AUTH.activatePremium(coupon);
        stopLoading();
        setBusy(false);
        showSuccess(payload.message);
      } catch (err) {
        stopLoading();
        setBusy(false);
        showStatus(err.message || "Could not verify coupon code.", true);
      }
    });
  }

  async function loadPremiumInfo() {
    try {
      const payload = await AUTH.apiFetch(AC.API_PREMIUM_INFO_PATH || "/api/premium/info");
      if (amountEl && payload.amount_inr != null) {
        amountEl.textContent = `₹${payload.amount_inr}`;
      }
      if (contactPhoneEl && payload.contact_phone) {
        contactPhoneEl.textContent = payload.contact_phone;
      }
    } catch {
      /* keep defaults from constants */
    }
  }

  function setBusy(value) {
    busy = value;
    if (!form) return;
    form.querySelectorAll("input, button").forEach((el) => {
      el.disabled = value;
    });
    const closeBtn = overlay.querySelector("#premium-modal-close");
    if (closeBtn) closeBtn.disabled = value;
  }

  function startLoading() {
    if (LOADING && statusEl) {
      LOADING.start(statusEl);
      return;
    }
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.classList.remove("error");
      statusEl.textContent = "Verifying coupon…";
    }
  }

  function stopLoading() {
    if (LOADING && statusEl) {
      LOADING.stop(statusEl);
    }
  }

  function showStatus(message, isError) {
    if (!statusEl) return;
    if (LOADING) LOADING.stop(statusEl);
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.remove("status--loading");
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function showSuccess(message) {
    if (paymentPanel) paymentPanel.hidden = true;
    if (successPanel) {
      successPanel.hidden = false;
      const text = successPanel.querySelector(".premium-modal__success");
      if (text && message) text.textContent = message;
    }
    showStatus("");
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

  function resetPanels() {
    if (paymentPanel) paymentPanel.hidden = false;
    if (successPanel) successPanel.hidden = true;
    if (form) form.reset();
    showStatus("");
  }

  function hide() {
    if (!overlay) return;
    stopLoading();
    setBusy(false);
    overlay.hidden = true;
    document.body.classList.remove("premium-modal-open");
  }

  function close(success) {
    hide();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function open(options = {}) {
    ensureMounted();
    resetPanels();

    const user = AUTH.getUser();
    if (leadEl) {
      leadEl.textContent =
        options.message ||
        (user && user.is_premium
          ? "Premium is already active on your account."
          : "Unlimited kundali and auspicious scans after one-time payment.");
    }

    if (user && user.is_premium) {
      showSuccess("Premium is already active on your account.");
    }

    overlay.hidden = false;
    document.body.classList.add("premium-modal-open");
    loadPremiumInfo();

    const couponInput = overlay.querySelector("#premium-modal-coupon");
    if (couponInput && !user?.is_premium) {
      window.requestAnimationFrame(() => couponInput.focus());
    }

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  global.SaptarishiPremiumModal = { open, close, hide };
})(window);

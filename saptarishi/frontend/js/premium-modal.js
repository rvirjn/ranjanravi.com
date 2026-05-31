// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Buy Premium modal: QR scan and coupon verification. */

(function premiumModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const AC =
    typeof SAPTARISHI_CONSTANTS !== "undefined"
      ? SAPTARISHI_CONSTANTS
      : {
          PREMIUM_PACK_AMOUNT_INR: 299,
          PREMIUM_PACK_QUERY_LIMIT: 50,
          PREMIUM_UNLIMITED_AMOUNT_INR: 1899,
          PREMIUM_CONTACT_PHONE: "8184046618",
          PREMIUM_SCANNER_IMAGE: "../images/RaviRanjanScanner.png",
          API_PREMIUM_ACTIVATE_PATH: "/api/premium/activate",
          API_PREMIUM_INFO_PATH: "/api/premium/info"
        };

  const DEFAULT_PLANS = [
    {
      id: "pack_50",
      amount_inr: AC.PREMIUM_PACK_AMOUNT_INR || 299,
      query_limit: AC.PREMIUM_PACK_QUERY_LIMIT || 50
    },
    {
      id: "unlimited",
      amount_inr: AC.PREMIUM_UNLIMITED_AMOUNT_INR || 1899,
      query_limit: null
    }
  ];

  const LOADING = global.SaptarishiLoading;

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let form = null;
  let amountEl = null;
  let planSummaryEl = null;
  let contactPhoneEl = null;
  let leadEl = null;
  let successPanel = null;
  let paymentPanel = null;
  let planPickerEl = null;
  let busy = false;
  let plans = DEFAULT_PLANS.slice();
  let selectedPlanId = "pack_50";

  function scannerImageUrl() {
    const rel = AC.PREMIUM_SCANNER_IMAGE || "/frontend/images/RaviRanjanScanner.png";
    if (/^https?:\/\//i.test(rel) || rel.startsWith("/")) return rel;
    return `/frontend/html/${rel.replace(/^\.\//, "")}`;
  }

  function planById(planId) {
    return plans.find((plan) => plan.id === planId) || plans[0] || DEFAULT_PLANS[0];
  }

  function planLabel(plan) {
    if (!plan) return "";
    if (plan.id === "unlimited") return `Unlimited (1 month) · ₹${plan.amount_inr}`;
    const limit = plan.query_limit ?? AC.PREMIUM_PACK_QUERY_LIMIT ?? 50;
    return `${limit} queries · ₹${plan.amount_inr}`;
  }

  function planDescription(plan) {
    if (!plan) return "";
    if (plan.id === "unlimited") {
      const months = plan.duration_months || AC.PREMIUM_UNLIMITED_MONTHS || 1;
      return `Unlimited kundali and auspicious scans for ${months} month(s).`;
    }
    const limit = plan.query_limit ?? AC.PREMIUM_PACK_QUERY_LIMIT ?? 50;
    return `${limit} kundali or auspicious queries combined.`;
  }

  function renderPlanPicker() {
    if (!planPickerEl) return;
    planPickerEl.replaceChildren();
    for (const plan of plans) {
      const label = document.createElement("label");
      label.className = "premium-modal__plan";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "premium-plan";
      input.value = plan.id;
      input.checked = plan.id === selectedPlanId;
      input.addEventListener("change", () => {
        if (input.checked) {
          selectedPlanId = plan.id;
          updateSelectedPlanDisplay();
        }
      });
      const text = document.createElement("span");
      text.className = "premium-modal__plan-text";
      text.textContent = planLabel(plan);
      const detail = document.createElement("span");
      detail.className = "premium-modal__plan-detail";
      detail.textContent = planDescription(plan);
      label.append(input, text, detail);
      planPickerEl.appendChild(label);
    }
    updateSelectedPlanDisplay();
  }

  function updateSelectedPlanDisplay() {
    const plan = planById(selectedPlanId);
    if (amountEl && plan) {
      amountEl.textContent = `₹${plan.amount_inr}`;
    }
    if (planSummaryEl && plan) {
      planSummaryEl.textContent = planDescription(plan);
    }
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
          <div id="premium-modal-plan-picker" class="premium-modal__plans" role="radiogroup" aria-label="Choose a plan"></div>
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
            Amount: <strong id="premium-modal-amount">₹${AC.PREMIUM_PACK_AMOUNT_INR || 299}</strong>
          </p>
          <p id="premium-modal-plan-summary" class="premium-modal__plan-summary"></p>
          <ol class="premium-modal__steps">
            <li>Select a plan, scan the QR code, and complete payment in PhonePe or any UPI app.</li>
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
          <p class="premium-modal__success">Premium is active.</p>
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
    planSummaryEl = overlay.querySelector("#premium-modal-plan-summary");
    contactPhoneEl = overlay.querySelector("#premium-modal-phone");
    successPanel = overlay.querySelector("#premium-modal-success-panel");
    paymentPanel = overlay.querySelector("#premium-modal-payment-panel");
    planPickerEl = overlay.querySelector("#premium-modal-plan-picker");

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

    renderPlanPicker();
  }

  async function loadPremiumInfo() {
    try {
      const payload = await AUTH.apiFetch(AC.API_PREMIUM_INFO_PATH || "/api/premium/info");
      if (Array.isArray(payload.plans) && payload.plans.length) {
        plans = payload.plans.map((plan) => ({
          id: plan.id,
          amount_inr: plan.amount_inr,
          query_limit: plan.query_limit,
          duration_months: plan.duration_months
        }));
        if (!plans.some((plan) => plan.id === selectedPlanId)) {
          selectedPlanId = plans[0].id;
        }
        renderPlanPicker();
      }
      if (contactPhoneEl && payload.contact_phone) {
        contactPhoneEl.textContent = payload.contact_phone;
      }
    } catch {
      renderPlanPicker();
    }
  }

  function setBusy(value) {
    busy = value;
    if (!form) return;
    form.querySelectorAll("input, button").forEach((el) => {
      el.disabled = value;
    });
    if (planPickerEl) {
      planPickerEl.querySelectorAll("input").forEach((el) => {
        el.disabled = value;
      });
    }
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

    if (options.selectedPlanId && plans.some((plan) => plan.id === options.selectedPlanId)) {
      selectedPlanId = options.selectedPlanId;
    }
    renderPlanPicker();

    const usage = AUTH.normalizeUsage ? AUTH.normalizeUsage(AUTH.getUsage()) : AUTH.getUsage();
    const user = AUTH.getUser();
    if (leadEl) {
      leadEl.textContent =
        options.message ||
        (usage?.premium_tier === "pack_50"
          ? "Upgrade to Unlimited, or verify a coupon for your selected plan."
          : user && usage?.is_premium
            ? "Your paid plan is already active."
            : "Choose ₹299 for 50 queries or ₹1899 for unlimited scans for 1 month.");
    }

    if (usage?.is_premium && usage.premium_tier !== "pack_50") {
      showSuccess("Unlimited plan is already active on your account.");
    }

    overlay.hidden = false;
    document.body.classList.add("premium-modal-open");
    loadPremiumInfo();

    const couponInput = overlay.querySelector("#premium-modal-coupon");
    if (couponInput && !(usage?.is_premium && usage.premium_tier !== "pack_50")) {
      window.requestAnimationFrame(() => couponInput.focus());
    }

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  global.SaptarishiPremiumModal = { open, close, hide };
})(window);

// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Add money to wallet modal: choose amount, QR scan, coupon verify. */

(function walletModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AC) return;

  const DEFAULT_PLANS = Array.isArray(AC.WALLET_TOPUP_DEFAULTS)
    ? AC.WALLET_TOPUP_DEFAULTS.slice()
    : [
        { id: "wallet_299", amount_inr: 299, credit_inr: 299 },
        { id: "wallet_500", amount_inr: 500, credit_inr: 500 },
        { id: "wallet_1899", amount_inr: 1899, credit_inr: 1899 }
      ];

  const LOADING = global.SaptarishiLoading;
  const CU = global.SaptarishiCommonUtils || null;

  function formatContactPhoneDisplay(raw) {
    if (CU && CU.formatIndiaPhoneDisplay) return CU.formatIndiaPhoneDisplay(raw);
    const digits = String(raw || "").replace(/\D/g, "").replace(/^91/, "");
    return digits ? `+91-${digits}` : String(raw || "");
  }

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let form = null;
  let amountEl = null;
  let planSummaryEl = null;
  let contactPhoneEl = null;
  let leadEl = null;
  let balanceEl = null;
  let successPanel = null;
  let paymentPanel = null;
  let summaryPanel = null;
  let planLineEl = null;
  let memberEl = null;
  let addMoneyBtn = null;
  let backBtn = null;
  let titleEl = null;
  let planPickerEl = null;
  let openedFromSummary = false;
  let busy = false;
  let plans = DEFAULT_PLANS.slice();
  let selectedPlanId = plans[0]?.id || "wallet_299";

  function scannerImageUrl() {
    const rel = AC.PREMIUM_SCANNER_IMAGE;
    if (/^https?:\/\//i.test(rel) || rel.startsWith("/")) return rel;
    return `/frontend/html/${rel.replace(/^\.\//, "")}`;
  }

  function planById(planId) {
    return plans.find((plan) => plan.id === planId) || plans[0] || DEFAULT_PLANS[0];
  }

  function planLabel(plan) {
    if (!plan) return "";
    const credit = plan.credit_inr ?? plan.amount_inr;
    return `₹${credit}`;
  }

  function closestPlanIdForAmount(amountInr) {
    const target = Number(amountInr) || 0;
    if (!plans.length) return selectedPlanId;
    let best = plans[0];
    let bestDiff = Math.abs(Number(best.amount_inr) - target);
    for (const plan of plans) {
      const diff = Math.abs(Number(plan.amount_inr) - target);
      if (diff < bestDiff) {
        best = plan;
        bestDiff = diff;
      }
    }
    return best.id;
  }

  function renderPlanPicker() {
    if (!planPickerEl) return;
    planPickerEl.replaceChildren();
    for (const plan of plans) {
      const label = document.createElement("label");
      label.className = "premium-modal__plan";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "wallet-plan";
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
      label.append(input, text);
      planPickerEl.appendChild(label);
    }
    updateSelectedPlanDisplay();
  }

  function updateSelectedPlanDisplay() {
    const plan = planById(selectedPlanId);
    if (amountEl && plan) {
      amountEl.textContent = `₹${plan.amount_inr}`;
    }
    if (planSummaryEl) {
      planSummaryEl.textContent = "";
    }
  }

  function ensureWalletModalMounted() {
    if (overlay) return;

    overlay = document.createElement("div");
    overlay.id = "wallet-modal-overlay";
    overlay.className = "premium-modal-overlay";
    overlay.hidden = true;
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `
      <div class="premium-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-modal-title">
        <button type="button" class="premium-modal__close" id="wallet-modal-close" aria-label="Close">&times;</button>
        <h2 id="wallet-modal-title" class="premium-modal__title">Wallet</h2>
        <p id="wallet-modal-lead" class="premium-modal__lead" hidden></p>
        <div id="wallet-modal-summary-panel" class="premium-modal__wallet-summary">
          <p id="wallet-modal-plan" class="profile-summary__plan"></p>
          <p id="wallet-modal-balance" class="profile-summary__wallet"></p>
          <p id="wallet-modal-member" class="profile-summary__meta"></p>
          <div class="profile-summary__actions">
            <button type="button" id="wallet-modal-add-btn" class="btn-secondary">Add money to wallet</button>
          </div>
        </div>
        <div id="wallet-modal-payment-panel" class="premium-modal__panel" hidden>
          <button type="button" class="premium-modal__back" id="wallet-modal-back">← Wallet</button>
          <h3 class="premium-modal__add-title">Add money to wallet</h3>
          <div id="wallet-modal-plan-picker" class="premium-modal__plans" role="radiogroup" aria-label="Choose amount"></div>
          <div class="premium-modal__qr-wrap">
            <img
              id="wallet-modal-qr"
              class="premium-modal__qr"
              src="${scannerImageUrl()}"
              alt="PhonePe QR code for wallet top-up"
              width="240"
              height="240"
            />
          </div>
          <p class="premium-modal__amount">
            Amount: <strong id="wallet-modal-amount">₹${DEFAULT_PLANS[0]?.amount_inr || AC.PREMIUM_PACK_AMOUNT_INR}</strong>
          </p>
          <p id="wallet-modal-plan-summary" class="premium-modal__plan-summary"></p>
          <ol class="premium-modal__steps">
            <li>Select an amount, scan the QR code, and complete payment in PhonePe or any UPI app.</li>
            <li>
              Within 2 hours you will get a coupon code on your email or phone.
              To get it ASAP, call
              <strong id="wallet-modal-phone">${formatContactPhoneDisplay(AC.CONTACT_PHONE || AC.PREMIUM_CONTACT_PHONE)}</strong>.
            </li>
          </ol>
          <form id="wallet-modal-form" class="premium-modal__form" autocomplete="off">
            <div class="form-field">
              <label for="wallet-modal-coupon">Enter coupon code</label>
              <input
                type="text"
                id="wallet-modal-coupon"
                required
                minlength="${AC.COUPON_CODE_MIN_LENGTH || 4}"
                maxlength="${AC.COUPON_CODE_MAX_LENGTH || 32}"
                placeholder="e.g. ${(AC.WALLET_COUPON_PREFIX_BY_AMOUNT && AC.WALLET_COUPON_PREFIX_BY_AMOUNT[AC.PREMIUM_PACK_AMOUNT_INR]) || "WL29"}-XXXX"
                autocapitalize="characters"
                spellcheck="false"
              />
            </div>
            <div class="form-field form-field--submit">
              <button type="submit" id="wallet-modal-submit">Verify</button>
            </div>
          </form>
        </div>
        <div id="wallet-modal-success-panel" class="premium-modal__panel premium-modal__panel--success" hidden>
          <p class="premium-modal__success">Wallet updated.</p>
          <button type="button" class="premium-modal__done" id="wallet-modal-done">Continue</button>
        </div>
        <p id="wallet-modal-status" class="status premium-modal__status" role="status" aria-live="polite" hidden></p>
      </div>
    `;
    document.body.appendChild(overlay);

    statusEl = overlay.querySelector("#wallet-modal-status");
    leadEl = overlay.querySelector("#wallet-modal-lead");
    titleEl = overlay.querySelector("#wallet-modal-title");
    planLineEl = overlay.querySelector("#wallet-modal-plan");
    balanceEl = overlay.querySelector("#wallet-modal-balance");
    memberEl = overlay.querySelector("#wallet-modal-member");
    summaryPanel = overlay.querySelector("#wallet-modal-summary-panel");
    addMoneyBtn = overlay.querySelector("#wallet-modal-add-btn");
    backBtn = overlay.querySelector("#wallet-modal-back");
    form = overlay.querySelector("#wallet-modal-form");
    amountEl = overlay.querySelector("#wallet-modal-amount");
    planSummaryEl = overlay.querySelector("#wallet-modal-plan-summary");
    contactPhoneEl = overlay.querySelector("#wallet-modal-phone");
    successPanel = overlay.querySelector("#wallet-modal-success-panel");
    paymentPanel = overlay.querySelector("#wallet-modal-payment-panel");
    planPickerEl = overlay.querySelector("#wallet-modal-plan-picker");

    overlay.querySelector("#wallet-modal-close").addEventListener("click", () => close(false));
    overlay.querySelector("#wallet-modal-done").addEventListener("click", () => close(true));
    if (addMoneyBtn) {
      addMoneyBtn.addEventListener("click", () => showAddMoneyView({ fromSummary: true }));
    }
    if (backBtn) {
      backBtn.addEventListener("click", () => showSummaryView());
    }
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

      const coupon = overlay.querySelector("#wallet-modal-coupon").value.trim();
      setBusy(true);
      startLoading();
      try {
        const payload = await AUTH.activateWalletTopup(coupon);
        stopLoading();
        setBusy(false);
        showSuccess(payload.message || "Wallet topped up.");
        renderWalletSummary(payload.user || payload.usage);
      } catch (err) {
        stopLoading();
        setBusy(false);
        showStatus(err.message || "Could not verify coupon code.", true);
      }
    });

    renderPlanPicker();
  }

  function formatMemberSince(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function renderWalletSummary(source) {
    const usage = source || AUTH.getUsage() || AUTH.getUser() || {};
    const user = AUTH.getUser() || {};
    const bal =
      source && source.wallet_balance_inr != null
        ? Math.max(0, Math.floor(Number(source.wallet_balance_inr) || 0))
        : AUTH.getWalletBalance
          ? AUTH.getWalletBalance(usage)
          : Math.max(0, Math.floor(Number(usage.wallet_balance_inr) || 0));
    const packAmount = AC.PREMIUM_PACK_AMOUNT_INR ?? 299;
    const packQueries = AC.PREMIUM_PACK_QUERY_LIMIT ?? 6;
    const unlimitedAmount = AC.PREMIUM_UNLIMITED_AMOUNT_INR ?? 1899;
    const queryCharge = AC.QUERY_CHARGE_INR ?? 51;
    const added = AUTH.getWalletCreditedTotal
      ? AUTH.getWalletCreditedTotal(usage)
      : Math.max(0, Math.floor(Number(usage.wallet_credited_total_inr) || 0));
    const queriesLeft = queryCharge > 0 ? Math.floor(bal / queryCharge) : 0;
    const isPaid = Boolean(usage.is_premium || user.is_premium);
    const tier = usage.premium_tier || user.premium_tier;
    const isUnlimited = Boolean(isPaid && tier && tier !== "pack_299");
    const remediesUnlocked = Boolean(
      usage.remedy_unlocked || user.remedy_unlocked || isUnlimited || bal >= queryCharge
    );

    if (planLineEl) {
      if (isUnlimited) {
        const until = usage.premium_expires_at
          ? new Date(usage.premium_expires_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
          : "";
        planLineEl.textContent = until
          ? `Plan: Unlimited · active until ${until}`
          : "Plan: Unlimited (1 month)";
      } else if (isPaid && tier === "pack_299") {
        const limit = usage.query_limit ?? packQueries;
        const used = usage.queries_used ?? 0;
        planLineEl.textContent = `Plan: ${limit}-query pack · ${used}/${limit} used`;
      } else if (remediesUnlocked) {
        planLineEl.textContent =
          `Plan: Pay per query (₹${queryCharge}) · ${queriesLeft} left from balance`;
      } else {
        planLineEl.textContent = "Plan: No plan active";
      }
    }

    if (balanceEl) {
      const addedPart = added > 0 ? ` · Added ₹${added}` : "";
      if (isUnlimited) {
        balanceEl.textContent = `Wallet: ₹${bal}${addedPart}`;
      } else if (remediesUnlocked) {
        balanceEl.textContent =
          `Wallet: ₹${bal}${addedPart} — ₹${queryCharge} per query` +
          (queriesLeft > 0 ? ` · ~${queriesLeft} queries left` : "");
      } else {
        balanceEl.textContent =
          `Wallet: ₹${bal}${addedPart} — Add ₹${packAmount} (~${packQueries} queries at ₹${queryCharge} each), or ₹${unlimitedAmount} for unlimited`;
      }
    }

    if (memberEl) {
      const joined = formatMemberSince(user.created_at || usage.created_at);
      memberEl.textContent = joined ? `Member since ${joined}` : "";
      memberEl.hidden = !joined;
    }
  }

  function wantsAddMoney(options) {
    return Boolean(
      options.addMoney ||
        options.message ||
        options.suggestedAmountInr != null ||
        options.selectedPlanId
    );
  }

  function showSummaryView() {
    openedFromSummary = false;
    if (titleEl) titleEl.textContent = "Wallet";
    if (leadEl) {
      leadEl.textContent = "";
      leadEl.hidden = true;
    }
    if (summaryPanel) summaryPanel.hidden = false;
    if (paymentPanel) paymentPanel.hidden = true;
    if (successPanel) successPanel.hidden = true;
    renderWalletSummary();
  }

  function showAddMoneyView({ fromSummary = false, message = "" } = {}) {
    openedFromSummary = Boolean(fromSummary);
    if (titleEl) titleEl.textContent = "Add money to wallet";
    if (leadEl) {
      leadEl.textContent =
        message || "Select an amount, scan the QR, pay, then enter your coupon code.";
      leadEl.hidden = !leadEl.textContent;
    }
    if (summaryPanel) summaryPanel.hidden = true;
    if (paymentPanel) paymentPanel.hidden = false;
    if (successPanel) successPanel.hidden = true;
    if (backBtn) backBtn.hidden = !openedFromSummary;
    renderPlanPicker();
  }

  async function loadWalletInfo() {
    try {
      const payload = await AUTH.fetchWalletInfo();
      if (Array.isArray(payload.topup_plans) && payload.topup_plans.length) {
        plans = payload.topup_plans.map((plan) => ({
          id: plan.id,
          amount_inr: plan.amount_inr,
          credit_inr: plan.credit_inr ?? plan.amount_inr
        }));
        if (!plans.some((plan) => plan.id === selectedPlanId)) {
          selectedPlanId = plans[0].id;
        }
        renderPlanPicker();
      }
      if (contactPhoneEl && payload.contact_phone) {
        contactPhoneEl.textContent = formatContactPhoneDisplay(payload.contact_phone);
      }
      renderWalletSummary({
        ...(AUTH.getUsage() || AUTH.getUser() || {}),
        wallet_balance_inr:
          payload.wallet_balance_inr != null ? payload.wallet_balance_inr : AUTH.getWalletBalance()
      });
    } catch {
      renderWalletSummary();
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
    const closeBtn = overlay.querySelector("#wallet-modal-close");
    if (closeBtn) closeBtn.disabled = value;
  }

  function startLoading() {
    if (CU && CU.startStatusLoading) {
      CU.startStatusLoading(statusEl, () => showStatus("Verifying coupon…"));
      return;
    }
    if (LOADING && statusEl) {
      LOADING.startStatusLoadingIndicator(statusEl);
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

  function showSuccess(message) {
    if (summaryPanel) summaryPanel.hidden = true;
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
    if (successPanel) successPanel.hidden = true;
    if (form) form.reset();
    showStatus("");
  }

  function hideWalletModal() {
    if (!overlay) return;
    stopLoading();
    setBusy(false);
    overlay.hidden = true;
    document.body.classList.remove("premium-modal-open");
  }

  function close(success) {
    hideWalletModal();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function openWalletModal(options = {}) {
    ensureWalletModalMounted();
    resetPanels();

    if (options.selectedPlanId && plans.some((plan) => plan.id === options.selectedPlanId)) {
      selectedPlanId = options.selectedPlanId;
    } else if (options.suggestedAmountInr != null) {
      selectedPlanId = closestPlanIdForAmount(options.suggestedAmountInr);
    }
    renderPlanPicker();
    renderWalletSummary();

    overlay.hidden = false;
    document.body.classList.add("premium-modal-open");
    const dialog = overlay.querySelector(".premium-modal");
    if (dialog) dialog.scrollTop = 0;
    loadWalletInfo();

    if (wantsAddMoney(options)) {
      showAddMoneyView({ fromSummary: false, message: options.message || "" });
      const couponInput = overlay.querySelector("#wallet-modal-coupon");
      if (couponInput) {
        window.requestAnimationFrame(() => couponInput.focus());
      }
    } else {
      showSummaryView();
    }

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  global.SaptarishiWalletModal = {
    openWalletModal,
    open: openWalletModal,
    close,
    hide: hideWalletModal,
    hideWalletModal,
    isOpen: () => Boolean(overlay && !overlay.hidden)
  };
})(window);

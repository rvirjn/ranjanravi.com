// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Buy Premium modal: pay from wallet only. */

(function premiumModalModule(global) {
  const AUTH = global.SaptarishiAuth;
  if (!AUTH) return;

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AC) return;

  const DEFAULT_PLANS = [
    {
      id: "pack_299",
      amount_inr: AC.PREMIUM_PACK_AMOUNT_INR,
      query_limit: AC.PREMIUM_PACK_QUERY_LIMIT
    },
    {
      id: "unlimited",
      amount_inr: AC.PREMIUM_UNLIMITED_AMOUNT_INR,
      query_limit: null
    }
  ];

  const LOADING = global.SaptarishiLoading;
  const CU = global.SaptarishiCommonUtils || null;

  let overlay = null;
  let resolvePending = null;
  let statusEl = null;
  let balanceEl = null;
  let leadEl = null;
  let successPanel = null;
  let paymentPanel = null;
  let planPickerEl = null;
  let walletPayBtn = null;
  let addWalletBtn = null;
  let busy = false;
  let plans = DEFAULT_PLANS.slice();
  let selectedPlanId = "pack_299";

  function planById(planId) {
    return plans.find((plan) => plan.id === planId) || plans[0] || DEFAULT_PLANS[0];
  }

  function planLabel(plan) {
    if (!plan) return "";
    if (plan.id === "unlimited") return `Unlimited (1 month) · ₹${plan.amount_inr}`;
    const limit = AC.PREMIUM_PACK_QUERY_LIMIT ?? plan.query_limit ?? 6;
    return `${limit} queries · ₹${plan.amount_inr}`;
  }

  function currentBalance() {
    return AUTH.getWalletBalance ? AUTH.getWalletBalance() : 0;
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
      label.append(input, text);
      planPickerEl.appendChild(label);
    }
    updateSelectedPlanDisplay();
  }

  function updateSelectedPlanDisplay() {
    const plan = planById(selectedPlanId);
    const balance = currentBalance();
    if (balanceEl) {
      balanceEl.textContent = `Wallet balance: ₹${balance}`;
    }
    if (walletPayBtn && plan) {
      const enough = balance >= Number(plan.amount_inr || 0);
      walletPayBtn.hidden = !enough;
      walletPayBtn.textContent = `Pay ₹${plan.amount_inr} from wallet`;
    }
    if (addWalletBtn && plan) {
      const enough = balance >= Number(plan.amount_inr || 0);
      addWalletBtn.hidden = enough;
    }
  }

  function ensurePremiumModalMounted() {
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
        <p id="premium-modal-balance" class="premium-modal__plan-summary"></p>
        <div id="premium-modal-payment-panel" class="premium-modal__panel">
          <div id="premium-modal-plan-picker" class="premium-modal__plans" role="radiogroup" aria-label="Choose a plan"></div>
          <div class="premium-modal__form">
            <div class="form-field form-field--submit">
              <button type="button" id="premium-modal-wallet-pay" class="premium-modal__wallet-pay premium-modal__wallet-pay--primary" hidden>
                Pay from wallet
              </button>
              <button type="button" id="premium-modal-add-wallet" class="premium-modal__wallet-pay">
                Add money to wallet
              </button>
            </div>
          </div>
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
    balanceEl = overlay.querySelector("#premium-modal-balance");
    successPanel = overlay.querySelector("#premium-modal-success-panel");
    paymentPanel = overlay.querySelector("#premium-modal-payment-panel");
    planPickerEl = overlay.querySelector("#premium-modal-plan-picker");
    walletPayBtn = overlay.querySelector("#premium-modal-wallet-pay");
    addWalletBtn = overlay.querySelector("#premium-modal-add-wallet");

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

    if (walletPayBtn) {
      walletPayBtn.addEventListener("click", async () => {
        if (busy) return;
        if (!AUTH.getToken()) {
          showStatus("Please sign in first.", true);
          return;
        }
        const plan = planById(selectedPlanId);
        const balance = currentBalance();
        if (balance < (plan?.amount_inr || 0)) {
          showStatus("Add money to wallet first.", true);
          updateSelectedPlanDisplay();
          return;
        }
        setBusy(true);
        startPremiumVerificationLoading();
        try {
          const payload = await AUTH.buyPremiumWithWallet(selectedPlanId);
          stopPremiumVerificationLoading();
          setBusy(false);
          showPremiumActivationSuccess(payload.message || "Premium activated from wallet.");
        } catch (err) {
          stopPremiumVerificationLoading();
          setBusy(false);
          showStatus(err.message || "Could not pay with wallet.", true);
          updateSelectedPlanDisplay();
        }
      });
    }

    if (addWalletBtn) {
      addWalletBtn.addEventListener("click", async () => {
        if (busy) return;
        const plan = planById(selectedPlanId);
        const need = Math.max(0, Number(plan?.amount_inr || 0) - currentBalance());
        close(false);
        if (AUTH.openWalletFlow) {
          await AUTH.openWalletFlow({
            message:
              need > 0
                ? `Add at least ₹${need} to buy this plan from your wallet.`
                : "Add money to your wallet, then return to Buy Premium.",
            suggestedAmountInr: need > 0 ? need : plan?.amount_inr
          });
        }
      });
    }

    renderPlanPicker();
  }

  async function loadPremiumInfo() {
    try {
      const payload = await AUTH.apiFetch(AC.API_PREMIUM_INFO_PATH);
      if (Array.isArray(payload.plans) && payload.plans.length) {
        plans = payload.plans.map((plan) => ({
          id: plan.id,
          amount_inr: plan.amount_inr,
          query_limit:
            plan.id === "pack_299"
              ? AC.PREMIUM_PACK_QUERY_LIMIT ?? plan.query_limit ?? 6
              : plan.query_limit,
          duration_months: plan.duration_months
        }));
        if (!plans.some((plan) => plan.id === selectedPlanId)) {
          selectedPlanId = plans[0].id;
        }
        renderPlanPicker();
      }
    } catch {
      renderPlanPicker();
    }
    updateSelectedPlanDisplay();
  }

  function setBusy(value) {
    busy = value;
    if (planPickerEl) {
      planPickerEl.querySelectorAll("input").forEach((el) => {
        el.disabled = value;
      });
    }
    if (walletPayBtn) walletPayBtn.disabled = value;
    if (addWalletBtn) addWalletBtn.disabled = value;
    const closeBtn = overlay.querySelector("#premium-modal-close");
    if (closeBtn) closeBtn.disabled = value;
  }

  function startPremiumVerificationLoading() {
    if (CU && CU.startStatusLoading) {
      CU.startStatusLoading(statusEl, () => showStatus("Paying from wallet…"));
      return;
    }
    if (LOADING && statusEl) {
      LOADING.startStatusLoadingIndicator(statusEl);
      return;
    }
    if (statusEl) {
      statusEl.hidden = false;
      statusEl.classList.remove("error");
      statusEl.textContent = "Paying from wallet…";
    }
  }

  function stopPremiumVerificationLoading() {
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

  function showPremiumActivationSuccess(message) {
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
    showStatus("");
  }

  function hidePremiumModal() {
    if (!overlay) return;
    stopPremiumVerificationLoading();
    setBusy(false);
    overlay.hidden = true;
    document.body.classList.remove("premium-modal-open");
  }

  function close(success) {
    hidePremiumModal();
    if (resolvePending) {
      resolvePending(Boolean(success));
      resolvePending = null;
    }
  }

  function openPremiumModal(options = {}) {
    ensurePremiumModalMounted();
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
        (usage?.premium_tier === "pack_299"
          ? "Upgrade to Unlimited using your wallet balance."
          : user && usage?.is_premium
            ? "Your paid plan is already active."
            : "Choose a plan and pay from your wallet. Add money in Wallet if needed.");
    }

    if (usage?.is_premium && usage.premium_tier !== "pack_299") {
      showPremiumActivationSuccess("Unlimited plan is already active on your account.");
    }

    overlay.hidden = false;
    document.body.classList.add("premium-modal-open");
    loadPremiumInfo();
    updateSelectedPlanDisplay();

    return new Promise((resolve) => {
      resolvePending = resolve;
    });
  }

  global.SaptarishiPremiumModal = {
    openPremiumModal,
    close,
    hidePremiumModal,
    open: openPremiumModal,
    hide: hidePremiumModal,
    isOpen: () => Boolean(overlay && !overlay.hidden)
  };
})(window);

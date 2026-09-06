// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Profile view and edit page (admin send-coupon). */

(function profilePage(global) {
  const AUTH = global.SaptarishiAuth;
  const MODAL = global.SaptarishiAuthModal;
  const LOADING = global.SaptarishiLoading;
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AUTH) return;

  const form = document.getElementById("profile-form");
  const securityEl = document.getElementById("profile-security");
  const passwordForm = document.getElementById("password-form");
  const passwordStatusEl = document.getElementById("password-status");
  const deleteForm = document.getElementById("delete-account-form");
  const deleteStatusEl = document.getElementById("delete-status");
  const birthsEl = document.getElementById("profile-births");
  const birthListEl = document.getElementById("profile-birth-list");
  const birthEmptyEl = document.getElementById("profile-birth-empty");
  const birthStatusEl = document.getElementById("profile-birth-status");
  const newBirthLink = document.getElementById("profile-new-birth");
  const summaryEl = document.getElementById("profile-summary");
  const statusEl = document.getElementById("profile-status");
  const planEl = document.getElementById("profile-plan");
  const plansNoteEl = document.getElementById("profile-plans-note");
  const walletEl = document.getElementById("profile-wallet");
  const usageEl = document.getElementById("profile-usage");
  const memberEl = document.getElementById("profile-member-since");
  const addWalletBtn = document.getElementById("profile-add-wallet-btn");
  const sendCouponBtn = document.getElementById("profile-send-coupon-btn");
  const couponOverlay = document.getElementById("send-coupon-overlay");
  const couponForm = document.getElementById("send-coupon-form");
  const couponClose = document.getElementById("send-coupon-close");
  const couponStatus = document.getElementById("send-coupon-status");
  const nameSelect = document.getElementById("send-coupon-name");
  const emailSelect = document.getElementById("send-coupon-email");
  const amountSelect = document.getElementById("send-coupon-amount");
  const codeSelect = document.getElementById("send-coupon-code");

  let couponUsers = [];
  let couponPlans = [];
  let unavailableCouponKeys = new Set();

  function normalizeCouponKey(value) {
    return String(value || "")
      .trim()
      .toUpperCase()
      .replace(/[\s\-]+/g, "");
  }

  function applyWalletCouponPayload(walletPayload) {
    couponPlans = walletPayload?.wallet?.topup_plans || [];
    const used = new Set();
    for (const raw of walletPayload?.unavailable_coupon_codes || []) {
      const key = normalizeCouponKey(raw);
      if (key) used.add(key);
    }
    // Plans from API should already exclude used codes; keep a local set anyway.
    unavailableCouponKeys = used;
  }

  function unusedCouponCodes(plan) {
    const prefix = expectedCouponPrefix(plan?.amount_inr);
    let codes = Array.isArray(plan?.coupon_codes) ? plan.coupon_codes.slice() : [];
    codes = codes.filter((c) => {
      const display = String(c || "").trim().toUpperCase();
      if (!display) return false;
      if (unavailableCouponKeys.has(normalizeCouponKey(display))) return false;
      if (prefix && !display.startsWith(prefix)) return false;
      return true;
    });
    return codes;
  }

  function setCurrentPlanLine(el, detail) {
    if (!el) return;
    el.replaceChildren();
    el.append("Your current Plan: ");
    const value = document.createElement("span");
    value.className = "profile-summary__plan-value";
    value.textContent = detail;
    el.appendChild(value);
  }

  function showStatus(message, isError) {
    if (!statusEl) return;
    if (LOADING) LOADING.stopStatusLoadingIndicator(statusEl);
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.remove("status--loading");
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function showFieldStatus(el, message, isError) {
    if (!el) return;
    if (LOADING) LOADING.stopStatusLoadingIndicator(el);
    el.textContent = message || "";
    el.hidden = !message;
    el.classList.remove("status--loading");
    el.classList.toggle("error", Boolean(isError));
  }

  function showCouponStatus(message, isError) {
    if (!couponStatus) return;
    couponStatus.textContent = message || "";
    couponStatus.hidden = !message;
    couponStatus.classList.toggle("error", Boolean(isError));
  }

  function formatDate(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function fillSelect(select, placeholder, options) {
    if (!select) return;
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder;
    select.appendChild(first);
    options.forEach((opt) => {
      const el = document.createElement("option");
      el.value = opt.value;
      el.textContent = opt.label;
      if (opt.disabled) el.disabled = true;
      select.appendChild(el);
    });
  }

  function uniqueNames(users) {
    const seen = new Set();
    const names = [];
    users.forEach((u) => {
      const name = String(u.name || "").trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      names.push(name);
    });
    names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return names;
  }

  function emailsForName(name) {
    const wanted = String(name || "").trim().toLowerCase();
    return couponUsers
      .filter((u) => String(u.name || "").trim().toLowerCase() === wanted)
      .map((u) => ({
        value: String(u.id || ""),
        label: String(u.email || ""),
        email: String(u.email || "")
      }));
  }

  function renderProfileSummary(profile, usage) {
    if (!summaryEl) return;
    summaryEl.hidden = false;

    const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
    const unlimitedAmount = C?.PREMIUM_UNLIMITED_AMOUNT_INR ?? 1899;
    const queryCharge = C?.BIRTH_CHARGE_INR ?? C?.QUERY_CHARGE_INR ?? 21;
    const freeLimit = C?.FREE_BIRTHS_PER_USER ?? 2;
    const bal =
      AUTH.getWalletBalance
        ? AUTH.getWalletBalance(usage || profile)
        : Number(profile.wallet_balance_inr || usage?.wallet_balance_inr) || 0;
    const freeLeft = AUTH.getFreeBirthsRemaining
      ? AUTH.getFreeBirthsRemaining(usage || profile)
      : Math.max(
          0,
          freeLimit - (Number(usage?.free_births_used ?? profile.free_births_used) || 0)
        );
    const tier = profile.premium_tier || usage?.premium_tier;
    const isPaid = profile.is_premium || usage?.is_premium;
    const isUnlimited = Boolean(isPaid && tier && tier !== "pack_299");
    const isAdvance = Boolean(isUnlimited || bal >= unlimitedAmount);
    const remediesUnlocked = Boolean(
      usage?.remedy_unlocked ||
        profile?.remedy_unlocked ||
        isAdvance ||
        freeLeft > 0 ||
        bal >= queryCharge
    );

    if (planEl) {
      if (isAdvance) {
        setCurrentPlanLine(planEl, "Advance Plan");
      } else if (bal === 0 && freeLeft > 0) {
        setCurrentPlanLine(
          planEl,
          `Free Plan · ${freeLeft} of ${freeLimit} birth${freeLimit === 1 ? "" : "s"} left`
        );
      } else {
        setCurrentPlanLine(planEl, "Basic Plan");
      }
      planEl.classList.toggle(
        "profile-summary__plan--premium",
        Boolean(isAdvance || remediesUnlocked || (bal === 0 && freeLeft > 0))
      );
    }

    if (plansNoteEl) {
      const CU = global.SaptarishiCommonUtils;
      if (CU && CU.paidPlanNote) {
        plansNoteEl.textContent = CU.paidPlanNote();
      } else {
        const months = Number(C?.PREMIUM_UNLIMITED_MONTHS) || 1;
        const monthLabel = months === 1 ? "1 month" : `${months} months`;
        plansNoteEl.textContent =
          `Free Plan: ${freeLimit} birth details free\n` +
          `Basic Plan: ₹${queryCharge} for 1 birth details\n` +
          `Advance Plan: ₹${unlimitedAmount} for unlimited access for ${monthLabel}.`;
      }
    }

    if (walletEl) {
      walletEl.textContent = `Wallet Balance: ₹${bal}`;
      walletEl.hidden = false;
    }

    if (usageEl && usage && !usage.is_premium && !remediesUnlocked) {
      if (usage.is_guest === false || usage.query_limit == null) {
        usageEl.hidden = true;
      } else {
        const used =
          usage.queries_used != null
            ? Number(usage.queries_used)
            : (Number(usage.kundali_used) || 0) + (Number(usage.auspicious_used) || 0);
        const limit = usage.query_limit ?? C?.MAX_FREE_QUERIES_PER_GUEST ?? 2;
        usageEl.textContent = `Usage: ${used}/${limit} queries`;
        usageEl.hidden = false;
      }
    } else if (usageEl) {
      usageEl.hidden = true;
    }

    if (memberEl) {
      const joined = formatDate(profile.created_at);
      memberEl.textContent = joined ? `Member since ${joined}` : "";
      memberEl.hidden = !joined;
    }

    if (sendCouponBtn) {
      sendCouponBtn.hidden = !AUTH.isAdmin(profile || usage);
    }
  }

  function populateProfileForm(profile) {
    if (!form) return;
    document.getElementById("profile-name").value = profile.name || "";
    document.getElementById("profile-mobile").value = profile.mobile || "";
    document.getElementById("profile-email").value = profile.email || "";
    form.hidden = false;
    if (securityEl) securityEl.hidden = false;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function kundaliHref(query = "") {
    const file = "kundali.html";
    const prefix = C?.DEPLOY_PREFIX || "";
    const qs = query;
    const hash = document.documentElement.classList.contains("saptarishi-native-app")
      ? "#app=kundali"
      : "";
    if (/\/frontend\/html\//i.test(window.location.pathname)) {
      return `${prefix}/frontend/html/${file}${qs}${hash}`;
    }
    if (C?.PAGE_FILE_TO_PATH?.[file]) return `${C.PAGE_FILE_TO_PATH[file]}${qs}${hash}`;
    return `${file}${qs}${hash}`;
  }

  function kundaliNewHref() {
    return kundaliHref("?mode=new");
  }

  function birthDetailLine(view) {
    const bits = [view.date, view.time, view.place]
      .map((part) => String(part || "").trim())
      .filter(Boolean);
    return bits.join(" · ");
  }

  function renderSavedBirths(profile, usage) {
    if (!birthsEl) return;
    birthsEl.hidden = false;
    if (newBirthLink) newBirthLink.href = kundaliNewHref();
    const source =
      usage && Array.isArray(usage.birth_views)
        ? usage
        : profile && Array.isArray(profile.birth_views)
          ? profile
          : usage || profile;
    const views = AUTH.getBirthViews ? AUTH.getBirthViews(source) : [];
    if (birthEmptyEl) birthEmptyEl.hidden = views.length > 0;
    if (!birthListEl) return;
    if (!views.length) {
      birthListEl.innerHTML = "";
      return;
    }
    birthListEl.innerHTML = views
      .map((view) => {
        const name = String(view.name || "").trim();
        const detail = birthDetailLine(view);
        return `<div class="profile-birth-row">
          <div class="profile-birth-row__meta">
            <strong>${escapeHtml(name)}</strong>
            ${detail ? `<span>${escapeHtml(detail)}</span>` : ""}
          </div>
          <button type="button" class="btn-danger" data-birth-name="${escapeHtml(name)}">Delete</button>
        </div>`;
      })
      .join("");
  }

  async function deleteSavedBirth(name) {
    const label = String(name || "").trim();
    if (!label || !AUTH.deleteBirthView) return;
    if (!window.confirm(`Delete saved birth details for ${label}?`)) return;
    showFieldStatus(birthStatusEl, "Deleting…", false);
    try {
      const payload = await AUTH.deleteBirthView(label);
      renderSavedBirths(payload, payload.usage || payload.user || {});
      showFieldStatus(birthStatusEl, payload.message || "Saved birth details deleted.", false);
    } catch (err) {
      showFieldStatus(
        birthStatusEl,
        err.message || "Could not delete saved birth details.",
        true
      );
    }
  }

  async function ensureLoggedIn() {
    if (AUTH.getToken()) return true;
    if (MODAL) {
      await MODAL.open({ tab: "login", required: true, message: "Sign in to view your profile." });
    }
    return Boolean(AUTH.getToken());
  }

  async function loadProfileData() {
    showStatus("Loading profile…", false);
    try {
      const payload = await AUTH.fetchProfile();
      renderProfileSummary(payload.profile || {}, payload.usage || payload.user || {});
      populateProfileForm(payload.profile || {});
      renderSavedBirths(payload.profile || {}, payload.usage || payload.user || {});
      showStatus("");
    } catch (err) {
      if (err.status === 401) {
        AUTH.clearSession();
        window.location.href = kundaliHref("?auth=login");
        return;
      }
      showStatus(err.message || "Could not load profile", true);
    }
  }

  function resetCouponForm() {
    fillSelect(nameSelect, "Select name…", []);
    fillSelect(emailSelect, "Select email…", []);
    fillSelect(amountSelect, "Select amount…", []);
    fillSelect(codeSelect, "Select coupon…", []);
    if (emailSelect) emailSelect.disabled = true;
    if (amountSelect) amountSelect.disabled = true;
    if (codeSelect) codeSelect.disabled = true;
    showCouponStatus("");
  }

  function expectedCouponPrefix(amountInr) {
    const amount = Number(amountInr) || 0;
    const map = C?.WALLET_COUPON_PREFIX_BY_AMOUNT || {};
    return String(map[amount] || map[String(amount)] || "").trim();
  }

  function populateAmountOptions() {
    const plansWithCodes = (couponPlans || [])
      .map((p) => ({ ...p, coupon_codes: unusedCouponCodes(p) }))
      .filter((p) => Array.isArray(p.coupon_codes) && p.coupon_codes.length > 0);
    fillSelect(
      amountSelect,
      "Select amount…",
      plansWithCodes.map((p) => ({
        value: String(p.amount_inr),
        label: `₹${p.amount_inr} (${p.coupon_codes.length} unused)`
      }))
    );
    amountSelect.disabled = plansWithCodes.length === 0;
    fillSelect(codeSelect, "Select coupon…", []);
    codeSelect.disabled = true;
  }

  function populateCouponCodes() {
    const amount = Number(amountSelect?.value || 0);
    const plan = (couponPlans || []).find((p) => Number(p.amount_inr) === amount);
    const codes = unusedCouponCodes(plan);
    fillSelect(
      codeSelect,
      amount ? `Select ₹${amount} coupon…` : "Select coupon…",
      codes.map((c) => ({ value: c, label: c }))
    );
    codeSelect.disabled = !amount || codes.length === 0;
    if (!codes.length && amount) {
      showCouponStatus(`No unused coupons left for ₹${amount}.`, true);
    } else if (amount) {
      showCouponStatus("");
    }
  }

  async function openSendCouponModal() {
    if (!couponOverlay) return;
    resetCouponForm();
    couponOverlay.hidden = false;
    document.body.classList.add("send-coupon-open");
    showCouponStatus("Loading users and coupons…", false);
    try {
      const [usersPayload, walletPayload] = await Promise.all([
        AUTH.fetchDbUsers(),
        AUTH.fetchDbWallet()
      ]);
      couponUsers = usersPayload.users || [];
      applyWalletCouponPayload(walletPayload);
      fillSelect(
        nameSelect,
        "Select name…",
        uniqueNames(couponUsers).map((n) => ({ value: n, label: n }))
      );
      populateAmountOptions();
      showCouponStatus(
        couponUsers.length
          ? ""
          : "No users with email found.",
        !couponUsers.length
      );
    } catch (err) {
      showCouponStatus(err.message || "Could not load coupon data", true);
    }
  }

  function closeSendCouponModal() {
    if (!couponOverlay) return;
    couponOverlay.hidden = true;
    document.body.classList.remove("send-coupon-open");
    showCouponStatus("");
  }

  async function initializeProfilePage() {
    const authed = await ensureLoggedIn();
    if (!authed) {
      window.location.href = kundaliHref("?auth=login");
      return;
    }
    await loadProfileData();
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      form.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
      if (LOADING) {
        LOADING.startStatusLoadingIndicator(statusEl);
      } else {
        showStatus("Saving…", false);
      }

      try {
        const payload = await AUTH.updateProfile(
          document.getElementById("profile-name").value,
          document.getElementById("profile-mobile").value,
          document.getElementById("profile-email").value
        );
        renderProfileSummary(payload.profile || {}, payload.usage || payload.user || {});
        showStatus(payload.message || "Profile updated.", false);
      } catch (err) {
        showStatus(err.message || "Could not update profile", true);
      } finally {
        form.querySelectorAll("input, button").forEach((el) => {
          el.disabled = false;
        });
      }
    });
  }

  if (passwordForm) {
    passwordForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const currentPassword = document.getElementById("profile-current-password").value;
      const newPassword = document.getElementById("profile-new-password").value;
      const confirmPassword = document.getElementById("profile-confirm-password").value;
      if (newPassword !== confirmPassword) {
        showFieldStatus(passwordStatusEl, "New passwords do not match.", true);
        return;
      }
      passwordForm.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
      showFieldStatus(passwordStatusEl, "Updating password…", false);
      try {
        const payload = await AUTH.updatePassword(currentPassword, newPassword, confirmPassword);
        AUTH.clearSession();
        showFieldStatus(
          passwordStatusEl,
          payload.message || "Password updated. Please sign in again.",
          false
        );
        passwordForm.reset();
        window.setTimeout(() => {
          window.location.href = kundaliHref("?auth=login");
        }, 1200);
      } catch (err) {
        showFieldStatus(passwordStatusEl, err.message || "Could not update password", true);
      } finally {
        passwordForm.querySelectorAll("input, button").forEach((el) => {
          el.disabled = false;
        });
      }
    });
  }

  if (deleteForm) {
    deleteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const confirmed = window.confirm(
        "Delete your Saptarishi account permanently? This cannot be undone."
      );
      if (!confirmed) return;
      const password = document.getElementById("profile-delete-password").value;
      deleteForm.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
      showFieldStatus(deleteStatusEl, "Deleting account…", false);
      try {
        const payload = await AUTH.deleteAccount(password);
        showFieldStatus(deleteStatusEl, payload.message || "Account deleted.", false);
        window.setTimeout(() => {
          window.location.href = kundaliHref();
        }, 1000);
      } catch (err) {
        showFieldStatus(deleteStatusEl, err.message || "Could not delete account", true);
        deleteForm.querySelectorAll("input, button").forEach((el) => {
          el.disabled = false;
        });
      }
    });
  }

  if (birthListEl) {
    birthListEl.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-birth-name]");
      if (!btn) return;
      deleteSavedBirth(btn.getAttribute("data-birth-name") || "");
    });
  }

  if (addWalletBtn) {
    addWalletBtn.addEventListener("click", async () => {
      if (AUTH.openWalletFlow) {
        const ok = await AUTH.openWalletFlow({
          message: "Scan the QR and enter your coupon code to add money to your wallet."
        });
        if (ok) await loadProfileData();
      }
    });
  }

  if (sendCouponBtn) {
    sendCouponBtn.addEventListener("click", () => openSendCouponModal());
  }
  if (couponClose) {
    couponClose.addEventListener("click", () => closeSendCouponModal());
  }
  if (couponOverlay) {
    couponOverlay.addEventListener("click", (event) => {
      if (event.target === couponOverlay) closeSendCouponModal();
    });
  }

  if (nameSelect) {
    nameSelect.addEventListener("change", () => {
      const emails = emailsForName(nameSelect.value);
      fillSelect(
        emailSelect,
        "Select email…",
        emails.map((e) => ({ value: e.value, label: e.label }))
      );
      emailSelect.disabled = emails.length === 0;
      if (emails.length === 1) {
        emailSelect.value = emails[0].value;
      }
    });
  }

  if (amountSelect) {
    amountSelect.addEventListener("change", () => {
      populateCouponCodes();
    });
  }

  if (couponForm) {
    couponForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const userId = emailSelect?.value || "";
      const amountInr = Number(amountSelect?.value || 0);
      const coupon = codeSelect?.value || "";
      const prefix = expectedCouponPrefix(amountInr);
      if (!userId || !amountInr || !coupon) {
        showCouponStatus("Select name, email, amount, and coupon.", true);
        return;
      }
      if (prefix && !String(coupon).toUpperCase().startsWith(prefix)) {
        showCouponStatus(
          `Coupon ${coupon} does not belong to ₹${amountInr} (expected ${prefix}-…).`,
          true
        );
        return;
      }
      const submitBtn = document.getElementById("send-coupon-submit");
      if (submitBtn) submitBtn.disabled = true;
      couponForm.querySelectorAll("select, button").forEach((el) => {
        el.disabled = true;
      });
      showCouponStatus("Sending coupon email…", false);
      try {
        const result = await AUTH.sendDbCoupon({
          id: userId,
          amount_inr: amountInr,
          coupon_code: coupon
        });
        showCouponStatus(
          result.message || `Sent ${result.coupon_code} to ${result.email}.`,
          Boolean(result.error && !result.sent)
        );
        // Refresh unused coupon list after send.
        const walletPayload = await AUTH.fetchDbWallet();
        applyWalletCouponPayload(walletPayload);
        populateAmountOptions();
        if (amountSelect) {
          amountSelect.value = String(amountInr);
          populateCouponCodes();
        }
      } catch (err) {
        showCouponStatus(err.message || "Could not send coupon", true);
      } finally {
        couponForm.querySelectorAll("select, button").forEach((el) => {
          el.disabled = false;
        });
        if (emailSelect && !emailSelect.value) emailSelect.disabled = !nameSelect?.value;
        if (amountSelect) amountSelect.disabled = false;
        if (codeSelect) codeSelect.disabled = !amountSelect?.value;
      }
    });
  }

  global.addEventListener("saptarishi-auth-changed", () => {
    const user = AUTH.getUser();
    if (user) renderProfileSummary(user, AUTH.getUsage() || user);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeProfilePage());
  } else {
    initializeProfilePage();
  }
})(window);

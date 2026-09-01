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
  const couponDownloadBtn = document.getElementById("send-coupon-download-btn");
  const nameSelect = document.getElementById("send-coupon-name");
  const emailSelect = document.getElementById("send-coupon-email");
  const amountSelect = document.getElementById("send-coupon-amount");
  const codeSelect = document.getElementById("send-coupon-code");

  let couponUsers = [];
  let couponPlans = [];
  let lastCouponEmailFile = null;

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

  function setCouponDownloadAvailable(file) {
    lastCouponEmailFile = file && file.html ? file : null;
    if (!couponDownloadBtn) return;
    couponDownloadBtn.hidden = !lastCouponEmailFile;
  }

  function couponEmailFilename(result) {
    const suggested = String(result?.filename || "").trim();
    if (suggested) return suggested.replace(/[^\w.\-]+/g, "_");
    const slug = String(result?.name || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "user";
    const amount = Number(result?.amount_inr) || 0;
    return `saptarishi-coupon-${slug}${amount ? `-rs${amount}` : ""}.html`;
  }

  async function downloadCouponEmailFile(file) {
    const payload = file || lastCouponEmailFile;
    const html = String(payload?.html || "");
    if (!html) throw new Error("No coupon email HTML to download.");
    const filename = couponEmailFilename(payload);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const shareFile =
      typeof File === "function"
        ? new File([blob], filename, { type: "text/html" })
        : null;
    const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
    if (
      mobile &&
      shareFile &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [shareFile] })
    ) {
      try {
        await navigator.share({
          title: filename,
          text: "Saptarishi coupon email",
          files: [shareFile]
        });
        return "shared";
      } catch (err) {
        if (err && err.name === "AbortError") return "cancelled";
      }
    }
    const nav = window.navigator;
    if (nav && typeof nav.msSaveOrOpenBlob === "function") {
      nav.msSaveOrOpenBlob(blob, filename);
      return "downloaded";
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 8000);
    return "downloaded";
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
    const packAmount = C?.PREMIUM_PACK_AMOUNT_INR ?? 299;
    const packQueries = C?.PREMIUM_PACK_QUERY_LIMIT ?? 6;
    const unlimitedAmount = C?.PREMIUM_UNLIMITED_AMOUNT_INR ?? 1899;
    const queryCharge = C?.QUERY_CHARGE_INR ?? 51;
    const bal =
      AUTH.getWalletBalance
        ? AUTH.getWalletBalance(usage || profile)
        : Number(profile.wallet_balance_inr || usage?.wallet_balance_inr) || 0;
    const added =
      AUTH.getWalletCreditedTotal
        ? AUTH.getWalletCreditedTotal(usage || profile)
        : Number(profile.wallet_credited_total_inr || usage?.wallet_credited_total_inr) || 0;
    const queriesLeft = queryCharge > 0 ? Math.floor(bal / queryCharge) : 0;
    const tier = profile.premium_tier || usage?.premium_tier;
    const isPaid = profile.is_premium || usage?.is_premium;
    const isUnlimited = Boolean(isPaid && tier && tier !== "pack_299");
    const remediesUnlocked = Boolean(
      usage?.remedy_unlocked || profile?.remedy_unlocked || isUnlimited || bal >= queryCharge
    );

    if (planEl) {
      if (isUnlimited) {
        const until = usage?.premium_expires_at
          ? new Date(usage.premium_expires_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
          : "";
        setCurrentPlanLine(
          planEl,
          until ? `Unlimited · active until ${until}` : "Unlimited (1 month)"
        );
      } else if (isPaid && tier === "pack_299") {
        const limit = usage?.query_limit ?? packQueries;
        const used = usage?.queries_used ?? 0;
        setCurrentPlanLine(planEl, `${limit}-query pack · ${used}/${limit} used`);
      } else if (remediesUnlocked) {
        setCurrentPlanLine(
          planEl,
          `Pay per query (₹${queryCharge}) · ${queriesLeft} left from balance`
        );
      } else {
        setCurrentPlanLine(planEl, "No plan active");
      }
      planEl.classList.toggle(
        "profile-summary__plan--premium",
        Boolean(isUnlimited || remediesUnlocked)
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
          `Basic Plans: ₹${packAmount} for ${packQueries} queries\n` +
          `Advance Plans: ₹${unlimitedAmount} for unlimited access for ${monthLabel}.`;
      }
    }

    if (walletEl) {
      const addedPart = added > 0 ? ` · Added ₹${added}` : "";
      if (isUnlimited) {
        walletEl.textContent = `Wallet Balance: ₹${bal}${addedPart}`;
      } else if (remediesUnlocked) {
        walletEl.textContent =
          `Wallet Balance: ₹${bal}${addedPart} — ₹${queryCharge} per query` +
          (queriesLeft > 0 ? ` · ~${queriesLeft} queries left` : "");
      } else {
        walletEl.textContent =
          `Wallet Balance: ₹${bal}${addedPart} — Add ₹${packAmount} (~${packQueries} queries at ₹${queryCharge} each), or ₹${unlimitedAmount} for unlimited`;
      }
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

  function kundaliNewHref() {
    const file = "kundali.html";
    const prefix = C?.DEPLOY_PREFIX || "";
    const qs = "?mode=new";
    const hash = document.documentElement.classList.contains("saptarishi-native-app")
      ? "#app=kundali"
      : "";
    if (/\/frontend\/html\//i.test(window.location.pathname)) {
      return `${prefix}/frontend/html/${file}${qs}${hash}`;
    }
    if (C?.PAGE_FILE_TO_PATH?.[file]) return `${C.PAGE_FILE_TO_PATH[file]}${qs}${hash}`;
    return `${file}${qs}${hash}`;
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
        window.location.href = "/kundali?auth=login";
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
    setCouponDownloadAvailable(null);
    showCouponStatus("");
  }

  function expectedCouponPrefix(amountInr) {
    const amount = Number(amountInr) || 0;
    const map = C?.WALLET_COUPON_PREFIX_BY_AMOUNT || {};
    return String(map[amount] || map[String(amount)] || "").trim();
  }

  function populateAmountOptions() {
    const plansWithCodes = (couponPlans || []).filter(
      (p) => Array.isArray(p.coupon_codes) && p.coupon_codes.length > 0
    );
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
    const prefix = expectedCouponPrefix(amount);
    let codes = Array.isArray(plan?.coupon_codes) ? plan.coupon_codes.slice() : [];
    // Strict filter: only codes for this top-up amount (never mix 299/500/1899).
    if (prefix) {
      codes = codes.filter((c) => String(c || "").toUpperCase().startsWith(prefix));
    } else {
      codes = [];
    }
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
      couponPlans = walletPayload.wallet?.topup_plans || [];
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
      window.location.href = "/kundali?auth=login";
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
          window.location.href = "/kundali?auth=login";
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
          window.location.href = "/kundali";
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
      setCouponDownloadAvailable(null);
      try {
        const result = await AUTH.sendDbCoupon({
          id: userId,
          amount_inr: amountInr,
          coupon_code: coupon
        });
        if (result.dumped && result.html) {
          setCouponDownloadAvailable({
            html: result.html,
            filename: result.filename,
            name: result.name,
            amount_inr: result.amount_inr
          });
          let saved = "";
          try {
            saved = await downloadCouponEmailFile(lastCouponEmailFile);
          } catch {
            saved = "";
          }
          const how =
            saved === "shared"
              ? "Use Share to save or send the HTML file."
              : saved === "cancelled"
                ? "Tap Download email HTML to save the file."
                : "Check Downloads, or tap Download email HTML.";
          showCouponStatus(
            `${result.message || "Email not sent (SMTP unavailable)."} ${how}`,
            true
          );
        } else {
          setCouponDownloadAvailable(null);
          showCouponStatus(
            result.message || `Sent ${result.coupon_code} to ${result.email}.`,
            Boolean(result.error && !result.sent)
          );
        }
        // Refresh unused coupon list after send.
        const walletPayload = await AUTH.fetchDbWallet();
        couponPlans = walletPayload.wallet?.topup_plans || [];
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

  if (couponDownloadBtn) {
    couponDownloadBtn.addEventListener("click", async () => {
      if (!lastCouponEmailFile) return;
      couponDownloadBtn.disabled = true;
      try {
        const saved = await downloadCouponEmailFile(lastCouponEmailFile);
        if (saved === "cancelled") {
          showCouponStatus("Save cancelled. Tap Download email HTML to try again.", true);
        } else if (saved === "shared") {
          showCouponStatus("Choose Save to Files / Downloads from the share sheet.", false);
        } else {
          showCouponStatus("Coupon email HTML downloaded. Search your Downloads folder.", false);
        }
      } catch (err) {
        showCouponStatus(err.message || "Could not download email HTML.", true);
      } finally {
        couponDownloadBtn.disabled = false;
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

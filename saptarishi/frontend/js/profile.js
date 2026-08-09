// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Profile view and edit page. */

(function profilePage(global) {
  const AUTH = global.SaptarishiAuth;
  const MODAL = global.SaptarishiAuthModal;
  const LOADING = global.SaptarishiLoading;
  if (!AUTH) return;

  const form = document.getElementById("profile-form");
  const summaryEl = document.getElementById("profile-summary");
  const statusEl = document.getElementById("profile-status");
  const planEl = document.getElementById("profile-plan");
  const walletEl = document.getElementById("profile-wallet");
  const usageEl = document.getElementById("profile-usage");
  const memberEl = document.getElementById("profile-member-since");
  const addWalletBtn = document.getElementById("profile-add-wallet-btn");

  function showStatus(message, isError) {
    if (!statusEl) return;
    if (LOADING) LOADING.stopStatusLoadingIndicator(statusEl);
    statusEl.textContent = message || "";
    statusEl.hidden = !message;
    statusEl.classList.remove("status--loading");
    statusEl.classList.toggle("error", Boolean(isError));
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

  function renderProfileSummary(profile, usage) {
    if (!summaryEl) return;
    summaryEl.hidden = false;

    if (planEl) {
      const tier = profile.premium_tier || usage?.premium_tier;
      const isPaid = profile.is_premium || usage?.is_premium;
      if (isPaid && tier === "pack_299") {
        const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
        const limit = usage?.query_limit ?? C?.PREMIUM_PACK_QUERY_LIMIT ?? 6;
        const used = usage?.queries_used ?? 0;
        planEl.textContent = `Plan: ${limit} queries · ${used}/${limit} used`;
      } else if (isPaid) {
        const until = usage?.premium_expires_at
          ? new Date(usage.premium_expires_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric"
            })
          : "";
        planEl.textContent = until
          ? `Plan: Unlimited until ${until}`
          : "Plan: Unlimited (1 month)";
      } else {
        planEl.textContent = "Plan: Free";
      }
      planEl.classList.toggle("profile-summary__plan--premium", Boolean(isPaid));
    }

    if (walletEl) {
      const bal =
        AUTH.getWalletBalance
          ? AUTH.getWalletBalance(usage || profile)
          : Number(profile.wallet_balance_inr || usage?.wallet_balance_inr) || 0;
      walletEl.textContent = `Wallet: ₹${bal}`;
      walletEl.hidden = false;
    }

    if (usageEl && usage && !usage.is_premium) {
      const used =
        usage.queries_used != null
          ? Number(usage.queries_used)
          : (Number(usage.kundali_used) || 0) + (Number(usage.auspicious_used) || 0);
      const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
      const limit = usage.query_limit ?? C?.MAX_FREE_QUERIES_PER_GUEST ?? 2;
      usageEl.textContent = `Usage: ${used}/${limit} queries`;
      usageEl.hidden = false;
    } else if (usageEl) {
      usageEl.hidden = true;
    }

    if (memberEl) {
      const joined = formatDate(profile.created_at);
      memberEl.textContent = joined ? `Member since ${joined}` : "";
      memberEl.hidden = !joined;
    }
  }

  function populateProfileForm(profile) {
    if (!form) return;
    document.getElementById("profile-name").value = profile.name || "";
    document.getElementById("profile-mobile").value = profile.mobile || "";
    document.getElementById("profile-email").value = profile.email || "";
    form.hidden = false;
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

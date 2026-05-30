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
  const usageEl = document.getElementById("profile-usage");
  const memberEl = document.getElementById("profile-member-since");

  function showStatus(message, isError) {
    if (!statusEl) return;
    if (LOADING) LOADING.stop(statusEl);
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

  function fillSummary(profile, usage) {
    if (!summaryEl) return;
    summaryEl.hidden = false;

    if (planEl) {
      planEl.textContent = profile.is_premium || usage?.is_premium
        ? "Plan: Premium · unlimited scans"
        : "Plan: Free";
      planEl.classList.toggle("profile-summary__plan--premium", Boolean(profile.is_premium || usage?.is_premium));
    }

    if (usageEl && usage && !usage.is_premium) {
      const k = Number(usage.kundali_used) || 0;
      const a = Number(usage.auspicious_used) || 0;
      const kMax = usage.kundali_limit ?? 5;
      const aMax = usage.auspicious_limit ?? 2;
      usageEl.textContent = `Usage: ${k}/${kMax} kundali · ${a}/${aMax} auspicious`;
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

  function fillForm(profile) {
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

  async function loadProfile() {
    showStatus("Loading profile…", false);
    try {
      const payload = await AUTH.fetchProfile();
      fillSummary(payload.profile || {}, payload.usage || payload.user || {});
      fillForm(payload.profile || {});
      showStatus("");
    } catch (err) {
      if (err.status === 401) {
        AUTH.clearSession();
        window.location.href = "kundali.html?auth=login";
        return;
      }
      showStatus(err.message || "Could not load profile", true);
    }
  }

  async function init() {
    const authed = await ensureLoggedIn();
    if (!authed) {
      window.location.href = "kundali.html?auth=login";
      return;
    }
    await loadProfile();
  }

  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      form.querySelectorAll("input, button").forEach((el) => {
        el.disabled = true;
      });
      if (LOADING) {
        LOADING.start(statusEl);
      } else {
        showStatus("Saving…", false);
      }

      try {
        const payload = await AUTH.updateProfile(
          document.getElementById("profile-name").value,
          document.getElementById("profile-mobile").value,
          document.getElementById("profile-email").value
        );
        fillSummary(payload.profile || {}, payload.usage || payload.user || {});
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})(window);

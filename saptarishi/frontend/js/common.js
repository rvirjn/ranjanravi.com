// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Common UI for all pages: header, footer, view counter, and optional login popup.
 */

(function common(global) {
  const AUTH = global.SaptarishiAuth;
  const MODAL = global.SaptarishiAuthModal;
  const PREMIUM = global.SaptarishiPremiumModal;

  const isLoginPage =
    /^\/login\/?$/i.test(window.location.pathname) ||
    /login\.html$/i.test(window.location.pathname);
  const logoutTimers = new WeakMap();

  function pageHref(file) {
    const C =
      typeof SAPTARISHI_CONSTANTS !== "undefined"
        ? SAPTARISHI_CONSTANTS
        : global.SAPTARISHI_CONSTANTS;
    const prefix = (C && C.DEPLOY_PREFIX) || "";
    if (/\/frontend\/html\//i.test(window.location.pathname)) {
      return `${prefix}/frontend/html/${file}`;
    }
    const map = C && C.PAGE_FILE_TO_PATH;
    if (map && map[file]) return map[file];
    return `${prefix}/frontend/html/${file}`;
  }

  function navHref(file) {
    return pageHref(file);
  }

  function normalizePath(path) {
    const value = String(path || "").split("?")[0].replace(/\/+$/, "");
    return value || "/";
  }

  function formatPremiumExpiry(isoValue) {
    if (!isoValue) return "";
    const date = new Date(isoValue);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  }

  function usageText(usage) {
    if (!usage || !AUTH) return "";
    const u = AUTH.normalizeUsage ? AUTH.normalizeUsage(usage) : usage;
    if (u.is_premium) {
      if (u.premium_tier === "pack_50") {
        const limit = u.query_limit ?? 50;
        const used = u.queries_used ?? 0;
        return `Premium · ${used}/${limit} queries`;
      }
      const until = formatPremiumExpiry(u.premium_expires_at);
      return until
        ? `Premium · unlimited until ${until}`
        : "Premium · unlimited (1 month)";
    }
    const used =
      u.queries_used != null
        ? Number(u.queries_used)
        : (Number(u.kundali_used) || 0) + (Number(u.auspicious_used) || 0);
    const limit = u.query_limit ?? 5;
    const remaining =
      u.queries_remaining != null ? Number(u.queries_remaining) : Math.max(0, limit - used);
    const displayUsed = Math.min(used, limit);
    const label =
      remaining > 0 && used === 0
        ? `${limit} free queries`
        : remaining > 0
          ? `${remaining}/${limit} free queries`
          : `${displayUsed}/${limit} queries`;
    return u.is_guest ? `Free plan: ${label}` : label;
  }

  function buildHeader(user, viewCount, usage) {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="site-header__brand">
        <a href="${navHref("kundali.html")}" class="site-header__logo">Saptarishi</a>
      </div>
      <nav class="site-header__nav" aria-label="Main">
        <a href="${navHref("kundali.html")}" class="site-header__link">Kundali</a>
        <a href="${navHref("auspicious.html")}" class="site-header__link">Auspicious</a>
        <a href="${navHref("remedy.html")}" class="site-header__link">Remedy</a>
      </nav>
      <div class="site-header__meta">
        <span class="site-header__usage" hidden></span>
        <a href="${navHref("profile.html")}" class="site-header__link site-header__profile" id="site-profile-link" hidden title="My profile">Profile</a>
        <button type="button" id="site-premium-btn" class="site-header__premium">Buy Premium</button>
        <button type="button" id="site-login-btn" class="site-header__login">Login</button>
        <button type="button" id="site-logout-btn" class="site-header__logout" hidden>Logout</button>
      </div>
    `;
    updateHeaderAuth(header, user, usage);
    wireHeaderAuthButtons(header);
    return header;
  }

  function resolveHeaderUser(userArg) {
    if (userArg !== undefined) return userArg;
    if (!AUTH || !AUTH.getToken()) return null;
    return AUTH.getUser();
  }

  function updateHeaderAuth(header, user, usage) {
    if (!header) header = document.querySelector(".site-header");
    if (!header) return;

    const resolvedUser = resolveHeaderUser(user);
    const displayUsage = usage || resolvedUser || (AUTH ? AUTH.getUsage() : null);
    const profileLink = header.querySelector("#site-profile-link");
    const usageEl = header.querySelector(".site-header__usage");
    const premiumBtn = header.querySelector("#site-premium-btn");
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");

    const isUnlimited = Boolean(
      displayUsage &&
      displayUsage.is_premium &&
      displayUsage.premium_tier !== "pack_50"
    );
    if (premiumBtn) {
      premiumBtn.hidden = isUnlimited;
      premiumBtn.textContent =
        displayUsage?.premium_tier === "pack_50" ? "Upgrade" : "Buy Premium";
    }

    if (resolvedUser) {
      if (profileLink) {
        profileLink.textContent = resolvedUser.name || resolvedUser.mobile || "Profile";
        profileLink.hidden = false;
        profileLink.title = "My profile";
      }
      if (loginBtn) loginBtn.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
    } else {
      if (profileLink) {
        profileLink.hidden = true;
        profileLink.textContent = "Profile";
      }
      if (loginBtn) loginBtn.hidden = false;
      if (logoutBtn) logoutBtn.hidden = true;
    }

    if (usageEl) {
      const text = usageText(displayUsage);
      if (text) {
        usageEl.textContent = text;
        usageEl.hidden = false;
      } else {
        usageEl.hidden = true;
      }
    }
  }

  function setLogoutLoading(logoutBtn, loading) {
    if (!logoutBtn) return;

    const timerId = logoutTimers.get(logoutBtn);
    if (timerId != null) {
      window.clearInterval(timerId);
      logoutTimers.delete(logoutBtn);
    }

    logoutBtn.disabled = loading;
    logoutBtn.classList.toggle("site-header__logout--loading", loading);
    logoutBtn.setAttribute("aria-busy", loading ? "true" : "false");

    if (loading) {
      const startedAt = Date.now();
      logoutBtn.innerHTML = `
        <span class="status-loader status-loader--inline" aria-label="Logging out">
          <span class="status-loader__ring"></span>
          <span class="status-loader__seconds">0</span>
        </span>
        <span>Logging out…</span>
      `;
      const secondsEl = logoutBtn.querySelector(".status-loader__seconds");
      const tick = () => {
        if (secondsEl) {
          secondsEl.textContent = String(Math.floor((Date.now() - startedAt) / 1000));
        }
      };
      tick();
      logoutTimers.set(logoutBtn, window.setInterval(tick, 250));
    } else {
      logoutBtn.textContent = "Logout";
    }
  }

  function wireHeaderAuthButtons(header) {
    if (!AUTH) return;
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");
    const premiumBtn = header.querySelector("#site-premium-btn");

    if (premiumBtn) {
      premiumBtn.addEventListener("click", () => {
        if (AUTH.openPremiumFlow) {
          AUTH.openPremiumFlow({ required: false });
        } else if (PREMIUM) {
          PREMIUM.open();
        }
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        if (MODAL) MODAL.open({ tab: "login", required: false });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        if (logoutBtn.disabled) return;
        setLogoutLoading(logoutBtn, true);
        try {
          await AUTH.logout();
          updateHeaderAuth(header, null, null);
          await AUTH.fetchUsage();
          updateHeaderAuth(header, null, AUTH.getUsage());
        } finally {
          setLogoutLoading(logoutBtn, false);
          updateHeaderAuth(header, null, AUTH ? AUTH.getUsage() : null);
        }
      });
    }
  }

  function buildFooter() {
    const AC =
      typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {};
    const phone = String(AC.PREMIUM_CONTACT_PHONE || "8184046618").replace(/\D/g, "");
    const email = String(AC.SUPPORT_EMAIL || "raviranjan.amu@gmail.com").trim();
    const phoneIntl = phone.startsWith("91") ? phone : `91${phone}`;
    const phoneDisplay = phone.length === 10 ? phone : phone.replace(/^91/, "");
    const waMessage = encodeURIComponent(
      String(AC.SUPPORT_WHATSAPP_MESSAGE || "Hi, I need support with Saptarishi.")
    );
    const mailSubject = encodeURIComponent(
      String(AC.SUPPORT_EMAIL_SUBJECT || "Saptarishi support")
    );
    const mailBody = encodeURIComponent(
      String(AC.SUPPORT_EMAIL_BODY || "Hi,\n\nI need help with Saptarishi.\n\n")
    );
    const mailHref = `mailto:${encodeURIComponent(email)}?subject=${mailSubject}&body=${mailBody}`;
    const waHref = `https://wa.me/${phoneIntl}?text=${waMessage}`;

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <p class="site-footer__copy">© ${new Date().getFullYear()} ranjanravi.com · Saptarishi</p>
      <p class="site-footer__note">Paid plans: ₹299 for 50 queries or ₹1899 for unlimited access for 1 month.</p>
      <div class="site-footer__meta">
        <p class="site-footer__views site-footer__views--pending" title="Total site views">Site views: …</p>
        <span class="site-footer__meta-sep" aria-hidden="true">·</span>
        <button type="button" class="site-footer__contact-toggle" id="site-contact-toggle" aria-expanded="false" aria-controls="site-contact">Contact us</button>
      </div>
      <div id="site-contact" class="site-footer__support" hidden>
        <a class="site-footer__support-link" href="${mailHref}">Email</a>
        <span class="site-footer__support-sep" aria-hidden="true">·</span>
        <a class="site-footer__support-link" href="${waHref}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <span class="site-footer__support-sep" aria-hidden="true">·</span>
        <a class="site-footer__support-link" href="tel:+${phoneIntl}">Call ${phoneDisplay}</a>
      </div>
    `;
    return footer;
  }

  function wireFooterContact(footer) {
    const toggle = footer.querySelector("#site-contact-toggle");
    const panel = footer.querySelector("#site-contact");
    if (!toggle || !panel) return;

    toggle.addEventListener("click", () => {
      const show = panel.hidden;
      panel.hidden = !show;
      toggle.setAttribute("aria-expanded", show ? "true" : "false");
    });
  }

  function mountLayout(user, viewCount, usage) {
    const body = document.body;
    if (!body || body.querySelector(".site-header")) return;

    const shell = document.getElementById("saptarishi");
    const header = buildHeader(user, viewCount, usage);
    const footer = buildFooter();

    body.insertBefore(header, body.firstChild);
    if (shell) {
      shell.classList.add("main-shell--with-chrome");
      shell.after(footer);
    } else {
      body.appendChild(footer);
    }
    wireFooterContact(footer);

    const path = normalizePath(window.location.pathname);
    body.querySelectorAll(".site-header__nav .site-header__link").forEach((link) => {
      const href = normalizePath(link.getAttribute("href"));
      if (path === href) {
        link.classList.add("site-header__link--active");
      }
    });

    const profileLink = body.querySelector("#site-profile-link");
    if (profileLink && (path === "/profile" || /profile\.html$/i.test(window.location.pathname))) {
      profileLink.classList.add("site-header__link--active");
    }
  }

  function authQueryTab() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("auth")) return null;
    const tab = params.get("auth") === "register" ? "register" : "login";
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);
    return tab;
  }

  function updateFooterViews(viewCount) {
    const viewsEl = document.querySelector(".site-footer__views");
    if (!viewsEl) return;
    if (viewCount == null || viewCount === "") {
      viewsEl.textContent = "Site views: …";
      viewsEl.classList.add("site-footer__views--pending");
      return;
    }
    viewsEl.textContent = `Site views: ${viewCount}`;
    viewsEl.classList.remove("site-footer__views--pending");
  }

  function recordPageView() {
    if (!AUTH || !AUTH.recordSiteView) return;
    const cached = AUTH.getCachedViewCount ? AUTH.getCachedViewCount() : null;
    if (cached != null) updateFooterViews(cached);

    AUTH.recordSiteView()
      .then((result) => {
        if (result && result.view_count != null) {
          updateFooterViews(result.view_count);
        }
      })
      .catch(() => {
        /* keep cached or … */
      });
  }

  async function refreshAuthState() {
    if (!AUTH) return;
    let user = AUTH.getUser();
    let usage = AUTH.getUsage();

    if (AUTH.getToken()) {
      try {
        const me = await AUTH.refreshMe();
        user = me.user || user;
        usage = me.usage || usage;
      } catch (err) {
        if (err.status === 401) {
          AUTH.clearSession();
          user = null;
          usage = null;
        } else {
          user = AUTH.getUser() || user;
          usage = AUTH.getUsage() || usage;
        }
      }
    } else {
      try {
        const usagePayload = await AUTH.fetchUsage();
        usage = usagePayload.usage || usage;
      } catch {
        /* ignore */
      }
    }

    updateHeaderAuth(document.querySelector(".site-header"), user, usage);
  }

  function init() {
    if (isLoginPage) {
      window.location.replace(`${navHref("kundali.html")}?auth=login`);
      return;
    }

    mountLayout(AUTH ? AUTH.getUser() : null, null, AUTH ? AUTH.getUsage() : null);
    recordPageView();

    global.addEventListener("saptarishi-auth-changed", (event) => {
      if (!AUTH) return;
      const detail = event.detail || {};
      updateHeaderAuth(
        document.querySelector(".site-header"),
        "user" in detail ? detail.user : undefined,
        "usage" in detail ? detail.usage : undefined
      );
    });

    const authTab = authQueryTab();
    if (authTab && MODAL) {
      MODAL.open({ tab: authTab, required: false });
    }

    refreshAuthState().catch(() => {
      /* keep header visible with cached session */
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})(window);

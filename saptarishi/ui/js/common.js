// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Common UI for all pages: header, footer, view counter, and optional login popup.
 */

(function common(global) {
  const AUTH = global.SaptarishiAuth;
  const MODAL = global.SaptarishiAuthModal;
  if (!AUTH) return;

  const isLoginPage = /login\.html$/i.test(window.location.pathname);

  function navHref(file) {
    const base = window.location.pathname.replace(/\/[^/]+$/, "");
    return `${base}/${file}`;
  }

  function usageText(usage) {
    if (!usage) return "";
    const u = AUTH.normalizeUsage ? AUTH.normalizeUsage(usage) : usage;
    const k = Number(u.kundali_used) || 0;
    const a = Number(u.auspicious_used) || 0;
    const kMax = u.kundali_limit ?? 5;
    const aMax = u.auspicious_limit ?? 2;
    const counts = `${k}/${kMax} kundali · ${a}/${aMax} auspicious`;
    return u.is_guest ? `Free plan: ${counts}` : counts;
  }

  function buildHeader(user, viewCount, usage) {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <div class="site-header__brand">
        <a href="${navHref("kundali.html")}" class="site-header__logo">Saptarishi</a>
        <span class="site-header__tagline">Vedic charts &amp; auspicious times</span>
      </div>
      <nav class="site-header__nav" aria-label="Main">
        <a href="${navHref("kundali.html")}" class="site-header__link">Kundali</a>
        <a href="${navHref("auspicious.html")}" class="site-header__link">Auspicious</a>
      </nav>
      <div class="site-header__meta">
        <span class="site-header__views" title="Website views">Views: ${viewCount ?? "—"}</span>
        <span class="site-header__user" hidden></span>
        <span class="site-header__usage" hidden></span>
        <button type="button" id="site-login-btn" class="site-header__login">Login</button>
        <button type="button" id="site-logout-btn" class="site-header__logout" hidden>Logout</button>
      </div>
    `;
    updateHeaderAuth(header, user, usage);
    wireHeaderAuthButtons(header);
    return header;
  }

  function updateHeaderAuth(header, user, usage) {
    if (!header) header = document.querySelector(".site-header");
    if (!header) return;

    const displayUsage = usage || user || AUTH.getUsage();
    const userEl = header.querySelector(".site-header__user");
    const usageEl = header.querySelector(".site-header__usage");
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");

    if (user) {
      if (userEl) {
        userEl.textContent = user.name || user.mobile;
        userEl.hidden = false;
      }
      if (loginBtn) loginBtn.hidden = true;
      if (logoutBtn) logoutBtn.hidden = false;
    } else {
      if (userEl) userEl.hidden = true;
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

  function wireHeaderAuthButtons(header) {
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");

    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        if (MODAL) MODAL.open({ tab: "login", required: false });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await AUTH.logout();
        await AUTH.fetchUsage();
        updateHeaderAuth(header, null, AUTH.getUsage());
      });
    }
  }

  function buildFooter() {
    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <p class="site-footer__copy">© ${new Date().getFullYear()} ranjanravi.com · Saptarishi</p>
      <p class="site-footer__note">5 free kundali and 2 free auspicious scans without login. Premium after that.</p>
    `;
    return footer;
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

    const path = window.location.pathname;
    body.querySelectorAll(".site-header__link").forEach((link) => {
      if (path.endsWith(link.getAttribute("href").split("/").pop())) {
        link.classList.add("site-header__link--active");
      }
    });
  }

  function authQueryTab() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("auth")) return null;
    const tab = params.get("auth") === "register" ? "register" : "login";
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, "", clean);
    return tab;
  }

  async function init() {
    if (isLoginPage) {
      window.location.replace(`${navHref("kundali.html")}?auth=login`);
      return;
    }

    let viewPayload = { view_count: 0 };
    try {
      viewPayload = await AUTH.recordSiteView();
    } catch {
      /* view count is optional when API is down */
    }

    let user = AUTH.getUser();
    let usage = AUTH.getUsage();

    if (AUTH.getToken()) {
      try {
        const me = await AUTH.refreshMe();
        user = me.user || user;
        usage = me.usage || usage;
        viewPayload.view_count = me.view_count ?? viewPayload.view_count;
      } catch (err) {
        if (err.status === 401) AUTH.clearSession();
        user = null;
      }
    } else {
      try {
        const usagePayload = await AUTH.fetchUsage();
        usage = usagePayload.usage || usage;
      } catch {
        /* ignore */
      }
    }

    mountLayout(user, viewPayload.view_count, usage);

    const authTab = authQueryTab();
    if (authTab && MODAL) {
      MODAL.open({ tab: authTab, required: false });
    }

    global.addEventListener("saptarishi-auth-changed", (event) => {
      updateHeaderAuth(
        document.querySelector(".site-header"),
        event.detail?.user || AUTH.getUser(),
        event.detail?.usage || AUTH.getUsage()
      );
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => init());
  } else {
    init();
  }
})(window);

// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Common UI for all pages: header, footer, view counter, and optional login popup.
 */

(function common(global) {
  if (/SaptarishiNativeApp/i.test(navigator.userAgent || "")) {
    document.documentElement.classList.add("saptarishi-native-app");
  }

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AC) return;
  const AUTH = global.SaptarishiAuth;
  const MODAL = global.SaptarishiAuthModal;

  const isLoginPage =
    /^\/login\/?$/i.test(window.location.pathname) ||
    /login\.html$/i.test(window.location.pathname);
  const logoutTimers = new WeakMap();

  function isNativeAppShell() {
    return (
      document.documentElement.classList.contains("saptarishi-native-app") ||
      /SaptarishiNativeApp/i.test(navigator.userAgent || "")
    );
  }

  function isLocalDevUiHost() {
    if (isNativeAppShell()) return false;
    const host = window.location.hostname;
    return (
      window.location.protocol === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  }

  function getApiOrigin(constants) {
    const cfg = constants || AC;
    if (isLocalDevUiHost()) {
      return `http://localhost:${cfg.FLASK_PORT}`;
    }
    return String(cfg.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  /** Display India mobile as ``+91-XXXXXXXXXX`` (tel/wa links still use digits only). */
  function formatIndiaPhoneDisplay(raw) {
    const digits = String(raw || "").replace(/\D/g, "").replace(/^91/, "");
    return digits ? `+91-${digits}` : "";
  }

  function indiaPhoneDigits(raw) {
    const digits = String(raw || "").replace(/\D/g, "").replace(/^91/, "");
    return digits.length === 10 ? `91${digits}` : digits;
  }

  function originHref(raw) {
    const trimmed = String(raw || "").trim().replace(/\/+$/, "");
    return trimmed ? `${trimmed}/` : "";
  }

  function hostFromOrigin(raw) {
    try {
      return new URL(originHref(raw) || String(raw || "")).hostname;
    } catch {
      return "";
    }
  }

  function paidPlanNote() {
    const months = Number(AC.PREMIUM_UNLIMITED_MONTHS) || 1;
    const monthLabel = months === 1 ? "1 month" : `${months} months`;
    const freeBirths = AC.FREE_BIRTHS_PER_USER ?? 2;
    const basicAmount = AC.BIRTH_CHARGE_INR ?? AC.QUERY_CHARGE_INR ?? 21;
    const advanceAmount = AC.PREMIUM_UNLIMITED_AMOUNT_INR ?? 599;
    return (
      `Free Plan: ${freeBirths} birth details free\n` +
      `Basic Plan: ₹${basicAmount} for 1 birth details\n` +
      `Advance Plan: ₹${advanceAmount} for unlimited access for ${monthLabel}.`
    );
  }

  function contactPhone() {
    return String(AC.CONTACT_PHONE || AC.PREMIUM_CONTACT_PHONE || "").trim();
  }

  function contactEmail() {
    return String(AC.CONTACT_EMAIL || AC.SUPPORT_EMAIL || "").trim();
  }

  function placePresetOptions() {
    const places = Array.isArray(AC.BIRTH_PLACE_PRESETS) ? AC.BIRTH_PLACE_PRESETS : [];
    const custom = AC.PLACE_CUSTOM_VALUE || "__custom__";
    return [
      { value: "", label: "Select place…" },
      ...places.map((place) => ({ value: place, label: place })),
      { value: custom, label: "Other…" }
    ];
  }

  function fillPlacePresetSelects(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const options = placePresetOptions();
    scope.querySelectorAll("#place-preset, .compare-place-preset").forEach((select) => {
      const current = select.value;
      select.innerHTML = "";
      for (const item of options) {
        const opt = document.createElement("option");
        opt.value = item.value;
        opt.textContent = item.label;
        select.appendChild(opt);
      }
      if (current) select.value = current;
    });
  }

  function applyFormFieldLimits(root) {
    const scope = root && root.querySelectorAll ? root : document;
    const nameMax = Number(AC.MAX_NAME_LENGTH) || 120;
    const emailMax = Number(AC.MAX_EMAIL_LENGTH) || 240;
    const placeMax = Number(AC.MAX_PLACE_QUERY_LENGTH) || 240;
    const pwMin = Number(AC.MIN_PASSWORD_LENGTH) || 4;
    const pwPlaceholder = `At least ${pwMin} characters`;
    scope.querySelectorAll("#birth-name").forEach((el) => {
      el.maxLength = nameMax;
      el.placeholder = AC.NAME_PLACEHOLDER || el.placeholder;
    });
    scope.querySelectorAll("#profile-name, #auth-modal-reg-name").forEach((el) => {
      el.maxLength = nameMax;
    });
    const nameFull = scope.querySelector("#auth-modal-reg-name");
    if (nameFull) nameFull.placeholder = AC.FULL_NAME_PLACEHOLDER || nameFull.placeholder;
    scope.querySelectorAll(
      "#profile-email, #auth-modal-reg-email, #auth-modal-forgot-email"
    ).forEach((el) => {
      el.maxLength = emailMax;
      el.placeholder = AC.EMAIL_PLACEHOLDER || el.placeholder;
    });
    scope.querySelectorAll("#place-custom, .compare-place-custom").forEach((el) => {
      el.maxLength = placeMax;
      el.placeholder = AC.PLACE_CUSTOM_PLACEHOLDER || el.placeholder;
    });
    scope.querySelectorAll(
      'input[type="password"][minlength], #profile-current-password, #profile-new-password, #profile-confirm-password, #profile-delete-password, #auth-modal-login-password, #auth-modal-reg-password, #auth-modal-reg-password-confirm'
    ).forEach((el) => {
      el.minLength = pwMin;
    });
    scope.querySelectorAll("#profile-new-password, #auth-modal-reg-password").forEach((el) => {
      el.placeholder = pwPlaceholder;
    });
    scope.querySelectorAll(
      "#profile-mobile, #auth-modal-login-mobile, #auth-modal-reg-mobile, #auth-modal-forgot-mobile"
    ).forEach((el) => {
      el.placeholder = AC.MOBILE_PLACEHOLDER || el.placeholder;
    });
  }

  function privacyPolicyHref() {
    return navHref("privacy.html");
  }

  function appendCreditLink(parent, href, text) {
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = text;
    parent.appendChild(a);
  }

  function appendRequiredDataCredits(container, { includeEphemeris = false, leadingSpace = true } = {}) {
    if (!container) return;
    if (leadingSpace) container.append(document.createTextNode(" "));
    container.append(document.createTextNode("Place search "));
    appendCreditLink(container, "https://www.geoapify.com/", "Powered by Geoapify");
    container.append(document.createTextNode(" · "));
    appendCreditLink(
      container,
      "https://www.openstreetmap.org/copyright",
      "© OpenStreetMap contributors"
    );
    if (includeEphemeris) {
      container.append(document.createTextNode(" · Planetary positions from "));
      appendCreditLink(container, "https://ssd.jpl.nasa.gov/", "NASA JPL");
      container.append(document.createTextNode(" via "));
      appendCreditLink(container, "https://rhodesmill.org/skyfield/", "Skyfield");
    }
    container.append(document.createTextNode("."));
  }

  function makePrivacyNote(textBeforeLink) {
    const note = document.createElement("p");
    note.className = "privacy-collect-note";
    note.append(document.createTextNode(textBeforeLink));
    const link = document.createElement("a");
    link.href = privacyPolicyHref();
    link.textContent = "Privacy Policy";
    note.appendChild(link);
    note.append(document.createTextNode("."));
    return note;
  }

  function attachPrivacyNote(form, textBeforeLink) {
    if (!form || form.querySelector(".privacy-collect-note")) return;
    const note = makePrivacyNote(textBeforeLink);
    const submit = form.querySelector(".form-field--submit");
    if (submit && submit.parentNode) submit.parentNode.insertBefore(note, submit);
    else form.appendChild(note);
  }

  function mountCollectionNotices() {
    const birthText =
      "Name, date, time, and place of birth you enter are sent to our servers to generate results. See ";
    const placeText =
      "Place you enter is sent to our servers to calculate timings. We do not use device GPS. See ";
    attachPrivacyNote(document.getElementById("birth-form"), birthText);
    attachPrivacyNote(document.getElementById("remedy-form"), birthText);
    attachPrivacyNote(document.getElementById("auspicious-form"), placeText);
    attachPrivacyNote(
      document.getElementById("kundali-compare-form"),
      "Names, dates, times, and places you enter for comparison are sent to our servers. See "
    );
  }

  function fillPrivacyPageFromConstants() {
    if (!document.getElementById("privacy-email") && !document.getElementById("privacy-updated")) {
      return;
    }
    const siteName = String(AC.SITE_NAME || "Saptarishi");
    const operator = String(AC.OPERATOR_NAME || "");
    const siteHref = originHref(AC.SITE_ORIGIN);
    const siteText = siteHref || String(AC.SITE_ORIGIN || "");
    const email = contactEmail();
    const phone = contactPhone();
    const phoneDisplay = formatIndiaPhoneDisplay(phone);
    const phoneIntl = indiaPhoneDigits(phone);

    const setText = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text || "";
    };
    const setLink = (id, href, text) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (href) el.setAttribute("href", href);
      el.textContent = text || href || "";
    };

    setText("privacy-updated", AC.PRIVACY_LAST_UPDATED || "");
    setText("privacy-site-name", siteName);
    setLink("privacy-site-url", siteHref, siteText);
    setText("privacy-operator", operator);
    setText("privacy-api-host", hostFromOrigin(AC.PRODUCTION_API_ORIGIN));
    setLink("privacy-email", email ? `mailto:${email}` : "", email);
    setLink("privacy-phone", phoneIntl ? `tel:+${phoneIntl}` : "", phoneDisplay);
    setLink("privacy-site-contact", siteHref, siteText);
    setText("privacy-min-age", String(AC.CHILDREN_PRIVACY_MIN_AGE || 13));

    const desc = document.querySelector('meta[name="description"]');
    if (desc) {
      desc.setAttribute("content", `Privacy Policy for ${siteName} by ${operator}`);
    }
  }

  function setStatusMessage(statusEl, message, isError, isLimitError) {
    if (!statusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.stopStatusLoadingIndicator(statusEl);
    }
    const text = message || "";
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle("error", Boolean(isError));
    statusEl.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function startStatusLoading(statusEl, fallbackSetter) {
    if (!statusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.startStatusLoadingIndicator(statusEl);
      return;
    }
    if (typeof fallbackSetter === "function") {
      fallbackSetter("Loading…");
    }
  }

  function removePerIpText(message) {
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatApiLoadError(err, options = {}) {
    const msg = removePerIpText(err?.message || "Request failed");
    const limitReached =
      Boolean(err?.premiumRequired) || /limit reached/i.test(msg);
    return {
      text: limitReached
        ? msg || options.limitReachedFallback || "Free limit reached."
        : `${options.failurePrefix || "Request failed"}: ${msg}`,
      limitReached
    };
  }

  async function parseApiJsonResponse(response, options = {}) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      const restartHint = options.restartHint || "Restart Flask after code updates.";
      throw new Error(
        `API returned HTML (HTTP ${response.status}). ${restartHint}`
      );
    }
  }

  function getPlaceFromPresetOrCustom(placePresetEl, placeCustomEl, customValue) {
    if (!placePresetEl) return "";
    if (placePresetEl.value === customValue) {
      return (placeCustomEl && placeCustomEl.value.trim()) || "";
    }
    return placePresetEl.value.trim();
  }

  function syncCustomPlaceVisibility(placePresetEl, customWrapEl, placeCustomEl, customValue) {
    const isCustom = placePresetEl && placePresetEl.value === customValue;
    if (customWrapEl) customWrapEl.hidden = !isCustom;
    if (!isCustom && placeCustomEl) placeCustomEl.value = "";
  }

  function pageHref(file) {
    const prefix = AC.DEPLOY_PREFIX;
    if (/\/frontend\/html\//i.test(window.location.pathname)) {
      return `${prefix}/frontend/html/${file}`;
    }
    const map = AC.PAGE_FILE_TO_PATH;
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

  function formatUsageBadgeText(usage) {
    // Plan / wallet details live on Profile; keep the header clean.
    void usage;
    return "";
  }

  function drawerIcon(paths) {
    return `<svg class="site-drawer__icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  }

  function avatarInitials(user) {
    const source = String((user && (user.name || user.mobile)) || "Saptarishi").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return source.slice(0, 2).toUpperCase();
  }

  function updateDrawerAuth(user, usage) {
    const drawer = document.getElementById("site-drawer");
    if (!drawer) return;
    const nameEl = drawer.querySelector("#site-drawer-name");
    const metaEl = drawer.querySelector("#site-drawer-meta");
    const avatarEl = drawer.querySelector("#site-drawer-avatar");
    const loginLink = drawer.querySelector("#site-drawer-login");
    const logoutBtn = drawer.querySelector("#site-drawer-logout");
    if (nameEl) nameEl.textContent = user ? user.name || user.mobile || "Account" : "Guest";
    if (avatarEl) avatarEl.textContent = avatarInitials(user);
    if (metaEl) {
      if (user) {
        const bal =
          AUTH && AUTH.getWalletBalance
            ? AUTH.getWalletBalance(usage || user)
            : Number(usage?.wallet_balance_inr) || 0;
        metaEl.textContent = `Wallet ₹${bal}`;
      } else {
        metaEl.textContent = "Sign in to save charts";
      }
    }
    if (loginLink) loginLink.hidden = Boolean(user);
    if (logoutBtn) logoutBtn.hidden = !user;
  }

  function ensureSiteDrawer(header) {
    if (isNativeAppShell() || !header) return null;
    let drawer = document.getElementById("site-drawer");
    if (drawer) return drawer;

    drawer = document.createElement("div");
    drawer.id = "site-drawer";
    drawer.className = "site-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <button type="button" class="site-drawer__backdrop" id="site-drawer-backdrop" tabindex="-1" aria-label="Close menu"></button>
      <div class="site-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu">
        <div class="site-drawer__user">
          <span class="site-drawer__avatar" id="site-drawer-avatar">S</span>
          <div class="site-drawer__user-text">
            <strong class="site-drawer__user-name" id="site-drawer-name">Guest</strong>
            <span class="site-drawer__user-meta" id="site-drawer-meta">Sign in to save charts</span>
          </div>
        </div>
        <nav class="site-drawer__nav" aria-label="Pages">
          <a href="${navHref("kundali.html")}" class="site-drawer__link" data-page="kundali">
            ${drawerIcon('<circle cx="12" cy="12" r="9"></circle><path d="M12 3v18M3 12h18"></path>')}
            <span>Kundali</span>
          </a>
          <a href="${navHref("remedy.html")}" class="site-drawer__link" data-page="remedy">
            ${drawerIcon('<path d="M5 19c8-1 14-8 14-15-7 1-14 6-14 15z"></path><path d="M8 14c2.2-2 5.2-4.2 9-5.2"></path>')}
            <span>Remedy</span>
          </a>
          <a href="${navHref("auspicious.html")}" class="site-drawer__link" data-page="auspicious">
            ${drawerIcon('<rect x="3.5" y="5" width="17" height="15.5" rx="2"></rect><path d="M8 3v4M16 3v4M3.5 10h17"></path>')}
            <span>Auspicious</span>
          </a>
        </nav>
        <nav class="site-drawer__nav" aria-label="Account">
          <a href="${navHref("profile.html")}" class="site-drawer__link" data-page="profile">
            ${drawerIcon('<circle cx="12" cy="8" r="3.2"></circle><path d="M5 19.2c.8-3.4 3.4-5.1 7-5.1s6.2 1.7 7 5.1"></path>')}
            <span>Profile</span>
          </a>
          <a href="${navHref("privacy.html")}" class="site-drawer__link" data-page="privacy">
            ${drawerIcon('<path d="M12 3l8 4v6c0 5-3.4 8.4-8 9.4C7.4 21.4 4 18 4 13V7z"></path>')}
            <span>Privacy</span>
          </a>
          <button type="button" class="site-drawer__link" id="site-drawer-login">
            ${drawerIcon('<path d="M10 17l5-5-5-5M15 12H4"></path><path d="M20 4v16"></path>')}
            <span>Login</span>
          </button>
          <button type="button" class="site-drawer__link" id="site-drawer-logout" hidden>
            ${drawerIcon('<path d="M10 17l-5-5 5-5M5 12h11"></path><path d="M20 4v16"></path>')}
            <span>Logout</span>
          </button>
        </nav>
      </div>
    `;
    document.body.appendChild(drawer);

    drawer.querySelector("#site-drawer-backdrop").addEventListener("click", () => {
      setHeaderMenuOpen(header, false);
    });
    drawer.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setHeaderMenuOpen(header, false));
    });
    const loginLink = drawer.querySelector("#site-drawer-login");
    if (loginLink) {
      loginLink.addEventListener("click", () => {
        setHeaderMenuOpen(header, false);
        const loginBtn = header.querySelector("#site-login-btn");
        if (loginBtn) loginBtn.click();
      });
    }
    const logoutBtn = drawer.querySelector("#site-drawer-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        setHeaderMenuOpen(header, false);
        const headerLogout = header.querySelector("#site-logout-btn");
        if (headerLogout) headerLogout.click();
      });
    }
    return drawer;
  }

  function buildHeader(user, viewCount, usage) {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <button type="button" class="site-header__menu-btn" id="site-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="site-drawer">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
      </button>
      <div class="site-header__brand">
        <a href="${navHref("kundali.html")}" class="site-header__logo">Saptarishi</a>
      </div>
      <nav class="site-header__nav" id="site-header-nav" aria-label="Main">
        <a href="${navHref("kundali.html")}" class="site-header__link">Kundali</a>
        <a href="${navHref("remedy.html")}" class="site-header__link">Remedy</a>
        <a href="${navHref("auspicious.html")}" class="site-header__link">Auspicious</a>
      </nav>
      <div class="site-header__meta">
        <span class="site-header__usage" hidden></span>
        <button type="button" id="site-wallet-btn" class="site-header__wallet" hidden title="Wallet">₹0</button>
        <div class="site-header__account" id="site-account-menu" hidden>
          <button type="button" id="site-account-btn" class="site-header__account-btn" aria-expanded="false" aria-haspopup="menu" aria-controls="site-account-dropdown">
            <span id="site-account-name">Account</span>
          </button>
          <div class="site-header__account-menu" id="site-account-dropdown" role="menu" hidden>
            <a href="${navHref("profile.html")}" class="site-header__account-item" role="menuitem" id="site-account-profile">Profile</a>
            <button type="button" class="site-header__account-item" role="menuitem" id="site-logout-btn">Logout</button>
          </div>
        </div>
        <button type="button" id="site-register-btn" class="site-header__premium">Register</button>
        <button type="button" id="site-login-btn" class="site-header__login">Login</button>
      </div>
    `;
    updateHeaderAuth(header, user, usage);
    wireHeaderAuthButtons(header);
    wireHeaderMenu(header);
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
    const usageEl = header.querySelector(".site-header__usage");
    const walletBtn = header.querySelector("#site-wallet-btn");
    const accountMenu = header.querySelector("#site-account-menu");
    const accountBtn = header.querySelector("#site-account-btn");
    const accountName = header.querySelector("#site-account-name");
    const accountDropdown = header.querySelector("#site-account-dropdown");
    const registerBtn = header.querySelector("#site-register-btn");
    const loginBtn = header.querySelector("#site-login-btn");

    if (walletBtn) {
      if (resolvedUser) {
        const bal =
          AUTH && AUTH.getWalletBalance
            ? AUTH.getWalletBalance(displayUsage || resolvedUser)
            : Number(displayUsage?.wallet_balance_inr) || 0;
        walletBtn.textContent = `₹${bal}`;
        walletBtn.hidden = false;
        walletBtn.title = "Wallet";
      } else {
        walletBtn.hidden = true;
      }
    }

    if (resolvedUser) {
      if (accountMenu) accountMenu.hidden = false;
      if (accountName) {
        accountName.textContent = resolvedUser.name || resolvedUser.mobile || "Account";
      }
      if (accountBtn) {
        accountBtn.title = resolvedUser.name || resolvedUser.mobile || "Account menu";
      }
      if (registerBtn) registerBtn.hidden = true;
      if (loginBtn) loginBtn.hidden = true;
    } else {
      if (accountMenu) accountMenu.hidden = true;
      if (accountDropdown) {
        accountDropdown.hidden = true;
      }
      if (accountBtn) accountBtn.setAttribute("aria-expanded", "false");
      if (registerBtn) registerBtn.hidden = false;
      if (loginBtn) loginBtn.hidden = false;
    }

    if (usageEl) {
      const text = formatUsageBadgeText(displayUsage);
      if (text) {
        usageEl.textContent = text;
        usageEl.hidden = false;
      } else {
        usageEl.hidden = true;
      }
    }
    updateDrawerAuth(resolvedUser, displayUsage);
  }

  function setHeaderMenuOpen(header, open) {
    if (!header) return;
    const menuBtn = header.querySelector("#site-menu-btn");
    const drawer = ensureSiteDrawer(header);
    header.classList.toggle("site-header--menu-open", open);
    document.body.classList.toggle("site-drawer-open", open);
    if (drawer) {
      drawer.classList.toggle("site-drawer--open", open);
      drawer.setAttribute("aria-hidden", open ? "false" : "true");
    }
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (open) {
      setAccountMenuOpen(header, false);
      updateDrawerAuth(resolveHeaderUser(), AUTH ? AUTH.getUsage() : null);
    }
  }

  function wireHeaderMenu(header) {
    const menuBtn = header.querySelector("#site-menu-btn");
    if (!menuBtn || header.dataset.menuWired === "1") return;
    header.dataset.menuWired = "1";
    const drawer = ensureSiteDrawer(header);
    updateDrawerAuth(resolveHeaderUser(), AUTH ? AUTH.getUsage() : null);

    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setHeaderMenuOpen(header, !header.classList.contains("site-header--menu-open"));
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setHeaderMenuOpen(header, false);
    });
    document.addEventListener("click", (event) => {
      if (header.contains(event.target)) return;
      if (drawer && drawer.contains(event.target)) return;
      setHeaderMenuOpen(header, false);
    });
  }

  function setAccountMenuOpen(header, open) {
    const accountBtn = header.querySelector("#site-account-btn");
    const accountDropdown = header.querySelector("#site-account-dropdown");
    if (!accountBtn || !accountDropdown) return;
    accountDropdown.hidden = !open;
    accountBtn.setAttribute("aria-expanded", open ? "true" : "false");
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

  function wireConnectAstrologer(root) {
    const connectBtn = root.querySelector("#site-connect-astrologer-btn");
    const connectPanel = root.querySelector("#site-connect-panel");
    const rateLabel = root.querySelector("#site-astrologer-rate-label");
    const callBtn = root.querySelector("#site-call-btn");
    const askBtn = root.querySelector("#site-ask-btn");
    if (!connectBtn || !connectPanel) return;

    let astrologerConfig = {
      name: AC.ASTROLOGER_NAME,
      call_rate_inr_per_min: AC.ASTROLOGER_CALL_RATE_INR_PER_MIN,
      ask_rate_inr_per_min: AC.ASTROLOGER_ASK_RATE_INR_PER_MIN,
      phone: contactPhone(),
      whatsapp: `91${contactPhone()}`,
      min_balance_inr: AC.ASTROLOGER_MIN_BALANCE_INR
    };

    const showConnectStatus = (message, isError) => {
      const statusEl = document.getElementById("status");
      if (statusEl) {
        setStatusMessage(statusEl, message, isError);
        return;
      }
      if (message && isError) {
        window.alert(message);
      }
    };

    const updateRateLabel = () => {
      if (!rateLabel) return;
      const rate =
        astrologerConfig.call_rate_inr_per_min || AC.ASTROLOGER_CALL_RATE_INR_PER_MIN;
      const name = astrologerConfig.name || AC.ASTROLOGER_NAME;
      rateLabel.textContent = `${name} · Call / Ask · ₹${rate}/min`;
    };

    const setOpen = (open) => {
      const isOpen = Boolean(open);
      connectPanel.hidden = !isOpen;
      connectBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    };

    const loadAstrologerConfig = async () => {
      try {
        if (AUTH && AUTH.fetchWalletInfo) {
          const info = await AUTH.fetchWalletInfo();
          if (info && info.astrologer && typeof info.astrologer === "object") {
            astrologerConfig = { ...astrologerConfig, ...info.astrologer };
          }
        }
      } catch {
        /* keep defaults */
      }
      updateRateLabel();
    };

    const ensureLoggedIn = async () => {
      if (!AUTH) return false;
      if (AUTH.getToken()) return true;
      if (AUTH.ensureAuth) {
        return AUTH.ensureAuth({
          tab: "login",
          required: true,
          message: "Sign in to use Call and Ask."
        });
      }
      return false;
    };

    const handleCallOrAsk = async (service) => {
      const ok = await ensureLoggedIn();
      if (!ok) return;

      const rate =
        service === "ask"
          ? Number(astrologerConfig.ask_rate_inr_per_min) || AC.ASTROLOGER_ASK_RATE_INR_PER_MIN
          : Number(astrologerConfig.call_rate_inr_per_min) || AC.ASTROLOGER_CALL_RATE_INR_PER_MIN;
      const balance = AUTH.getWalletBalance ? AUTH.getWalletBalance() : 0;
      const minBalance = Number(astrologerConfig.min_balance_inr) || rate;
      if (balance < Math.max(rate, minBalance)) {
        showConnectStatus(
          `Need at least ₹${Math.max(rate, minBalance)} in wallet (you have ₹${balance}).`,
          true
        );
        if (AUTH.openWalletFlow) {
          await AUTH.openWalletFlow({
            message: `Add money to your wallet. ${service === "ask" ? "Ask" : "Call"} is ₹${rate}/min.`
          });
        }
        return;
      }

      try {
        showConnectStatus(`Starting ${service}…`, false);
        let askWin = null;
        if (service === "ask") {
          askWin = window.open("about:blank", "_blank");
        }
        try {
          const payload = await AUTH.chargeWalletForService(service, 1);
          const astro =
            payload && payload.astrologer && typeof payload.astrologer === "object"
              ? { ...astrologerConfig, ...payload.astrologer }
              : astrologerConfig;
          const phone = String(astro.phone || contactPhone()).replace(/\D/g, "");
          const localPhone = phone.slice(-10);
          const wa = String(astro.whatsapp || `91${localPhone}`).replace(/\D/g, "");
          if (service === "call") {
            window.location.href = `tel:+91${localPhone}`;
          } else {
            const text = encodeURIComponent(
              `Hi ${astro.name || "Astrologer"}, I have a question from Saptarishi.`
            );
            const waUrl = `https://wa.me/${wa}?text=${text}`;
            if (askWin && !askWin.closed) {
              askWin.location.href = waUrl;
            } else {
              window.location.href = waUrl;
            }
          }
          const left = AUTH.getWalletBalance(payload.user || payload.usage);
          showConnectStatus(
            payload.message || `Charged ₹${rate}. Wallet balance: ₹${left}.`,
            false
          );
        } catch (err) {
          if (askWin && !askWin.closed) askWin.close();
          throw err;
        }
      } catch (err) {
        showConnectStatus(err.message || `Could not start ${service}.`, true);
        if (
          String(err.message || "").toLowerCase().includes("insufficient") &&
          AUTH.openWalletFlow
        ) {
          await AUTH.openWalletFlow();
        }
      }
    };

    connectBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextOpen = connectPanel.hidden;
      setOpen(nextOpen);
      if (nextOpen) updateRateLabel();
    });
    if (callBtn) callBtn.addEventListener("click", () => handleCallOrAsk("call"));
    if (askBtn) askBtn.addEventListener("click", () => handleCallOrAsk("ask"));

    document.addEventListener("click", (event) => {
      if (connectPanel.hidden) return;
      const wrap = root.querySelector(".site-footer__connect");
      if (wrap && !wrap.contains(event.target)) setOpen(false);
    });

    global.addEventListener("saptarishi-auth-changed", () => {
      updateRateLabel();
    });

    updateRateLabel();
    loadAstrologerConfig();
  }

  function wireHeaderAuthButtons(header) {
    if (!AUTH) return;
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");
    const registerBtn = header.querySelector("#site-register-btn");
    const walletBtn = header.querySelector("#site-wallet-btn");
    const accountMenu = header.querySelector("#site-account-menu");
    const accountBtn = header.querySelector("#site-account-btn");

    if (walletBtn) {
      walletBtn.addEventListener("click", () => {
        if (AUTH.openWalletFlow) {
          AUTH.openWalletFlow({ required: true });
          return;
        }
        const modal = global.SaptarishiWalletModal;
        if (modal && modal.open) modal.open();
      });
    }

    if (registerBtn) {
      registerBtn.addEventListener("click", () => {
        if (MODAL) MODAL.open({ tab: "register", required: false });
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        if (MODAL) MODAL.open({ tab: "login", required: false });
      });
    }

    if (accountBtn && accountMenu) {
      accountBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        const open = accountBtn.getAttribute("aria-expanded") !== "true";
        if (open) setHeaderMenuOpen(header, false);
        setAccountMenuOpen(header, open);
      });
      document.addEventListener("click", (event) => {
        if (!accountMenu.contains(event.target)) {
          setAccountMenuOpen(header, false);
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") setAccountMenuOpen(header, false);
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        if (logoutBtn.disabled) return;
        setAccountMenuOpen(header, false);
        setLogoutLoading(logoutBtn, true);
        try {
          await AUTH.logout();
        } finally {
          window.location.replace(navHref("kundali.html"));
        }
      });
    }
  }

  function buildFooter() {
    const phoneIntl = indiaPhoneDigits(contactPhone());
    const phoneDisplay = formatIndiaPhoneDisplay(contactPhone());
    const email = contactEmail();
    const waMessage = encodeURIComponent(
      String(AC.SUPPORT_WHATSAPP_MESSAGE)
    );
    const mailSubject = encodeURIComponent(
      String(AC.SUPPORT_EMAIL_SUBJECT)
    );
    const mailBody = encodeURIComponent(
      String(AC.SUPPORT_EMAIL_BODY)
    );
    const mailHref = `mailto:${encodeURIComponent(email)}?subject=${mailSubject}&body=${mailBody}`;
    const waHref = `https://wa.me/${phoneIntl}?text=${waMessage}`;

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `
      <p class="site-footer__copy">© ${new Date().getFullYear()} ${AC.OPERATOR_NAME} · ${AC.SITE_NAME}</p>
      <div class="site-footer__meta">
        <p class="site-footer__views site-footer__views--pending" title="Total site views">Site views: …</p>
        <span class="site-footer__meta-sep" aria-hidden="true">·</span>
        <button type="button" class="site-footer__contact-toggle" id="site-contact-toggle" aria-expanded="false" aria-controls="site-contact">Contact us</button>
        <span class="site-footer__meta-sep" aria-hidden="true">·</span>
        <span class="site-footer__connect">
          <button
            type="button"
            id="site-connect-astrologer-btn"
            class="site-footer__connect-toggle"
            aria-expanded="false"
            aria-controls="site-connect-panel"
          >
            Connect Astrologer
          </button>
          <div id="site-connect-panel" class="site-footer__connect-panel" hidden>
            <p class="site-footer__connect-rate" id="site-astrologer-rate-label">Call / Ask · ₹${AC.ASTROLOGER_CALL_RATE_INR_PER_MIN}/min</p>
            <div class="site-footer__connect-actions">
              <button type="button" id="site-call-btn" class="site-footer__connect-action site-footer__connect-action--call">Call</button>
              <button type="button" id="site-ask-btn" class="site-footer__connect-action site-footer__connect-action--ask">Ask</button>
            </div>
          </div>
        </span>
        <span class="site-footer__meta-sep" aria-hidden="true">·</span>
        <a class="site-footer__privacy-link" href="${navHref("privacy.html")}">Privacy Policy</a>
      </div>
      <p class="site-footer__credits"></p>
      <div id="site-contact" class="site-footer__support" hidden>
        <a class="site-footer__support-link" href="${mailHref}">Email: ${email}</a>
        <span class="site-footer__support-sep" aria-hidden="true">·</span>
        <a class="site-footer__support-link" href="${waHref}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <span class="site-footer__support-sep" aria-hidden="true">·</span>
        <a class="site-footer__support-link" href="tel:+${phoneIntl}">Call ${phoneDisplay}</a>
      </div>
    `;
    appendRequiredDataCredits(footer.querySelector(".site-footer__credits"), {
      includeEphemeris: true,
      leadingSpace: false
    });
    wireConnectAstrologer(footer);
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

  function removeLegacyConnectBars(root) {
    const scope = root || document;
    scope.querySelectorAll(".site-connect-bar, .kundali-connect-astrologer").forEach((el) => {
      el.remove();
    });
  }

  function mountLayout(user, viewCount, usage) {
    const body = document.body;
    if (!body || body.querySelector(".site-header")) return;

    const shell = document.getElementById("saptarishi");
    removeLegacyConnectBars(body);
    const header = buildHeader(user, viewCount, usage);
    const footer = buildFooter();

    body.insertBefore(header, body.firstChild);
    if (shell) {
      shell.classList.add("main-shell--with-chrome");
      removeLegacyConnectBars(shell);
      shell.after(footer);
    } else {
      body.appendChild(footer);
    }
    wireFooterContact(footer);

    const path = normalizePath(window.location.pathname);
    body.querySelectorAll(".site-header__nav .site-header__link, .site-drawer__link[data-page]").forEach((link) => {
      const href = normalizePath(link.getAttribute("href"));
      if (href && path === href) {
        link.classList.add("site-header__link--active");
        link.classList.add("site-drawer__link--active");
      }
    });

    const profileLink = body.querySelector("#site-profile-link");
    if (profileLink && (path === "/profile" || /profile\.html$/i.test(window.location.pathname))) {
      profileLink.classList.add("site-header__link--active");
    }
  }

  function extractAuthTabFromQuery() {
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

  function keepAppLinksInWebView() {
    if (document.documentElement.dataset.saptarishiLinkGuard === "1") return;
    document.documentElement.dataset.saptarishiLinkGuard = "1";

    document.addEventListener(
      "click",
      (event) => {
        const anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
        if (!anchor || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const href = anchor.getAttribute("href") || "";
        if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

        let url;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }

        const scheme = (url.protocol || "").replace(":", "").toLowerCase();
        if (scheme === "tel" || scheme === "mailto" || scheme === "sms") return;

        const host = (url.hostname || "").toLowerCase();
        const isWhatsApp =
          host === "wa.me" ||
          host.endsWith(".wa.me") ||
          host === "whatsapp.com" ||
          host.endsWith(".whatsapp.com") ||
          host === "api.whatsapp.com";
        if (isWhatsApp) return;

        const operatorHost = String(AC.OPERATOR_NAME || "").replace(/^www\./i, "").toLowerCase();
        const siteHost = hostFromOrigin(AC.SITE_ORIGIN).toLowerCase();
        const apiHost = hostFromOrigin(AC.PRODUCTION_API_ORIGIN).toLowerCase();
        const isOurs =
          (operatorHost && (host === operatorHost || host.endsWith(`.${operatorHost}`))) ||
          (siteHost && host === siteHost) ||
          (apiHost && host === apiHost) ||
          host === window.location.hostname;

        if (isNativeAppShell() && url.origin !== window.location.origin) {
          return;
        }

        if (isOurs && anchor.target === "_blank") {
          event.preventDefault();
          window.location.assign(url.toString());
        }
      },
      true
    );
  }

  const BIRTH_MONTHS_SHORT = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const BIRTH_MONTHS_LONG = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  const BIRTH_PLACE_GEO = {
    "New Delhi, India": { lat: 28.6139, lon: 77.209, tz: "+5.5" },
    "Mumbai, India": { lat: 19.076, lon: 72.8777, tz: "+5.5" },
    "Kolkata, India": { lat: 22.5726, lon: 88.3639, tz: "+5.5" },
    "Bengaluru, India": { lat: 12.9716, lon: 77.5946, tz: "+5.5" },
    "Patna, India": { lat: 25.5941, lon: 85.1376, tz: "+5.5" },
    "Motihari, India": { lat: 26.643, lon: 84.904, tz: "+5.5" }
  };

  function padBirthNum(value) {
    return String(value).padStart(2, "0");
  }

  function todayBirthDateValue() {
    const d = new Date();
    return `${d.getFullYear()}-${padBirthNum(d.getMonth() + 1)}-${padBirthNum(d.getDate())}`;
  }

  function nowBirthTimeValue() {
    const d = new Date();
    return `${padBirthNum(d.getHours())}:${padBirthNum(d.getMinutes())}:${padBirthNum(d.getSeconds())}`;
  }

  function formatBirthDateLabel(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "Select date";
    return `${match[3]} - ${BIRTH_MONTHS_SHORT[Number(match[2]) - 1] || match[2]} - ${match[1]}`;
  }

  function formatBirthDateTitle(iso) {
    const match = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return "";
    const month = BIRTH_MONTHS_LONG[Number(match[2]) - 1] || match[2];
    return `${month} ${Number(match[3])}, ${match[1]}`;
  }

  function parseBirthTimeParts(value) {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return { hours24: 0, minutes: 0, seconds: 0 };
    return {
      hours24: Math.min(23, Number(match[1]) || 0),
      minutes: Math.min(59, Number(match[2]) || 0),
      seconds: Math.min(59, Number(match[3]) || 0)
    };
  }

  function formatBirthTimeLabel(value, withSeconds) {
    const parts = parseBirthTimeParts(value);
    const ampm = parts.hours24 >= 12 ? "PM" : "AM";
    let hour = parts.hours24 % 12;
    if (hour === 0) hour = 12;
    const core = `${padBirthNum(hour)}:${padBirthNum(parts.minutes)}`;
    if (!withSeconds) return `${core} ${ampm}`;
    return `${core}:${padBirthNum(parts.seconds)} ${ampm}`;
  }

  function toBirthTimeInputValue(hour12, minutes, seconds, ampm) {
    let hour = Number(hour12);
    const isPm = String(ampm).toUpperCase() === "PM";
    if (hour === 12) hour = isPm ? 12 : 0;
    else if (isPm) hour += 12;
    return `${padBirthNum(hour)}:${padBirthNum(minutes)}:${padBirthNum(seconds)}`;
  }

  function formatBirthCoordPart(value, pos, neg) {
    const abs = Math.abs(Number(value) || 0);
    let deg = Math.floor(abs);
    let min = Math.round((abs - deg) * 60);
    if (min === 60) {
      deg += 1;
      min = 0;
    }
    return `${deg}${value >= 0 ? pos : neg}${padBirthNum(min)}`;
  }

  function formatBirthPlaceMeta(place) {
    const geo = BIRTH_PLACE_GEO[place];
    if (!geo) return "";
    return `( ${formatBirthCoordPart(geo.lat, "N", "S")}, ${formatBirthCoordPart(geo.lon, "E", "W")} ${geo.tz} )`;
  }

  function splitBirthPlaceLabel(place) {
    const value = String(place || "").trim();
    if (!value) return { title: "Select place…", meta: "" };
    const idx = value.lastIndexOf(",");
    if (idx > 0) {
      return {
        title: value.slice(0, idx).trim(),
        meta: value.slice(idx + 1).trim()
      };
    }
    return { title: value, meta: "" };
  }

  function birthChooserForms() {
    return ["birth-form", "remedy-form"]
      .map((id) => document.getElementById(id))
      .filter((form) => form && form.classList.contains("kundali-form--chooser"));
  }

  function refreshBirthChooserDisplays(root) {
    const forms = root ? [root] : birthChooserForms();
    forms.forEach((form) => {
      const dateInput = form.querySelector("#birth-date");
      const timeInput = form.querySelector("#birth-time");
      const placeSelect = form.querySelector("#place-preset");
      const placeCustom = form.querySelector("#place-custom");
      const dateBox = form.querySelector("[data-birth-open='date']");
      const timeBox = form.querySelector("[data-birth-open='time']");
      const placeTitle = form.querySelector("[data-birth-place-title]");
      const placeMeta = form.querySelector("[data-birth-place-meta]");
      if (dateBox) dateBox.textContent = formatBirthDateLabel(dateInput && dateInput.value);
      if (timeBox) timeBox.textContent = formatBirthTimeLabel(timeInput && timeInput.value, false);
      if (!placeTitle) return;
      const customVal = AC.PLACE_CUSTOM_VALUE || "__custom__";
      const selected = placeSelect ? String(placeSelect.value || "").trim() : "";
      const custom = placeCustom ? String(placeCustom.value || "").trim() : "";
      const place = selected === customVal ? custom : selected;
      if (!place) {
        placeTitle.textContent = "Select place…";
        if (placeMeta) placeMeta.textContent = "";
        return;
      }
      const coords = formatBirthPlaceMeta(place);
      if (coords) {
        placeTitle.textContent = splitBirthPlaceLabel(place).title;
        if (placeMeta) placeMeta.textContent = coords;
        return;
      }
      const parts = splitBirthPlaceLabel(place);
      placeTitle.textContent = parts.title;
      if (placeMeta) placeMeta.textContent = parts.meta;
    });
  }

  function iconSvg(paths) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  }

  function ensureBirthPickerOverlay() {
    let overlay = document.getElementById("birth-picker-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "birth-picker-overlay";
    overlay.className = "birth-picker";
    overlay.hidden = true;
    overlay.innerHTML = `
      <button type="button" class="birth-picker__backdrop" aria-label="Close"></button>
      <div class="birth-picker__dialog" role="dialog" aria-modal="true">
        <div class="birth-picker__head">
          <span class="birth-picker__icon"></span>
          <strong class="birth-picker__title"></strong>
        </div>
        <div class="birth-picker__wheels"></div>
        <div class="birth-picker__actions">
          <button type="button" class="birth-picker__cancel">Cancel</button>
          <button type="button" class="birth-picker__set">Set</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".birth-picker__backdrop").addEventListener("click", closeBirthPicker);
    overlay.querySelector(".birth-picker__cancel").addEventListener("click", closeBirthPicker);
    overlay.querySelector(".birth-picker__set").addEventListener("click", commitBirthPicker);
    return overlay;
  }

  function ensureBirthPlaceOverlay() {
    let overlay = document.getElementById("birth-place-overlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "birth-place-overlay";
    overlay.className = "birth-place-picker";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="birth-place-picker__head">
        <button type="button" class="birth-place-picker__back" aria-label="Back">‹</button>
        <h2>Search Place</h2>
      </div>
      <div class="birth-place-picker__tabs" role="tablist">
        <button type="button" data-place-tab="search" class="is-on">City search</button>
        <button type="button" data-place-tab="custom">Custom city</button>
      </div>
      <div data-place-pane="search">
        <label class="birth-place-picker__search">
          ${iconSvg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>')}
          <input type="search" id="birth-place-search" placeholder="Search Place (Min. 3 char.)" autocomplete="off" />
        </label>
        <div class="birth-place-picker__list" id="birth-place-list"></div>
      </div>
      <div data-place-pane="custom" hidden>
        <div class="birth-place-picker__custom">
          <input type="text" id="birth-place-custom-input" maxlength="240" placeholder="City, Country" />
          <button type="button" id="birth-place-custom-set">Set</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector(".birth-place-picker__back").addEventListener("click", closeBirthPlacePicker);
    overlay.querySelectorAll("[data-place-tab]").forEach((tab) => {
      tab.addEventListener("click", () => setBirthPlaceTab(tab.getAttribute("data-place-tab")));
    });
    overlay.querySelector("#birth-place-search").addEventListener("input", renderBirthPlaceList);
    overlay.querySelector("#birth-place-custom-set").addEventListener("click", commitBirthPlaceCustom);
    return overlay;
  }

  let birthPickerState = null;
  let birthPlaceForm = null;

  function setBirthOverlayOpen(open) {
    document.body.classList.toggle("birth-overlay-open", open);
  }

  function closeBirthPicker() {
    const overlay = document.getElementById("birth-picker-overlay");
    if (overlay) overlay.hidden = true;
    birthPickerState = null;
    if (document.getElementById("birth-place-overlay")?.hidden !== false) setBirthOverlayOpen(false);
  }

  function closeBirthPlacePicker() {
    const overlay = document.getElementById("birth-place-overlay");
    if (overlay) overlay.hidden = true;
    birthPlaceForm = null;
    if (document.getElementById("birth-picker-overlay")?.hidden !== false) setBirthOverlayOpen(false);
  }

  function wheelSelectedValue(scroller) {
    const items = [...scroller.querySelectorAll(".birth-wheel__item")];
    if (!items.length) return "";
    const mid = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
    let best = items[0];
    let bestDist = Infinity;
    items.forEach((item) => {
      const rect = item.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - mid);
      if (dist < bestDist) {
        bestDist = dist;
        best = item;
      }
    });
    items.forEach((item) => item.classList.toggle("is-on", item === best));
    return best.getAttribute("data-value") || "";
  }

  function scrollWheelToValue(scroller, value) {
    const item = [...scroller.querySelectorAll(".birth-wheel__item")].find(
      (el) => el.getAttribute("data-value") === String(value)
    );
    if (!item) return;
    const top = item.offsetTop - scroller.clientHeight / 2 + item.offsetHeight / 2;
    scroller.scrollTop = Math.max(0, top);
    wheelSelectedValue(scroller);
  }

  function makeWheelColumn(label, values, selected) {
    const col = document.createElement("div");
    col.className = "birth-wheel__col";
    const caption = document.createElement("div");
    caption.className = "birth-wheel__label";
    caption.textContent = label || "\u00a0";
    const scroller = document.createElement("div");
    scroller.className = "birth-wheel__scroller";
    const padTop = document.createElement("div");
    padTop.className = "birth-wheel__pad";
    const padBottom = document.createElement("div");
    padBottom.className = "birth-wheel__pad";
    scroller.appendChild(padTop);
    values.forEach((item) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "birth-wheel__item";
      el.setAttribute("data-value", item.value);
      el.textContent = item.label;
      el.addEventListener("click", () => scrollWheelToValue(scroller, item.value));
      scroller.appendChild(el);
    });
    scroller.appendChild(padBottom);
    let snapTimer = 0;
    scroller.addEventListener("scroll", () => {
      window.clearTimeout(snapTimer);
      snapTimer = window.setTimeout(() => wheelSelectedValue(scroller), 80);
    });
    col.append(caption, scroller);
    requestAnimationFrame(() => scrollWheelToValue(scroller, selected));
    return { col, scroller };
  }

  function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  function rebuildBirthDayWheel(host, year, month, day) {
    const max = daysInMonth(year, month);
    const selected = Math.min(Number(day) || 1, max);
    const values = [];
    for (let i = 1; i <= max; i += 1) values.push({ value: String(i), label: padBirthNum(i) });
    const next = makeWheelColumn("Day", values, String(selected));
    const old = host.querySelector("[data-wheel='day']");
    next.col.setAttribute("data-wheel", "day");
    if (old) old.replaceWith(next.col);
    else host.prepend(next.col);
    return next.scroller;
  }

  function openBirthDatePicker(form) {
    const dateInput = form.querySelector("#birth-date");
    if (!dateInput) return;
    if (!dateInput.value) dateInput.value = todayBirthDateValue();
    const match = String(dateInput.value).match(/^(\d{4})-(\d{2})-(\d{2})/) || [];
    const year = Number(match[1]) || new Date().getFullYear();
    const month = Number(match[2]) || new Date().getMonth() + 1;
    const day = Number(match[3]) || new Date().getDate();
    const overlay = ensureBirthPickerOverlay();
    overlay.querySelector(".birth-picker__icon").innerHTML = iconSvg(
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
    );
    overlay.querySelector(".birth-picker__title").textContent = formatBirthDateTitle(dateInput.value);
    const wheels = overlay.querySelector(".birth-picker__wheels");
    wheels.className = "birth-picker__wheels birth-wheel birth-wheel--date";
    wheels.replaceChildren();
    const thisYear = new Date().getFullYear();
    const years = [];
    for (let y = thisYear + 1; y >= 1900; y -= 1) years.push({ value: String(y), label: String(y) });
    const months = BIRTH_MONTHS_SHORT.map((label, idx) => ({ value: String(idx + 1), label }));
    const dayScroller = { current: null };
    const monthCol = makeWheelColumn("Month", months, String(month));
    const yearCol = makeWheelColumn("Year", years, String(year));
    monthCol.col.setAttribute("data-wheel", "month");
    yearCol.col.setAttribute("data-wheel", "year");
    wheels.append(monthCol.col, yearCol.col);
    dayScroller.current = rebuildBirthDayWheel(wheels, year, month, day);
    const refreshTitle = () => {
      const y = Number(wheelSelectedValue(yearCol.scroller));
      const m = Number(wheelSelectedValue(monthCol.scroller));
      const dayCount = wheels.querySelectorAll("[data-wheel='day'] .birth-wheel__item").length;
      if (dayCount !== daysInMonth(y, m)) {
        dayScroller.current = rebuildBirthDayWheel(
          wheels,
          y,
          m,
          Number(wheelSelectedValue(dayScroller.current))
        );
      }
      const d = Number(wheelSelectedValue(dayScroller.current));
      overlay.querySelector(".birth-picker__title").textContent = formatBirthDateTitle(
        `${y}-${padBirthNum(m)}-${padBirthNum(d)}`
      );
    };
    monthCol.scroller.addEventListener("scroll", () => {
      window.clearTimeout(monthCol.scroller._birthTimer);
      monthCol.scroller._birthTimer = window.setTimeout(refreshTitle, 120);
    });
    yearCol.scroller.addEventListener("scroll", () => {
      window.clearTimeout(yearCol.scroller._birthTimer);
      yearCol.scroller._birthTimer = window.setTimeout(refreshTitle, 120);
    });
    birthPickerState = {
      kind: "date",
      form,
      read() {
        const y = Number(wheelSelectedValue(yearCol.scroller));
        const m = Number(wheelSelectedValue(monthCol.scroller));
        const d = Number(wheelSelectedValue(wheels.querySelector("[data-wheel='day'] .birth-wheel__scroller")));
        return `${y}-${padBirthNum(m)}-${padBirthNum(Math.min(d, daysInMonth(y, m)))}`;
      }
    };
    overlay.hidden = false;
    setBirthOverlayOpen(true);
  }

  function openBirthTimePicker(form) {
    const timeInput = form.querySelector("#birth-time");
    if (!timeInput) return;
    if (!timeInput.value) timeInput.value = nowBirthTimeValue();
    const parts = parseBirthTimeParts(timeInput.value);
    const converted = parts.hours24 % 12 === 0 ? 12 : parts.hours24 % 12;
    const ampm = parts.hours24 >= 12 ? "PM" : "AM";
    const overlay = ensureBirthPickerOverlay();
    overlay.querySelector(".birth-picker__icon").innerHTML = iconSvg(
      '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>'
    );
    overlay.querySelector(".birth-picker__title").textContent = formatBirthTimeLabel(timeInput.value, true);
    const wheels = overlay.querySelector(".birth-picker__wheels");
    wheels.className = "birth-picker__wheels birth-wheel birth-wheel--time";
    wheels.replaceChildren();
    const hours = [];
    const minutes = [];
    const seconds = [];
    for (let i = 1; i <= 12; i += 1) hours.push({ value: String(i), label: padBirthNum(i) });
    for (let i = 0; i <= 59; i += 1) {
      minutes.push({ value: String(i), label: padBirthNum(i) });
      seconds.push({ value: String(i), label: padBirthNum(i) });
    }
    const hourCol = makeWheelColumn("Hours", hours, String(converted));
    const minCol = makeWheelColumn("Minutes", minutes, String(parts.minutes));
    const secCol = makeWheelColumn("Seconds", seconds, String(parts.seconds));
    const amCol = makeWheelColumn("\u00a0", [
      { value: "AM", label: "AM" },
      { value: "PM", label: "PM" }
    ], ampm);
    wheels.append(hourCol.col, minCol.col, secCol.col, amCol.col);
    const refreshTitle = () => {
      overlay.querySelector(".birth-picker__title").textContent = formatBirthTimeLabel(
        toBirthTimeInputValue(
          wheelSelectedValue(hourCol.scroller),
          wheelSelectedValue(minCol.scroller),
          wheelSelectedValue(secCol.scroller),
          wheelSelectedValue(amCol.scroller)
        ),
        true
      );
    };
    [hourCol, minCol, secCol, amCol].forEach((col) => {
      col.scroller.addEventListener("scroll", () => {
        window.clearTimeout(col.scroller._birthTimer);
        col.scroller._birthTimer = window.setTimeout(refreshTitle, 80);
      });
    });
    birthPickerState = {
      kind: "time",
      form,
      read() {
        return toBirthTimeInputValue(
          wheelSelectedValue(hourCol.scroller),
          wheelSelectedValue(minCol.scroller),
          wheelSelectedValue(secCol.scroller),
          wheelSelectedValue(amCol.scroller)
        );
      }
    };
    overlay.hidden = false;
    setBirthOverlayOpen(true);
    requestAnimationFrame(() => {
      scrollWheelToValue(hourCol.scroller, String(converted));
      scrollWheelToValue(minCol.scroller, String(parts.minutes));
      scrollWheelToValue(secCol.scroller, String(parts.seconds));
      scrollWheelToValue(amCol.scroller, ampm);
    });
  }

  function commitBirthPicker() {
    if (!birthPickerState) {
      closeBirthPicker();
      return;
    }
    const { kind, form, read } = birthPickerState;
    const value = read();
    if (kind === "date") {
      const input = form.querySelector("#birth-date");
      if (input) input.value = value;
    } else {
      const input = form.querySelector("#birth-time");
      if (input) input.value = value;
    }
    refreshBirthChooserDisplays(form);
    closeBirthPicker();
  }

  function setBirthPlaceTab(tab) {
    const overlay = document.getElementById("birth-place-overlay");
    if (!overlay) return;
    overlay.querySelectorAll("[data-place-tab]").forEach((btn) => {
      btn.classList.toggle("is-on", btn.getAttribute("data-place-tab") === tab);
    });
    overlay.querySelectorAll("[data-place-pane]").forEach((pane) => {
      pane.hidden = pane.getAttribute("data-place-pane") !== tab;
    });
  }

  function renderBirthPlaceList() {
    const overlay = document.getElementById("birth-place-overlay");
    const list = overlay && overlay.querySelector("#birth-place-list");
    if (!list) return;
    const query = String(overlay.querySelector("#birth-place-search")?.value || "")
      .trim()
      .toLowerCase();
    const places = Array.isArray(AC.BIRTH_PLACE_PRESETS) ? AC.BIRTH_PLACE_PRESETS : [];
    const filtered =
      query.length < 3 ? places : places.filter((place) => String(place).toLowerCase().includes(query));
    list.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "birth-place-picker__empty";
      empty.textContent = query.length < 3 ? "Type at least 3 characters to search." : "No matching place.";
      list.appendChild(empty);
    } else {
      filtered.forEach((place) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "birth-place-picker__item";
        const parts = splitBirthPlaceLabel(place);
        const title = document.createElement("strong");
        title.textContent = parts.title;
        const meta = document.createElement("span");
        meta.textContent = parts.meta;
        btn.append(title, meta);
        btn.addEventListener("click", () => commitBirthPlacePreset(place));
        list.appendChild(btn);
      });
    }
    const other = document.createElement("button");
    other.type = "button";
    other.className = "birth-place-picker__item";
    other.innerHTML = "<strong>Other…</strong><span>Enter a custom city</span>";
    other.addEventListener("click", () => setBirthPlaceTab("custom"));
    list.appendChild(other);
  }

  function commitBirthPlacePreset(place) {
    if (!birthPlaceForm) return;
    const select = birthPlaceForm.querySelector("#place-preset");
    const custom = birthPlaceForm.querySelector("#place-custom");
    const wrap = birthPlaceForm.querySelector("#custom-place-wrap");
    if (select) select.value = place;
    if (custom) custom.value = "";
    if (wrap) wrap.hidden = true;
    refreshBirthChooserDisplays(birthPlaceForm);
    closeBirthPlacePicker();
  }

  function commitBirthPlaceCustom() {
    const overlay = document.getElementById("birth-place-overlay");
    const value = String(overlay?.querySelector("#birth-place-custom-input")?.value || "").trim();
    if (!value || !birthPlaceForm) return;
    const select = birthPlaceForm.querySelector("#place-preset");
    const custom = birthPlaceForm.querySelector("#place-custom");
    const wrap = birthPlaceForm.querySelector("#custom-place-wrap");
    if (select) select.value = AC.PLACE_CUSTOM_VALUE || "__custom__";
    if (custom) custom.value = value;
    if (wrap) wrap.hidden = true;
    refreshBirthChooserDisplays(birthPlaceForm);
    closeBirthPlacePicker();
  }

  function openBirthPlacePicker(form) {
    birthPlaceForm = form;
    const overlay = ensureBirthPlaceOverlay();
    const select = form.querySelector("#place-preset");
    const custom = form.querySelector("#place-custom");
    const customVal = AC.PLACE_CUSTOM_VALUE || "__custom__";
    overlay.querySelector("#birth-place-search").value = "";
    overlay.querySelector("#birth-place-custom-input").value =
      select && select.value === customVal ? String(custom?.value || "") : "";
    setBirthPlaceTab(select && select.value === customVal ? "custom" : "search");
    renderBirthPlaceList();
    overlay.hidden = false;
    setBirthOverlayOpen(true);
    overlay.querySelector("#birth-place-search")?.focus();
  }

  function enhanceBirthChooser(form) {
    if (!form || form.dataset.birthChooser === "1" || isNativeAppShell()) return;
    const dateInput = form.querySelector("#birth-date");
    const timeInput = form.querySelector("#birth-time");
    const placeSelect = form.querySelector("#place-preset");
    if (!dateInput || !timeInput || !placeSelect) return;
    form.dataset.birthChooser = "1";
    form.classList.add("kundali-form--chooser");
    if (!dateInput.value) dateInput.value = todayBirthDateValue();
    if (!timeInput.value) timeInput.value = nowBirthTimeValue();

    const dateField = dateInput.closest(".form-field");
    const timeField = timeInput.closest(".form-field");
    const placeField = placeSelect.closest(".form-field");
    const nameWrap = form.querySelector("#birth-name-wrap");
    const nameInput = form.querySelector("#birth-name");
    if (!dateField || !placeField) return;

    dateField.classList.add("birth-datetime-field", "birth-icon-row");
    placeField.classList.add("birth-place-field", "birth-icon-row");
    if (nameWrap) {
      nameWrap.classList.add("birth-icon-row");
      const nameLabel = nameWrap.querySelector("label");
      if (nameLabel) nameLabel.hidden = true;
      if (nameInput) {
        nameInput.placeholder = "Enter Name";
        nameInput.setAttribute("aria-label", "Name");
      }
      if (!nameWrap.querySelector("svg")) {
        nameWrap.insertAdjacentHTML(
          "afterbegin",
          iconSvg('<circle cx="12" cy="8" r="3"/><path d="M6.2 19c.9-3.4 2.8-5.1 5.8-5.1s4.9 1.7 5.8 5.1"/>')
        );
      }
    }
    dateField.insertAdjacentHTML(
      "afterbegin",
      iconSvg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>')
    );
    placeField.insertAdjacentHTML(
      "afterbegin",
      iconSvg('<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/>')
    );
    dateInput.classList.add("birth-ui-hidden");
    timeInput.classList.add("birth-ui-hidden");
    placeSelect.classList.add("birth-ui-hidden");
    if (timeField && timeField !== dateField) {
      dateField.appendChild(timeInput);
      timeField.hidden = true;
    }
    const dateLabel = dateField.querySelector("label");
    const placeLabel = placeField.querySelector("label");
    if (dateLabel) dateLabel.hidden = true;
    if (placeLabel) placeLabel.hidden = true;

    const row = document.createElement("div");
    row.className = "birth-datetime-row";
    row.innerHTML =
      '<button type="button" class="birth-box" data-birth-open="date" aria-label="Birth date"></button>' +
      '<button type="button" class="birth-box" data-birth-open="time" aria-label="Birth time"></button>';
    dateField.insertBefore(row, dateInput);

    const placeBtn = document.createElement("button");
    placeBtn.type = "button";
    placeBtn.className = "birth-box birth-place-box";
    placeBtn.setAttribute("aria-label", "Birth place");
    placeBtn.innerHTML =
      '<strong data-birth-place-title></strong><span data-birth-place-meta></span>';
    placeField.insertBefore(placeBtn, placeSelect);

    if (nameWrap) nameWrap.after(dateField);
    dateField.after(placeField);

    row.querySelector("[data-birth-open='date']").addEventListener("click", () => openBirthDatePicker(form));
    row.querySelector("[data-birth-open='time']").addEventListener("click", () => openBirthTimePicker(form));
    placeBtn.addEventListener("click", () => openBirthPlacePicker(form));
    dateInput.addEventListener("change", () => refreshBirthChooserDisplays(form));
    timeInput.addEventListener("change", () => refreshBirthChooserDisplays(form));
    placeSelect.addEventListener("change", () => refreshBirthChooserDisplays(form));
    refreshBirthChooserDisplays(form);
  }

  function setBirthEntryHidden(hidden) {
    document.querySelectorAll(".kundali-tabs, #birth-form, #remedy-form").forEach((el) => {
      el.hidden = hidden;
    });
    const changeBtn = document.getElementById("change-birth-details-btn");
    if (changeBtn) changeBtn.hidden = !hidden;
    if (hidden) {
      const compare = document.getElementById("kundali-compare-panel");
      if (compare) compare.hidden = true;
      closeBirthPicker();
      closeBirthPlacePicker();
    }
  }

  function bindBirthEntryToggle() {
    const changeBtn = document.getElementById("change-birth-details-btn");
    if (!changeBtn || changeBtn.dataset.bound === "1") return;
    changeBtn.dataset.bound = "1";
    changeBtn.addEventListener("click", () => setBirthEntryHidden(false));
  }

  function hookBirthChooserRefresh() {
    if (!AUTH || typeof AUTH.applyDefaultBirthToForm !== "function") return;
    if (AUTH.applyDefaultBirthToForm.__birthChooserHooked) return;
    const original = AUTH.applyDefaultBirthToForm.bind(AUTH);
    function hookedApplyDefaultBirthToForm() {
      const result = original.apply(AUTH, arguments);
      refreshBirthChooserDisplays();
      return result;
    }
    hookedApplyDefaultBirthToForm.__birthChooserHooked = true;
    AUTH.applyDefaultBirthToForm = hookedApplyDefaultBirthToForm;
  }

  function initializeCommonLayout() {
    if (isLoginPage) {
      window.location.replace(`${navHref("kundali.html")}?auth=login`);
      return;
    }

    mountLayout(AUTH ? AUTH.getUser() : null, null, AUTH ? AUTH.getUsage() : null);
    fillPlacePresetSelects();
    applyFormFieldLimits();
    enhanceBirthChooser(document.getElementById("birth-form"));
    enhanceBirthChooser(document.getElementById("remedy-form"));
    hookBirthChooserRefresh();
    bindBirthEntryToggle();
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      closeBirthPicker();
      closeBirthPlacePicker();
    });
    fillPrivacyPageFromConstants();
    mountCollectionNotices();
    recordPageView();
    keepAppLinksInWebView();

    global.addEventListener("saptarishi-auth-changed", (event) => {
      if (!AUTH) return;
      const detail = event.detail || {};
      updateHeaderAuth(
        document.querySelector(".site-header"),
        "user" in detail ? detail.user : undefined,
        "usage" in detail ? detail.usage : undefined
      );
    });

    const authTab = extractAuthTabFromQuery();
    if (authTab && MODAL) {
      MODAL.open({ tab: authTab, required: false });
    }

    refreshAuthState().catch(() => {
      /* keep header visible with cached session */
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => initializeCommonLayout());
  } else {
    initializeCommonLayout();
  }

  global.SaptarishiCommonUtils = {
    isNativeAppShell,
    isLocalDevUiHost,
    getApiOrigin,
    formatIndiaPhoneDisplay,
    indiaPhoneDigits,
    setStatusMessage,
    startStatusLoading,
    removePerIpText,
    formatApiLoadError,
    parseApiJsonResponse,
    getPlaceFromPresetOrCustom,
    syncCustomPlaceVisibility,
    placePresetOptions,
    fillPlacePresetSelects,
    applyFormFieldLimits,
    contactPhone,
    contactEmail,
    paidPlanNote,
    privacyPolicyHref,
    refreshBirthChooserDisplays,
    setBirthEntryHidden
  };
})(window);


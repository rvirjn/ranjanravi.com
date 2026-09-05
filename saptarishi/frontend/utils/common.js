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
    const advanceAmount = AC.PREMIUM_UNLIMITED_AMOUNT_INR ?? 1899;
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

  function buildHeader(user, viewCount, usage) {
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <button type="button" class="site-header__menu-btn" id="site-menu-btn" aria-label="Open menu" aria-expanded="false" aria-controls="site-header-nav">
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
  }

  function setHeaderMenuOpen(header, open) {
    if (!header) return;
    const menuBtn = header.querySelector("#site-menu-btn");
    header.classList.toggle("site-header--menu-open", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    }
    if (open) setAccountMenuOpen(header, false);
  }

  function wireHeaderMenu(header) {
    const menuBtn = header.querySelector("#site-menu-btn");
    const nav = header.querySelector("#site-header-nav");
    if (!menuBtn || !nav || header.dataset.menuWired === "1") return;
    header.dataset.menuWired = "1";

    menuBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      setHeaderMenuOpen(header, !header.classList.contains("site-header--menu-open"));
    });
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setHeaderMenuOpen(header, false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setHeaderMenuOpen(header, false);
    });
    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setHeaderMenuOpen(header, false));
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

  function initializeCommonLayout() {
    if (isLoginPage) {
      window.location.replace(`${navHref("kundali.html")}?auth=login`);
      return;
    }

    mountLayout(AUTH ? AUTH.getUser() : null, null, AUTH ? AUTH.getUsage() : null);
    fillPlacePresetSelects();
    applyFormFieldLimits();
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
    privacyPolicyHref
  };
})(window);


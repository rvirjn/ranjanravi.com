// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Native Android shell: top bar, bottom nav, Call/Ask, menu, profiles,
 * and Home / Dasha / Horoscope / Do's & Don't screens.
 */
(function nativeApp(global) {
  const isNative =
    document.documentElement.classList.contains("saptarishi-native-app") ||
    /SaptarishiNativeApp/i.test(navigator.userAgent || "");
  if (!isNative) return;
  if (global.__SAPTARISHI_NATIVE_BOOTED) return;
  global.__SAPTARISHI_NATIVE_BOOTED = true;

  document.documentElement.classList.add("saptarishi-native-app");

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const AUTH = global.SaptarishiAuth;
  const LAST_CHART_KEY = "saptarishi.native.lastChart";
  const ACTIVE_CHART_KEY = "saptarishi.native.activeChart";
  const GENDER_KEY = "saptarishi.native.gender";

  const HOUSES = [
    { n: 1, label: "Personality", icon: "person" },
    { n: 2, label: "Wealth", icon: "wealth" },
    { n: 3, label: "Siblings", icon: "people" },
    { n: 4, label: "Home", icon: "home" },
    { n: 5, label: "Children", icon: "children" },
    { n: 6, label: "Enemies", icon: "star" },
    { n: 7, label: "Marriage", icon: "heart" },
    { n: 8, label: "Longevity", icon: "clock" },
    { n: 9, label: "Fortune", icon: "stars" },
    { n: 10, label: "Career", icon: "brief" },
    { n: 11, label: "Gains", icon: "gain" },
    { n: 12, label: "Expenses", icon: "bag" }
  ];

  const PLANET_COPY = {
    sun: {
      hero: "The Sun favors honest effort — finish one visible task and stand by a clear choice.",
      why: "Solar periods reward visibility and clean leadership. Keep promises short and do what you say.",
      action: "Complete one public or work task before noon.",
      dos: ["Speak calmly in family talks", "Finish one pending work task", "Wear light, clean colors", "Help someone without expecting return"],
      dont: ["Rush into big purchases", "Argue to prove a point", "Ignore rest after heat or travel", "Share private plans publicly"]
    },
    moon: {
      hero: "The Moon favors calm care — tend home, food, and feelings before pushing new plans.",
      why: "Lunar periods move through mood and family. Gentle talk lands better than force.",
      action: "Eat on time and send one kind message home.",
      dos: ["Speak calmly in family talks", "Keep meals regular", "Wear light, clean colors", "Rest when the body asks"],
      dont: ["Argue late at night", "Skip meals", "Overshare emotions in public", "Start a money fight"]
    },
    mars: {
      hero: "Mars favors focused action — one decisive step beats scattered heat.",
      why: "Mars periods reward courage with control. Channel drive into a single finish line.",
      action: "Finish one physical or work task, then stop.",
      dos: ["Finish one pending task", "Move the body briefly", "Keep words short", "Protect energy for the main goal"],
      dont: ["Rush into big purchases", "Argue late at night", "Drive angry", "Pick a needless fight"]
    },
    mercury: {
      hero: "Mercury favors clear talk — keep messages short, confirm plans once, then leave space.",
      why: "Mercury antardasha favors clear talk. Confirm once and avoid rushed money decisions.",
      action: "Send one clear message and confirm one plan.",
      dos: ["Speak calmly in family talks", "Finish one pending money task", "Keep notes short", "Confirm plans once"],
      dont: ["Rush into big purchases", "Send angry texts", "Sign without reading", "Share private plans publicly"]
    },
    jupiter: {
      hero: "Jupiter supports wise timing — teach, give, and choose the larger good over haste.",
      why: "Jupiter periods favor learning, elders, and clean expansion. Advice lands if you stay humble.",
      action: "Help someone, or study one page with care.",
      dos: ["Help someone without expecting return", "Speak calmly in family talks", "Wear light, clean colors", "Keep a promise to an elder"],
      dont: ["Overpromise", "Spend to impress", "Ignore health rest cues", "Preach while skipping your own work"]
    },
    venus: {
      hero: "Venus favors calm choices — finish one task and speak gently.",
      why: "Venus supports comfort, art, and partnership. Soft speech and one finished task beat urgency.",
      action: "Speak gently and close one pending task.",
      dos: ["Speak calmly in family talks", "Finish one pending money task", "Wear light, clean colors", "Help someone without expecting return"],
      dont: ["Rush into big purchases", "Argue late at night", "Ignore health rest cues", "Share private plans publicly"]
    },
    saturn: {
      hero: "Saturn asks for steady work — slow, honest effort outlasts shortcuts today.",
      why: "Saturn periods reward patience and duty. Delay big buys; keep the routine.",
      action: "Do the overdue duty first, then rest.",
      dos: ["Finish one pending money task", "Keep a simple routine", "Rest when tired", "Speak less, do more"],
      dont: ["Rush into big purchases", "Argue late at night", "Ignore health rest cues", "Skip a duty you already accepted"]
    },
    rahu: {
      hero: "Rahu stirs unusual paths — pause before a new deal and check the fine print.",
      why: "Rahu periods amplify desire and novelty. Verify twice before you commit money or speech.",
      action: "Recheck one plan before you say yes.",
      dos: ["Confirm facts once more", "Finish one pending task", "Keep spending modest", "Stay with known people today"],
      dont: ["Rush into big purchases", "Share private plans publicly", "Chase a too-good offer", "Argue late at night"]
    },
    ketu: {
      hero: "Ketu favors quiet release — drop one extra task and keep the day simple.",
      why: "Ketu periods thin attachments. Less talk, less clutter, more inner order.",
      action: "Cancel one extra commitment.",
      dos: ["Keep the day simple", "Finish one pending task", "Wear light, clean colors", "Sit quietly for a few minutes"],
      dont: ["Rush into big purchases", "Start a new argument", "Overexplain yourself", "Ignore rest cues"]
    }
  };

  const ICONS = {
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 6.5h17"/><path d="M3.5 12h13"/><path d="M3.5 17.5h17"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 4v4M16 4v4M4 11h16"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s6.5-6.4 6.5-11A6.5 6.5 0 1 0 5.5 10C5.5 14.6 12 21 12 21z"/><circle cx="12" cy="10" r="2.1"/></svg>',
    wallet: '<svg class="app-wallet__icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 12.5h3.5"/><circle cx="16.8" cy="12.5" r="0.8"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.8h3.2l1.2 3.2-1.8 1.2a12 12 0 0 0 5.2 5.2l1.2-1.8 3.2 1.2V17c0 1.1-.9 2-2 2A14.2 14.2 0 0 1 5 6.8c0-1.1.9-2 2-2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6.2h14v9.2H9.2L5 18.8z"/></svg>',
    chevron: '<svg class="app-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"/></svg>',
    person: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3"/><path d="M6.2 19c.9-3.4 2.8-5.1 5.8-5.1s4.9 1.7 5.8 5.1"/></svg>',
    wealth: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M12 8v8M9.5 10.2c.6-1 1.6-1.5 2.5-1.5 1.6 0 2.6 1 2.6 2.3s-1 2.3-2.6 2.3c-.9 0-1.9-.4-2.5-1.4"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.2" r="2.2"/><circle cx="15.4" cy="8.6" r="1.8"/><path d="M4.8 18.2c.7-2.8 2.2-4.2 4.4-4.2s3.7 1.4 4.4 4.2M13.2 14.4c1.6 0 2.9 1 3.6 3.4"/></svg>',
    home: '<svg viewBox="0 0 24 24"><path d="M4 11.2 12 5l8 6.2"/><path d="M7 10.5V19h10v-8.5"/><path d="M10 19v-4.2h4V19"/></svg>',
    children: '<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="1.6"/><circle cx="16" cy="9" r="1.6"/><circle cx="12" cy="7.2" r="1.5"/><path d="M6.2 18.5c.6-2.6 1.8-3.8 3.5-3.8.8 0 1.5.3 2.3.9.8-.6 1.5-.9 2.3-.9 1.7 0 2.9 1.2 3.5 3.8"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5 13.8 9h5.7l-4.6 3.4 1.8 5.6L12 14.8 7.3 18l1.8-5.6L4.5 9h5.7z"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 19.5S5.5 14.8 5.5 10.2A3.5 3.5 0 0 1 12 8.2a3.5 3.5 0 0 1 6.5 2c0 4.6-6.5 9.3-6.5 9.3z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2"/><path d="M12 8.2v4.1l2.6 1.7"/></svg>',
    stars: '<svg viewBox="0 0 24 24"><path d="M8 4.5 9 7.4 12 8.4 9 9.4 8 12.3 7 9.4 4 8.4 7 7.4zM16 9.2l.8 2.3 2.4.8-2.4.8-.8 2.3-.8-2.3-2.4-.8 2.4-.8z"/></svg>',
    brief: '<svg viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="11" rx="1.5"/><path d="M9 8V6.6A1.6 1.6 0 0 1 10.6 5h2.8A1.6 1.6 0 0 1 15 6.6V8"/></svg>',
    gain: '<svg viewBox="0 0 24 24"><path d="M5 16.8 12 6.2l7 10.6z"/><path d="M12 10.4v3.4"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M6 8.2h12l-.8 10.2H6.8z"/><path d="M9 8.2V6.8A3 3 0 0 1 12 4.2 3 3 0 0 1 15 6.8v1.4"/></svg>',
    kundali: '<svg viewBox="0 0 24 24"><path d="M12 3.5 13.2 8.2 18 7.4 14.4 11 18 14.8l-4.8-.8L12 20.5l-1.2-6.5-4.8.8L9.6 11 6 7.4l4.8.8z"/></svg>',
    remedy: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M8 12h8M12 8c2 1.4 2 6.6 0 8-2-1.4-2-6.6 0-8z"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 8h11l-2.4-2.4"/><path d="M17 16H6l2.4 2.4"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14"/><path d="M10 7V5h4v2"/><path d="M8.5 7l.7 12h5.6l.7-12"/></svg>'
  };

  function pageHref(file) {
    if (global.SaptarishiCommonUtils && AC) {
      const prefix = AC.DEPLOY_PREFIX || "";
      if (/\/frontend\/html\//i.test(window.location.pathname)) {
        return `${prefix}/frontend/html/${file}`;
      }
      if (AC.PAGE_FILE_TO_PATH && AC.PAGE_FILE_TO_PATH[file]) return AC.PAGE_FILE_TO_PATH[file];
      return `${prefix}/frontend/html/${file}`;
    }
    return file;
  }

  function nativeSupportHref() {
    const path = String(window.location.pathname || "");
    const i = path.indexOf("/frontend/");
    const pre = i >= 0 ? path.slice(0, i) : ((AC && AC.DEPLOY_PREFIX) || "");
    return `${pre}/frontend/mobile/android/support.html`;
  }

  function fillSupportContacts() {
    const emailLink = document.getElementById("support-email");
    const waLink = document.getElementById("support-whatsapp");
    if (!emailLink && !waLink) return;
    const email = String((AC && (AC.SUPPORT_EMAIL || AC.CONTACT_EMAIL)) || "").trim();
    const local = String((AC && (AC.CONTACT_PHONE || AC.PREMIUM_CONTACT_PHONE)) || "")
      .replace(/\D/g, "")
      .replace(/^91/, "")
      .slice(-10);
    const mailSubject = encodeURIComponent(String((AC && AC.SUPPORT_EMAIL_SUBJECT) || "Saptarishi support"));
    const mailBody = encodeURIComponent(String((AC && AC.SUPPORT_EMAIL_BODY) || ""));
    const waText = encodeURIComponent(String((AC && AC.SUPPORT_WHATSAPP_MESSAGE) || ""));
    const phoneDisplay =
      local.length === 10 ? `+91 ${local.slice(0, 5)} ${local.slice(5)}` : local ? `+91 ${local}` : "";
    if (emailLink && email) {
      emailLink.setAttribute("href", `mailto:${encodeURIComponent(email)}?subject=${mailSubject}&body=${mailBody}`);
      const text = document.getElementById("support-email-text");
      if (text) text.textContent = email;
    }
    if (waLink && local) {
      waLink.setAttribute("href", `https://wa.me/91${local}?text=${waText}`);
      const text = document.getElementById("support-whatsapp-text");
      if (text) text.textContent = phoneDisplay;
    }
  }

  function livePage() {
    if (
      document.getElementById("auspicious-options-view") ||
      document.getElementById("auspicious-form")
    ) {
      return "auspicious";
    }
    if (document.getElementById("remedy-form") && !document.getElementById("birth-form")) {
      return "remedy";
    }
    if (document.getElementById("support-email") || /\/support/i.test(location.pathname)) {
      return "support";
    }
    if (document.getElementById("privacy-site-contact") || /\/privacy/i.test(location.pathname)) {
      return "privacy";
    }
    if (document.getElementById("profile-form") || /\/profile/i.test(location.pathname)) {
      return "profile";
    }
    const path = String(window.location.pathname || "").toLowerCase();
    const href = String(window.location.href || "").toLowerCase();
    const file = (path.split("/").pop() || "").replace(/[?#].*$/, "");
    if (path.includes("auspicious") || href.includes("auspicious") || file === "auspicious.html") {
      return "auspicious";
    }
    if (path.includes("/remedy") || href.includes("remedy.html") || file === "remedy.html") {
      return "remedy";
    }
    if (path.includes("/profile") || file === "profile.html") return "profile";
    if (path.includes("/privacy") || file === "privacy.html") return "privacy";
    if (path.includes("/support") || file === "support.html") return "support";
    if (path.includes("/kundali") || file === "kundali.html" || path === "/" || file === "") return "kundali";
    return "kundali";
  }

  function stripHouseGridsOffAuspicious() {
    if (livePage() !== "auspicious" && !document.getElementById("auspicious-options-view")) return;
    document
      .querySelectorAll("#app-remedy-grid, #app-remedy-intro, #app-kundali-houses, .app-house-grid")
      .forEach((el) => el.remove());
    document.querySelectorAll(".feature-tile[data-house]").forEach((el) => el.remove());
  }

  function hashScreen() {
    const raw = String(window.location.hash || "").replace(/^#/, "");
    const params = new URLSearchParams(raw.includes("=") ? raw.replace(/^app=/, "app=") : `app=${raw}`);
    const fromPair = /(?:^|&)app=([^&]*)/.exec(raw);
    const value = (fromPair ? fromPair[1] : params.get("app") || "").toLowerCase();
    if (value === "home" || value === "dasha" || value === "horoscope" || value === "dos" || value === "kundali") {
      return value;
    }
    return "";
  }

  function currentPage() {
    const live = livePage();
    if (live !== "kundali") return live;
    const screen = hashScreen();
    if (screen) return screen;
    const params = new URLSearchParams(window.location.search);
    if (params.get("compare") || params.get("mode") || params.get("house")) return "kundali";
    return "home";
  }

  function screenHref(screen) {
    return `${pageHref("kundali.html")}#app=${screen}`;
  }

  function initials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "PR";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function planetKey(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "");
  }

  function copyForPlanet(name) {
    return PLANET_COPY[planetKey(name)] || PLANET_COPY.venus;
  }

  function formatDateLabel(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatLongDate(value) {
    const date = value instanceof Date ? value : new Date(value || Date.now());
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  function readJson(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore quota */
    }
  }

  function getBirthViews() {
    return AUTH && AUTH.getBirthViews ? AUTH.getBirthViews() : [];
  }

  function getActiveChart() {
    const saved = readJson(ACTIVE_CHART_KEY);
    const views = getBirthViews();
    if (saved && saved.name) {
      const match = views.find(
        (view) => String(view.name || "").trim().toLowerCase() === String(saved.name).trim().toLowerCase()
      );
      if (match) return match;
      if (saved.date) return saved;
    }
    if (AUTH && AUTH.getDefaultBirth) {
      const def = AUTH.getDefaultBirth();
      if (def && def.date) return def;
    }
    return views[0] || null;
  }

  function birthKey(view) {
    return [
      String(view?.name || "").trim().toLowerCase(),
      String(view?.date || "").trim(),
      String(view?.time || "").trim(),
      String(view?.place || "").trim()
    ].join("|");
  }

  function setActiveChart(view) {
    if (!view) return;
    const next = {
      name: view.name || "",
      date: view.date || "",
      time: view.time || "",
      place: view.place || ""
    };
    if (birthKey(readJson(ACTIVE_CHART_KEY)) === birthKey(next)) return;
    writeJson(ACTIVE_CHART_KEY, next);
    global.dispatchEvent(new CustomEvent("saptarishi-native-chart-changed", { detail: view }));
  }

  function rememberChartPayload(payload, birth) {
    if (!payload) return;
    writeJson(LAST_CHART_KEY, {
      at: Date.now(),
      birth: birth || getActiveChart(),
      payload
    });
  }

  function lastChartPayload() {
    const packed = readJson(LAST_CHART_KEY);
    return packed && packed.payload ? packed : null;
  }

  function ensureFonts() {
    if (document.getElementById("saptarishi-app-fonts")) return;
    const pre = document.createElement("link");
    pre.rel = "preconnect";
    pre.href = "https://fonts.googleapis.com";
    const pre2 = document.createElement("link");
    pre2.rel = "preconnect";
    pre2.href = "https://fonts.gstatic.com";
    pre2.crossOrigin = "anonymous";
    const link = document.createElement("link");
    link.id = "saptarishi-app-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@600;700&display=swap";
    document.head.append(pre, pre2, link);
  }

  function ensureNativeCss() {
    /* CSS is injected from the Android app assets — never loaded from the desktop site. */
  }

  function avatarInitials() {
    const chart = getActiveChart();
    const chartName = String(chart?.name || "").trim();
    if (chartName) return initials(chartName);
    const user = AUTH && AUTH.getUser ? AUTH.getUser() : null;
    const accountName = String(user?.name || "").trim();
    if (accountName) return initials(accountName);
    return "IN";
  }

  function displayChartName() {
    const chart = getActiveChart();
    const chartName = String(chart?.name || "").trim();
    if (chartName) return chartName;
    const user = AUTH && AUTH.getUser ? AUTH.getUser() : null;
    const accountName = String(user?.name || "").trim();
    if (accountName) return accountName;
    return "Guest";
  }

  function userName() {
    const user = AUTH && AUTH.getUser ? AUTH.getUser() : null;
    return (user && (user.name || user.mobile)) || "";
  }

  function walletBalance() {
    if (AUTH && AUTH.getWalletBalance) return AUTH.getWalletBalance();
    return 0;
  }

  function rebuildHeader() {
    let header = document.querySelector(".site-header");
    if (!header) {
      header = document.createElement("header");
      header.className = "site-header";
      document.body.insertBefore(header, document.body.firstChild);
    }
    header.classList.add("app-topbar");
    const brandHref = screenHref("home");
    header.innerHTML = `
      <button type="button" class="app-menu-btn" id="app-menu-btn" aria-label="Open menu">${ICONS.menu}</button>
      <a class="app-brand" href="${brandHref}">SAPTARISHI</a>
      <div class="site-header__meta">
        <button type="button" id="site-wallet-btn" class="site-header__wallet app-wallet" hidden title="Wallet">${ICONS.wallet}<span class="app-wallet__amt">₹0</span></button>
        <button type="button" class="app-avatar" id="app-profile-btn" aria-label="Select Birth details">IN</button>
        <a href="${pageHref("profile.html")}" class="site-header__link site-header__profile" id="site-profile-link" hidden>Profile</a>
        <button type="button" id="site-login-btn" class="site-header__login" hidden>Login</button>
        <button type="button" id="site-logout-btn" class="site-header__logout" hidden>Logout</button>
      </div>
    `;
    const walletBtn = header.querySelector("#site-wallet-btn");
    if (walletBtn) {
      walletBtn.addEventListener("click", () => {
        if (AUTH && AUTH.openWalletFlow) AUTH.openWalletFlow();
      });
    }
    header.querySelector("#app-menu-btn")?.addEventListener("click", openDrawer);
    header.querySelector("#app-profile-btn")?.addEventListener("click", async () => {
      if (!AUTH) return;
      if (!AUTH.getToken()) {
        if (AUTH.ensureAuth) {
          await AUTH.ensureAuth({ tab: "login", required: true, message: "Sign in to manage charts." });
        }
        if (!AUTH.getToken()) return;
      }
      openProfiles();
    });
    refreshHeaderAuth();
  }

  function refreshHeaderAuth() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const user = AUTH ? AUTH.getUser() : null;
    const walletBtn = header.querySelector("#site-wallet-btn");
    const avatar = header.querySelector("#app-profile-btn");
    const loginBtn = header.querySelector("#site-login-btn");
    const logoutBtn = header.querySelector("#site-logout-btn");
    const profileLink = header.querySelector("#site-profile-link");
    if (walletBtn) {
      if (user) {
        walletBtn.hidden = false;
        const amt = walletBtn.querySelector(".app-wallet__amt");
        if (amt) amt.textContent = `₹${walletBalance()}`;
        else walletBtn.innerHTML = `${ICONS.wallet}<span class="app-wallet__amt">₹${walletBalance()}</span>`;
      } else {
        walletBtn.hidden = true;
      }
    }
    if (avatar) {
      const chart = getActiveChart();
      const chartName = String(chart?.name || "").trim();
      avatar.textContent = avatarInitials();
      const label = chartName ? `Select Birth details · ${chartName}` : "Select Birth details";
      avatar.title = label;
      avatar.setAttribute("aria-label", label);
      avatar.classList.toggle("app-avatar--guest", !user);
    }
    if (loginBtn) loginBtn.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    if (profileLink) profileLink.hidden = true;
  }

  function mountDock() {
    if (document.querySelector(".app-dock")) return;
    const page = currentPage();
    const dock = document.createElement("div");
    dock.className = "app-dock";
    dock.innerHTML = `
      <div class="app-cta-row">
        <button type="button" class="app-cta app-cta--call" id="app-call-btn">${ICONS.phone} Call</button>
        <button type="button" class="app-cta app-cta--ask" id="app-ask-btn">${ICONS.chat} Ask</button>
      </div>
      <nav class="app-tabbar" aria-label="App">
        <a class="app-tab${page === "home" ? " is-on" : ""}" data-app-screen="home" href="${screenHref("home")}">Home</a>
        <a class="app-tab${page === "dasha" ? " is-on" : ""}" data-app-screen="dasha" href="${screenHref("dasha")}">Dasha</a>
        <a class="app-tab${page === "horoscope" ? " is-on" : ""}" data-app-screen="horoscope" href="${screenHref("horoscope")}">Horoscope</a>
        <a class="app-tab${page === "dos" ? " is-on" : ""}" data-app-screen="dos" href="${screenHref("dos")}">Do's & Don't</a>
      </nav>
    `;
    document.body.appendChild(dock);
    dock.querySelector("#app-call-btn")?.addEventListener("click", () => handleCallOrAsk("call"));
    dock.querySelector("#app-ask-btn")?.addEventListener("click", () => handleCallOrAsk("ask"));
    dock.querySelectorAll("[data-app-screen]").forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        goScreen(tab.getAttribute("data-app-screen"));
      });
    });
  }

  async function handleCallOrAsk(service) {
    if (!AUTH) return;
    if (!AUTH.getToken()) {
      const ok = AUTH.ensureAuth
        ? await AUTH.ensureAuth({ tab: "login", required: true, message: "Sign in to use Call and Ask." })
        : false;
      if (!ok) return;
    }
    const rate =
      service === "ask"
        ? Number(AC?.ASTROLOGER_ASK_RATE_INR_PER_MIN) || 21
        : Number(AC?.ASTROLOGER_CALL_RATE_INR_PER_MIN) || 21;
    const balance = AUTH.getWalletBalance ? AUTH.getWalletBalance() : 0;
    const minBalance = Number(AC?.ASTROLOGER_MIN_BALANCE_INR) || rate;
    if (balance < Math.max(rate, minBalance)) {
      if (AUTH.openWalletFlow) {
        await AUTH.openWalletFlow({
          message: `Add money to your wallet. ${service === "ask" ? "Ask" : "Call"} is ₹${rate}/min.`
        });
      }
      return;
    }
    try {
      let askWin = null;
      if (service === "ask") askWin = window.open("about:blank", "_blank");
      const payload = await AUTH.chargeWalletForService(service, 1);
      const astro = payload?.astrologer || {};
      const phone = String(astro.phone || AC?.CONTACT_PHONE || AC?.PREMIUM_CONTACT_PHONE || "").replace(/\D/g, "");
      const localPhone = phone.slice(-10);
      const wa = String(astro.whatsapp || `91${localPhone}`).replace(/\D/g, "");
      if (service === "call") {
        window.location.href = `tel:+91${localPhone}`;
      } else {
        const text = encodeURIComponent(
          `Hi ${astro.name || "Astrologer"}, I have a question from Saptarishi.`
        );
        const waUrl = `https://wa.me/${wa}?text=${text}`;
        if (askWin && !askWin.closed) askWin.location.href = waUrl;
        else window.location.href = waUrl;
      }
      refreshHeaderAuth();
    } catch (err) {
      window.alert(err.message || `Could not start ${service}.`);
      if (String(err.message || "").toLowerCase().includes("insufficient") && AUTH.openWalletFlow) {
        await AUTH.openWalletFlow();
      }
    }
  }

  function icon(name) {
    return ICONS[name] || ICONS.star;
  }

  function mountDrawer() {
    if (document.getElementById("app-drawer")) return;
    const drawer = document.createElement("div");
    drawer.id = "app-drawer";
    drawer.className = "app-drawer";
    drawer.hidden = true;
    document.body.appendChild(drawer);
  }

  function renderDrawer() {
    const drawer = document.getElementById("app-drawer");
    if (!drawer) return;
    const user = AUTH ? AUTH.getUser() : null;
    const chart = getActiveChart();
    const aboutHouses =
      livePage() === "remedy" || currentPage() === "kundali"
        ? [
            ...HOUSES.filter((house) => house.n === 4),
            ...HOUSES.filter((house) => house.n !== 4)
          ]
        : [];
    const aboutItems = aboutHouses.map(
      (house) => `
        <a class="app-menu-item" href="${pageHref(livePage() === "remedy" ? "remedy.html" : "kundali.html")}?house=${house.n}${livePage() === "kundali" ? "#app=kundali" : ""}">
          ${icon(house.icon)}
          <span>${house.label}</span>
          ${ICONS.chevron}
        </a>`
    ).join("");
    drawer.innerHTML = `
      <header class="site-header app-topbar" style="position:sticky;padding-left:0;padding-right:0;background:transparent">
        <button type="button" class="app-menu-btn" id="app-drawer-close" aria-label="Close menu">${ICONS.menu}</button>
        <span class="app-brand">SAPTARISHI</span>
        <span style="width:2.35rem"></span>
      </header>
      <div class="app-drawer-scroll">
      <div class="app-user-card">
        <span class="app-avatar">${escapeHtml(avatarInitials())}</span>
        <div>
          <a class="app-user-card__name" href="${screenHref("home")}" id="app-drawer-home">${escapeHtml(displayChartName())}</a>
          <span>${chart ? "Active chart • explore houses" : "No chart yet • add birth details"}</span>
        </div>
      </div>
      ${aboutItems ? `<p class="app-menu-label">About your</p><div class="app-menu-list">${aboutItems}</div>` : ""}
      <p class="app-menu-label">Profile</p>
      <div class="app-menu-list">
        <a class="app-menu-item" href="${pageHref("profile.html")}">${icon("person")}<span>Edit</span>${ICONS.chevron}</a>
        <button type="button" class="app-menu-item" id="app-menu-wallet">${ICONS.wallet}<span>Wallet</span>${ICONS.chevron}</button>
        <a class="app-menu-item" href="${nativeSupportHref()}">${icon("chat")}<span>Support</span>${ICONS.chevron}</a>
        <a class="app-menu-item" href="${pageHref("privacy.html")}">${icon("brief")}<span>Privacy</span>${ICONS.chevron}</a>
        <button type="button" class="app-menu-item" id="app-menu-logout">${icon("swap")}<span>${user ? "Logout" : "Login"}</span>${ICONS.chevron}</button>
      </div>
      <p class="app-menu-label">Account</p>
      <div class="app-menu-list">
        <a class="app-menu-item" href="${pageHref("profile.html")}">${icon("clock")}<span>Settings</span>${ICONS.chevron}</a>
      </div>
      </div>
      <div class="app-drawer-foot">
        <strong>SAPTARISHI</strong>
        <span>Version 1.0.0</span>
      </div>
    `;
    drawer.querySelector("#app-drawer-close")?.addEventListener("click", closeDrawer);
    drawer.querySelector("#app-drawer-home")?.addEventListener("click", (event) => {
      event.preventDefault();
      closeDrawer();
      goScreen("home");
    });
    drawer.querySelector("#app-menu-wallet")?.addEventListener("click", () => {
      closeDrawer();
      if (AUTH?.openWalletFlow) AUTH.openWalletFlow();
      else if (!AUTH?.getToken() && AUTH?.ensureAuth) AUTH.ensureAuth({ tab: "login", required: true });
    });
    drawer.querySelector("#app-menu-logout")?.addEventListener("click", async () => {
      closeDrawer();
      if (user && AUTH?.logout) {
        await AUTH.logout();
        window.location.replace(pageHref("kundali.html"));
        return;
      }
      if (AUTH?.ensureAuth) await AUTH.ensureAuth({ tab: "login", required: true });
      refreshHeaderAuth();
    });
  }

  function setNativePullRefresh(enabled) {
    try {
      if (global.SaptarishiAndroid && global.SaptarishiAndroid.setPullToRefreshEnabled) {
        global.SaptarishiAndroid.setPullToRefreshEnabled(Boolean(enabled));
      }
    } catch {
      /* WebView bridge not present on desktop */
    }
  }

  function setDockHidden(hidden) {
    const dock = document.querySelector(".app-dock");
    if (dock) dock.hidden = Boolean(hidden);
  }

  function openDrawer() {
    renderDrawer();
    const drawer = document.getElementById("app-drawer");
    if (drawer) drawer.hidden = false;
    setDockHidden(true);
    setNativePullRefresh(false);
  }

  function closeDrawer() {
    const drawer = document.getElementById("app-drawer");
    if (drawer) drawer.hidden = true;
    setDockHidden(false);
    const sheet = document.getElementById("app-sheet-mask");
    setNativePullRefresh(!sheet || sheet.hidden);
  }

  function mountProfiles() {
    if (document.getElementById("app-sheet-mask")) return;
    const mask = document.createElement("div");
    mask.id = "app-sheet-mask";
    mask.className = "app-sheet-mask";
    mask.hidden = true;
    mask.innerHTML = `<div class="app-sheet" role="dialog" aria-labelledby="app-profiles-title">
      <div class="app-sheet__handle"></div>
      <div class="app-sheet__head">
        <h2 id="app-profiles-title">Select Birth details</h2>
        <button type="button" class="app-sheet__close" id="app-sheet-close" aria-label="Close">×</button>
      </div>
      <div id="app-profile-list"></div>
      <button type="button" class="app-add-chart" id="app-add-chart">Enter New Birth details</button>
    </div>`;
    document.body.appendChild(mask);
    mask.addEventListener("click", (event) => {
      if (event.target === mask) closeProfiles();
    });
    mask.querySelector("#app-sheet-close")?.addEventListener("click", closeProfiles);
    mask.querySelector("#app-add-chart")?.addEventListener("click", () => {
      closeProfiles();
      window.location.href = `${pageHref("kundali.html")}?mode=new#app=kundali`;
    });
  }

  function renderProfiles() {
    const list = document.getElementById("app-profile-list");
    if (!list) return;
    const views = getBirthViews();
    const active = getActiveChart();
    const activeKey = String(active?.name || "").trim().toLowerCase();
    if (!views.length) {
      list.innerHTML = `<p class="app-empty">No saved birth details yet. Enter new birth details to open kundali, dasha, and remedies.</p>`;
      return;
    }
    list.innerHTML = views
      .map((view) => {
        const key = String(view.name || "").trim().toLowerCase();
        const on = key && key === activeKey;
        const name = String(view.name || "").trim();
        return `<button type="button" class="app-profile-row${on ? " is-on" : ""}" data-name="${escapeHtml(key)}">
          <span class="app-avatar">${escapeHtml(initials(view.name))}</span>
          <span><strong>${escapeHtml(name)}</strong><span>${escapeHtml(view.date || "")}</span></span>
          <span class="app-delete" data-delete="${escapeHtml(name)}" title="Delete saved birth details" role="button">${ICONS.trash}</span>
          <span class="app-check"></span>
        </button>`;
      })
      .join("");
    list.querySelectorAll(".app-profile-row").forEach((row) => {
      row.addEventListener("click", async (event) => {
        const deleteBtn = event.target.closest("[data-delete]");
        if (deleteBtn) {
          event.preventDefault();
          event.stopPropagation();
          const name = deleteBtn.getAttribute("data-delete") || "";
          if (!name) return;
          if (!AUTH?.getToken || !AUTH.getToken()) {
            closeProfiles();
            if (AUTH?.ensureAuth) {
              await AUTH.ensureAuth({
                tab: "login",
                required: true,
                message: "Sign in to delete saved birth details."
              });
            }
            return;
          }
          if (!window.confirm(`Delete saved birth details for ${name}?`)) return;
          try {
            await AUTH.deleteBirthView(name);
            const remaining = getBirthViews();
            if (remaining[0]) setActiveChart(remaining[0]);
            renderProfiles();
          } catch (err) {
            window.alert(err.message || "Could not delete saved birth details.");
          }
          return;
        }
        const key = row.getAttribute("data-name");
        const view = views.find((entry) => String(entry.name || "").trim().toLowerCase() === key);
        if (view) setActiveChart(view);
        closeProfiles();
      });
    });
  }

  function openProfiles() {
    renderProfiles();
    const mask = document.getElementById("app-sheet-mask");
    if (mask) mask.hidden = false;
    setDockHidden(true);
    setNativePullRefresh(false);
  }

  function closeProfiles() {
    const mask = document.getElementById("app-sheet-mask");
    if (mask) mask.hidden = true;
    const drawer = document.getElementById("app-drawer");
    setDockHidden(Boolean(drawer && !drawer.hidden));
    setNativePullRefresh(Boolean(!drawer || drawer.hidden));
  }

  async function loadChartPayload() {
    const packed = lastChartPayload();
    const birth = getActiveChart();
    if (packed?.payload && birth?.date && packed.birth?.date === birth.date && packed.birth?.name === birth.name) {
      return packed.payload;
    }
    if (!birth?.date || !birth?.time || !birth?.place || !AUTH?.fetchKundali) return null;
    const params = new URLSearchParams({
      date: birth.date,
      time: birth.time,
      place: birth.place,
      house_system: AC?.DEFAULT_HOUSE_SYSTEM || "W"
    });
    if (birth.name) params.set("name", birth.name);
    const payload = await AUTH.fetchKundali(
      `${AC.API_KUNDALI_PATH}?${params}`,
      birth.date,
      birth.time,
      birth.place,
      birth.name
    );
    rememberChartPayload(payload, birth);
    return payload;
  }

  function kundaliQuery() {
    return new URLSearchParams(window.location.search || "");
  }

  function isKundaliCompareMode() {
    return kundaliQuery().get("compare") === "1";
  }

  function isKundaliNewMode() {
    return kundaliQuery().get("mode") === "new";
  }

  function applyKundaliChooserMode() {
    document.body.classList.toggle("app-kundali-compare", isKundaliCompareMode());
    document.body.classList.toggle(
      "app-kundali-new",
      isKundaliNewMode() && !isKundaliCompareMode()
    );
    if (!isKundaliCompareMode()) {
      document.querySelectorAll(".kundali-tabs").forEach((el) => {
        el.hidden = true;
      });
    }
  }

  function showKundaliEmpty(message) {
    const form = document.getElementById("birth-form");
    const shell = document.getElementById("saptarishi");
    let empty = document.getElementById("app-kundali-empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.id = "app-kundali-empty";
      empty.className = "app-empty";
      if (form) form.before(empty);
      else if (shell) shell.appendChild(empty);
    }
    empty.innerHTML = `<p>${escapeHtml(message || "Select a birth to open kundali details.")}</p>
      <button type="button" class="app-add-chart" id="app-kundali-pick">Select Birth details</button>`;
    empty.querySelector("#app-kundali-pick")?.addEventListener("click", openProfiles);
  }

  async function openKundaliDetails(options = {}) {
    if (livePage() !== "kundali") return;
    applyKundaliChooserMode();
    if (isKundaliCompareMode()) return;
    if (isKundaliNewMode()) {
      document.getElementById("tab-new-kundali")?.click();
      return;
    }
    document.getElementById("app-kundali-empty")?.remove();
    const chart = getActiveChart();
    if (!chart?.date || !chart?.time || !chart?.place) {
      showKundaliEmpty();
      return;
    }
    try {
      if (global.SaptarishiKundaliPage?.showLoading) {
        global.SaptarishiKundaliPage.showLoading();
      }
      const payload = await loadChartPayload();
      if (!payload) {
        showKundaliEmpty();
        return;
      }
      const view = global.SaptarishiKundaliView;
      if (view && typeof view.renderIntoPage === "function") {
        view.renderIntoPage(payload);
      }
      const results = document.getElementById("results");
      if (results) results.hidden = false;
      const house = options.house || kundaliQuery().get("house");
      if (house) {
        window.requestAnimationFrame(() => {
          document
            .getElementById("house-planets-tiles")
            ?.querySelector(`[data-house="${house}"]`)
            ?.click();
        });
      }
    } catch (err) {
      showKundaliEmpty(err.message || "Could not open kundali details.");
      if (AUTH?.handlePremiumRequired) {
        AUTH.handlePremiumRequired(err).catch(() => {});
      }
    }
  }

  function dashaSnapshot(payload) {
    const view = global.SaptarishiKundaliView;
    if (!payload || typeof payload !== "object") return null;
    if (view && typeof view.computeCurrentDashaSnapshot === "function") {
      try {
        return view.computeCurrentDashaSnapshot(payload);
      } catch {
        return null;
      }
    }
    return null;
  }

  function dashaPlanetLabel(value) {
    const text = String(value || "").trim();
    if (!text || text === "—") return "";
    return text;
  }

  function needChartHtml() {
    return `<p class="app-empty">Open a birth chart first to see this guidance. <a href="${screenHref("kundali")}">Add or open kundali</a>.</p>`;
  }

  function initHome() {
    const root = document.getElementById("app-home");
    if (!root) return;
    const slides = [
      { kicker: "TODAY", title: "Your daily horoscope", body: copyForPlanet("venus").hero },
      { kicker: "FAMILY", title: "Speak gently today", body: "Keep one family talk short and kind. Leave space before you decide." },
      { kicker: "MONEY", title: "One money task", body: "Finish one pending money task. Avoid a rushed purchase." },
      { kicker: "WORK", title: "Close one loop", body: "Pick one unfinished task and complete it before starting another." },
      { kicker: "REST", title: "Protect your energy", body: "Wear light colors, rest when the body asks, and skip late arguments." }
    ];
    let slide = 0;
    const renderHero = () => {
      const item = slides[slide];
      const hero = root.querySelector(".app-hero");
      if (!hero) return;
      hero.innerHTML = `<p class="app-hero__kicker">${item.kicker}</p><h2>${item.title}</h2><p>${item.body}</p>`;
      root.querySelectorAll(".app-dots button").forEach((btn, index) => {
        btn.classList.toggle("is-on", index === slide);
      });
    };
    root.querySelectorAll(".app-dots button").forEach((btn, index) => {
      btn.addEventListener("click", () => {
        slide = index;
        renderHero();
      });
    });
    const hero = root.querySelector(".app-hero");
    if (hero) {
      let startX = 0;
      hero.addEventListener("touchstart", (event) => {
        startX = event.changedTouches[0]?.clientX || 0;
      }, { passive: true });
      hero.addEventListener("touchend", (event) => {
        const x = event.changedTouches[0]?.clientX || 0;
        if (x - startX > 40) slide = (slide + slides.length - 1) % slides.length;
        else if (startX - x > 40) slide = (slide + 1) % slides.length;
        renderHero();
      });
    }
    renderHero();
    loadChartPayload()
      .then((payload) => {
        const snap = payload ? dashaSnapshot(payload) : null;
        const planet = snap?.current?.antardashaName || snap?.current?.mahadashaName || "venus";
        slides[0].body = copyForPlanet(planet).hero;
        renderHero();
      })
      .catch(() => {});

    const astroHost = root.querySelector("#app-astrologers");
    if (astroHost) {
      const name = AC?.ASTROLOGER_NAME || "Ravi Ranjan";
      const rate = AC?.ASTROLOGER_CALL_RATE_INR_PER_MIN || 21;
      astroHost.innerHTML = `<button type="button" class="app-astro-card" id="app-astro-main">
        <span class="app-astro-orb">${initials(name)}</span>
        <strong>${name}</strong>
        <span>₹${rate}/min</span>
      </button>`;
      astroHost.querySelector("#app-astro-main")?.addEventListener("click", () => handleCallOrAsk("call"));
      if (AUTH?.fetchWalletInfo) {
        AUTH.fetchWalletInfo()
          .then((info) => {
            const astro = info?.astrologer;
            if (!astro) return;
            const n = astro.name || name;
            const r = astro.call_rate_inr_per_min || rate;
            astroHost.innerHTML = `<button type="button" class="app-astro-card" id="app-astro-main">
              <span class="app-astro-orb">${initials(n)}</span>
              <strong>${n}</strong>
              <span>₹${r}/min</span>
            </button>`;
            astroHost.querySelector("#app-astro-main")?.addEventListener("click", () => handleCallOrAsk("call"));
          })
          .catch(() => {});
      }
    }
  }

  function fillGuidance(payload) {
    const snap = payload ? dashaSnapshot(payload) : null;
    const current = snap?.current || {};
    const maha = dashaPlanetLabel(current.mahadashaName);
    const antar = dashaPlanetLabel(current.antardashaName);
    const prat = dashaPlanetLabel(current.pratyantardashaName);
    const until = snap?.nextChangeDate ? formatDateLabel(snap.nextChangeDate) : "—";
    const copy = copyForPlanet(antar || maha);
    return { snap, maha, antar, prat, until, copy };
  }

  async function initDasha() {
    const root = document.getElementById("app-dasha");
    if (!root) return;
    const host = root.querySelector("#app-dasha-body");
    if (!host) return;
    host.innerHTML = `<p class="app-empty">Loading your dasha…</p>`;
    try {
      const payload = await loadChartPayload();
      if (!payload) {
        host.innerHTML = needChartHtml();
        return;
      }
      const g = fillGuidance(payload);
      const moonRow = (payload.planets_table || []).find((row) => planetKey(row.planet) === "moon");
      const moonSign = moonRow?.house_rashi || moonRow?.rashi || "";
      const activeBits = [
        moonSign ? `Moon in ${moonSign}` : "",
        g.maha ? `${g.maha} mahadasha` : "",
        g.antar ? `${g.antar} antardasha` : "",
        g.prat ? `${g.prat} pratyantar` : ""
      ].filter(Boolean);
      const activeLead = activeBits.length ? `${activeBits.join(" • ")}.` : "Open a kundali to compute dasha.";
      host.innerHTML = `
        <div class="app-stat-grid">
          <div class="app-stat"><small>Mahadasha</small><strong>${g.maha || "—"}</strong></div>
          <div class="app-stat"><small>Antardasha</small><strong>${g.antar || "—"}</strong></div>
          <div class="app-stat"><small>Pratyantardasha</small><strong>${g.prat || "—"}</strong></div>
          <div class="app-stat"><small>Until</small><strong>${g.until}</strong></div>
        </div>
        <div class="app-accordion">
          <div class="app-acc-item">
            <button type="button" class="app-acc-btn" data-acc="1" aria-expanded="true">Current Active planets ${ICONS.up}</button>
            <div class="app-acc-body">${activeLead} ${g.copy.hero}</div>
          </div>
          <div class="app-acc-item">
            <button type="button" class="app-acc-btn" data-acc="0" aria-expanded="false">Next dasha change ${ICONS.down}</button>
            <div class="app-acc-body" hidden>${
              g.until !== "—"
                ? `Next change around ${g.until}. Keep routines steady until then.`
                : "Next dasha date appears after a kundali is generated."
            }</div>
          </div>
        </div>
      `;
      bindAccordions(host);
    } catch (err) {
      host.innerHTML = `<p class="app-empty">${err.message || "Could not load dasha."} <a href="${screenHref("kundali")}">Open kundali</a>.</p>`;
    }
  }

  async function initHoroscope() {
    const root = document.getElementById("app-horoscope");
    if (!root) return;
    const host = root.querySelector("#app-horoscope-body");
    if (!host) return;
    host.innerHTML = `<p class="app-empty">Loading today’s horoscope…</p>`;
    try {
      const payload = await loadChartPayload();
      if (!payload) {
        host.innerHTML = needChartHtml();
        return;
      }
      const g = fillGuidance(payload);
      host.innerHTML = `
        <article class="app-hero">
          <p class="app-hero__kicker">${formatLongDate(new Date())}</p>
          <h2>Today’s horoscope for you</h2>
          <p>${g.copy.hero}</p>
        </article>
        <div class="app-accordion" style="margin-top:0.9rem">
          <div class="app-acc-item">
            <button type="button" class="app-acc-btn" aria-expanded="true">Why this matters today ${ICONS.up}</button>
            <div class="app-acc-body">${g.copy.why}</div>
          </div>
          <div class="app-acc-item">
            <button type="button" class="app-acc-btn" aria-expanded="false">Simple action ${ICONS.down}</button>
            <div class="app-acc-body" hidden>${g.copy.action}</div>
          </div>
        </div>
      `;
      bindAccordions(host);
    } catch (err) {
      host.innerHTML = `<p class="app-empty">${err.message || "Could not load horoscope."}</p>`;
    }
  }

  async function initDosDont() {
    const root = document.getElementById("app-dos");
    if (!root) return;
    const host = root.querySelector("#app-dos-body");
    if (!host) return;
    let copy = PLANET_COPY.venus;
    try {
      const payload = await loadChartPayload();
      if (payload) copy = fillGuidance(payload).copy;
    } catch {
      /* keep default copy */
    }
    host.innerHTML = `
      <article class="app-guide-card app-guide-card--do">
        <h3>Do's</h3>
        <ul>${copy.dos.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
      <article class="app-guide-card app-guide-card--dont">
        <h3>Don't</h3>
        <ul>${copy.dont.map((item) => `<li>${item}</li>`).join("")}</ul>
      </article>
    `;
  }

  function bindAccordions(root) {
    root.querySelectorAll(".app-acc-item").forEach((item) => {
      const btn = item.querySelector(".app-acc-btn");
      const body = item.querySelector(".app-acc-body");
      if (!btn || !body) return;
      const label = btn.childNodes[0] ? String(btn.childNodes[0].textContent || btn.textContent).trim() : btn.textContent.trim();
      const title = label.replace(/\s+/g, " ").replace(/Current Active planets.*$/, "Current Active planets").replace(/Next dasha change.*$/, "Next dasha change").replace(/Why this matters today.*$/, "Why this matters today").replace(/Simple action.*$/, "Simple action");
      const sync = () => {
        const open = !body.hidden;
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.innerHTML = `${title} ${open ? ICONS.up : ICONS.down}`;
      };
      sync();
      btn.addEventListener("click", () => {
        body.hidden = !body.hidden;
        sync();
      });
    });
  }

  function enhanceKundaliForm() {
    const form = document.getElementById("birth-form");
    if (!form) return;
    applyKundaliChooserMode();
    const tabOpen = document.getElementById("tab-open-kundali");
    const tabNew = document.getElementById("tab-new-kundali");
    if (tabOpen) tabOpen.textContent = "Open kundali";
    if (tabNew) tabNew.textContent = "New kundali";
    const submit = form.querySelector("#submit-btn");
    if (submit) submit.textContent = "SHOW";
    const nameInput = document.getElementById("birth-name");
    if (nameInput) nameInput.placeholder = "Enter Name";

    const wrapIcon = (field, svg) => {
      if (!field || field.classList.contains("native-field-row")) return;
      field.classList.add("native-field-row");
      field.insertAdjacentHTML("afterbegin", svg);
    };
    wrapIcon(document.getElementById("birth-name-wrap"), icon("person"));
    wrapIcon(document.getElementById("open-kundali-wrap"), icon("person"));
    const dateField = document.getElementById("birth-date")?.closest(".form-field");
    const timeField = document.getElementById("birth-time")?.closest(".form-field");
    if (dateField && timeField && !form.querySelector(".native-datetime")) {
      const row = document.createElement("div");
      row.className = "native-field-row";
      row.innerHTML = icon("calendar");
      const pair = document.createElement("div");
      pair.className = "native-datetime";
      dateField.parentNode.insertBefore(row, dateField);
      pair.append(dateField, timeField);
      row.appendChild(pair);
    }
    wrapIcon(document.getElementById("place-preset")?.closest(".form-field"), icon("pin"));

    if (!form.querySelector(".native-gender")) {
      const gender = document.createElement("div");
      gender.className = "form-field native-only native-field-row";
      gender.innerHTML = `${icon("people")}<div class="native-gender" role="group" aria-label="Gender">
        <button type="button" data-gender="male">Male</button>
        <button type="button" data-gender="female">Female</button>
      </div>`;
      const actions = form.querySelector(".form-field--actions") || form.querySelector(".form-field--submit");
      form.insertBefore(gender, actions);
      const saved = localStorage.getItem(GENDER_KEY) || "male";
      gender.querySelectorAll("button").forEach((btn) => {
        btn.classList.toggle("is-on", btn.getAttribute("data-gender") === saved);
        btn.addEventListener("click", () => {
          localStorage.setItem(GENDER_KEY, btn.getAttribute("data-gender") || "male");
          gender.querySelectorAll("button").forEach((other) => other.classList.toggle("is-on", other === btn));
        });
      });
    }
    if (!form.querySelector(".native-save")) {
      const save = document.createElement("label");
      save.className = "native-save native-only";
      save.innerHTML = `<input type="checkbox" id="native-save-chart" checked /> Save`;
      const actions = form.querySelector(".form-field--actions") || form.querySelector(".form-field--submit");
      form.insertBefore(save, actions);
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("mode") === "open" && global.SaptarishiKundaliPage?.refreshSavedViews) {
      tabOpen?.click();
    }
    if (params.get("compare") === "1") {
      document.getElementById("compare-toggle-btn")?.click();
    }
    bindSavedBirthSelects();
  }

  function bindSavedBirthSelects() {
    ["saved-kundali-select", "saved-birth-select"].forEach((id) => {
      const select = document.getElementById(id);
      if (!select || select.dataset.nativeChartBound === "1") return;
      select.dataset.nativeChartBound = "1";
      select.addEventListener("change", () => {
        const key = String(select.value || "").trim().toLowerCase();
        if (!key) return;
        const view = getBirthViews().find(
          (entry) => String(entry.name || "").trim().toLowerCase() === key
        );
        if (view) setActiveChart(view);
      });
    });
  }

  function houseGridHtml() {
    return HOUSES.map(
      (house, index) => `<button type="button" class="feature-tile${index === 0 ? " feature-tile--active" : ""}" data-house="${house.n}">
        <span class="feature-tile__icon">${icon(house.icon)}</span>
        <strong>${house.label}</strong>
      </button>`
    ).join("");
  }

  function bindHouseGrid(grid) {
    if (!grid) return;
    grid.querySelectorAll(".feature-tile").forEach((tile) => {
      tile.addEventListener("click", () => {
        grid.querySelectorAll(".feature-tile").forEach((other) => other.classList.toggle("feature-tile--active", other === tile));
        pickHouseOnChart(tile.getAttribute("data-house"));
      });
    });
  }

  function pickHouseOnChart(house) {
    const results = document.getElementById("results");
    if (results && !results.hidden) {
      document.getElementById("house-planets-tiles")?.querySelector(`[data-house="${house}"]`)?.click();
      results.scrollIntoView({ block: "start", behavior: "smooth" });
      return;
    }
    const chart = getActiveChart();
    if (!chart) {
      window.location.href = `${pageHref("kundali.html")}?mode=new#app=kundali`;
      return;
    }
    const openTab = document.getElementById("tab-open-birth") || document.getElementById("tab-open-kundali");
    if (openTab) openTab.click();
    const select = document.getElementById("saved-birth-select") || document.getElementById("saved-kundali-select");
    if (select) {
      const key = String(chart.name || "").trim().toLowerCase();
      if (key) select.value = key;
      select.dispatchEvent(new Event("change"));
    }
    document.getElementById("submit-btn")?.click();
  }

  function enhanceRemedy() {
    if (livePage() !== "remedy" || document.getElementById("auspicious-options-view")) return;
    const shell = document.getElementById("saptarishi");
    if (!shell || document.getElementById("app-remedy-grid")) return;
    document.querySelectorAll(
      "#saptarishi > p.lead, .kundali-tabs, #remedy-form, .privacy-collect-note"
    ).forEach((el) => {
      el.hidden = true;
    });
    const wrap = document.createElement("div");
    wrap.id = "app-remedy-grid";
    wrap.innerHTML = `<span class="app-kicker">Support</span><h1 class="app-title">Remedy</h1><p class="app-lead">Choose a house area for planet and ritual remedies.</p>
      <div class="app-house-grid auspicious-grid">${houseGridHtml()}</div>`;
    const form = document.getElementById("remedy-form");
    if (form) form.before(wrap);
    else shell.insertBefore(wrap, shell.firstChild);
    bindHouseGrid(wrap.querySelector(".app-house-grid"));
  }

  function enhanceKundaliHouses() {
    if (livePage() !== "kundali" || document.getElementById("auspicious-options-view")) return;
    const form = document.getElementById("birth-form");
    const results = document.getElementById("results");
    if (!form || document.getElementById("app-kundali-houses")) return;
    const wrap = document.createElement("div");
    wrap.id = "app-kundali-houses";
    wrap.innerHTML = `<h2 class="app-title" style="font-size:1.35rem">Houses</h2>
      <p class="app-lead">Choose a house area to open that part of the kundali.</p>
      <div class="app-house-grid auspicious-grid">${houseGridHtml()}</div>`;
    if (results) results.parentNode.insertBefore(wrap, results);
    else form.after(wrap);
    bindHouseGrid(wrap.querySelector(".app-house-grid"));
  }

  function enhanceAuspicious() {
    if (livePage() !== "auspicious") return;
    const options = document.getElementById("auspicious-options-view");
    if (!options || options.querySelector(".app-title")) return;
    const heading = document.createElement("header");
    heading.innerHTML = `<span class="app-kicker">Muhurat</span><h1 class="app-title">Auspicious</h1><p class="app-lead">Choose what you need timing for — same way people ask an astrologer.</p>`;
    options.insertBefore(heading, options.firstChild);
    const muhuratTiles = options.querySelectorAll(".auspicious-grid .feature-tile[data-option]");
    const first = muhuratTiles[0] || options.querySelector(".feature-tile[data-option]");
    if (first) first.classList.add("feature-tile--active");
    muhuratTiles.forEach((tile) => {
      tile.addEventListener("click", () => {
        muhuratTiles.forEach((other) => other.classList.remove("feature-tile--active"));
        tile.classList.add("feature-tile--active");
      });
    });
  }

  function hookKundaliPersist() {
    const view = global.SaptarishiKundaliView;
    if (!view || view.__nativePersistHooked) return;
    if (typeof view.renderIntoPage !== "function") return;
    const original = view.renderIntoPage;
    view.renderIntoPage = function nativePersist(payload, targets) {
      const birth = getActiveChart() || global.SaptarishiKundaliPage?.getMainBirthInput?.();
      rememberChartPayload(payload, birth);
      if (birth?.name && birth?.date) setActiveChart(birth);
      const rendered = original.call(this, payload, targets);
      if (document.body.classList.contains("app-kundali-new")) {
        document.body.classList.remove("app-kundali-new");
        document.getElementById("app-kundali-empty")?.remove();
        const query = new URLSearchParams(window.location.search);
        if (query.get("mode") === "new") {
          query.delete("mode");
          const search = query.toString();
          window.history.replaceState(
            {},
            "",
            `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash || "#app=kundali"}`
          );
        }
      }
      return rendered;
    };
    view.__nativePersistHooked = true;
  }

  function injectAppScreens() {
    if (livePage() !== "kundali") return;
    const shell = document.getElementById("saptarishi");
    if (!shell || document.getElementById("app-home")) return;
    const home = document.createElement("div");
    home.id = "app-home";
    home.className = "app-screen";
    home.innerHTML = `
      <article class="app-hero" aria-label="Daily horoscope"></article>
      <div class="app-dots" role="tablist" aria-label="Horoscope slides">
        <button type="button" class="is-on" aria-label="Slide 1"></button>
        <button type="button" aria-label="Slide 2"></button>
        <button type="button" aria-label="Slide 3"></button>
        <button type="button" aria-label="Slide 4"></button>
        <button type="button" aria-label="Slide 5"></button>
      </div>
      <div class="app-service-grid">
        <a class="app-service app-service--dark" data-app-screen="kundali" href="${screenHref("kundali")}">
          <svg viewBox="0 0 24 24"><path d="M12 3.5 13.2 8.2 18 7.4 14.4 11 18 14.8l-4.8-.8L12 20.5l-1.2-6.5-4.8.8L9.6 11 6 7.4l4.8.8z"/></svg>
          <strong>Kundali</strong>
          <span>Open birth chart</span>
        </a>
        <a class="app-service" href="${pageHref("remedy.html")}">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M8 12h8M12 8c2 1.4 2 6.6 0 8-2-1.4-2-6.6 0-8z"/></svg>
          <strong>Remedy</strong>
          <span>Planet support</span>
        </a>
        <a class="app-service" href="${pageHref("auspicious.html")}">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7.2"/><path d="M12 8.2v4.1l2.6 1.7"/></svg>
          <strong>Auspicious</strong>
          <span>Best birth time</span>
        </a>
        <a class="app-service" href="${pageHref("kundali.html")}?compare=1#app=kundali">
          <svg viewBox="0 0 24 24"><path d="M12 19.5S5.5 14.8 5.5 10.2A3.5 3.5 0 0 1 12 8.2a3.5 3.5 0 0 1 6.5 2c0 4.6-6.5 9.3-6.5 9.3z"/></svg>
          <strong>Kundali Matching</strong>
          <span>Compatibility check</span>
        </a>
        <a class="app-service app-service--wide" href="${pageHref("kundali.html")}?compare=1#app=kundali">
          <svg viewBox="0 0 24 24"><path d="M7 8h11l-2.4-2.4"/><path d="M17 16H6l2.4 2.4"/></svg>
          <strong>Kundali Compare</strong>
          <span>2 or more births</span>
        </a>
      </div>
      <div class="app-section-head">
        <h2>Astrologers</h2>
        <a class="app-more" href="${pageHref("profile.html")}" aria-label="Astrologers"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg></a>
      </div>
      <div class="app-astrologers" id="app-astrologers"></div>
    `;
    const dasha = document.createElement("div");
    dasha.id = "app-dasha";
    dasha.className = "app-screen";
    dasha.innerHTML = `<span class="app-kicker">Timing</span><h1 class="app-title">Dasha</h1><p class="app-lead">Your current planetary periods and what they mean for today.</p><div id="app-dasha-body"></div>`;
    const horoscope = document.createElement("div");
    horoscope.id = "app-horoscope";
    horoscope.className = "app-screen";
    horoscope.innerHTML = `<span class="app-kicker">Daily guidance</span><h1 class="app-title">Horoscope</h1><p class="app-lead">Today’s horoscope for you — based on your chart and current dasha.</p><div id="app-horoscope-body"></div>`;
    const dos = document.createElement("div");
    dos.id = "app-dos";
    dos.className = "app-screen";
    dos.innerHTML = `<span class="app-kicker">Guidance</span><h1 class="app-title">Do's & Don't</h1><p class="app-lead">Practical yes and no for today’s planetary mood.</p><div id="app-dos-body"></div>`;
    shell.prepend(home, dasha, horoscope, dos);
    home.querySelectorAll("[data-app-screen]").forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        goScreen(el.getAttribute("data-app-screen"));
      });
    });
  }

  function overlayScreens() {
    return ["home", "dasha", "horoscope", "dos"];
  }

  function applyScreen(page) {
    document.body.className = document.body.className
      .split(/\s+/)
      .filter((cls) => cls && !cls.startsWith("app-page--"))
      .join(" ");
    document.body.classList.add("app-native", `app-page--${page}`);
    const overlay = overlayScreens().includes(page);
    document.body.classList.toggle("app-overlay-on", overlay && livePage() === "kundali");
    document.querySelectorAll(".app-screen").forEach((el) => {
      const id = el.id.replace(/^app-/, "").replace(/^horoscope$/, "horoscope");
      const name = el.id === "app-home" ? "home" : el.id === "app-dasha" ? "dasha" : el.id === "app-horoscope" ? "horoscope" : el.id === "app-dos" ? "dos" : "";
      el.classList.toggle("is-on", overlay && name === page);
    });
    document.querySelectorAll(".app-tab[data-app-screen]").forEach((tab) => {
      tab.classList.toggle("is-on", tab.getAttribute("data-app-screen") === page);
    });
  }

  function goScreen(screen) {
    const name = String(screen || "home");
    if (overlayScreens().includes(name) || name === "kundali") {
      if (livePage() !== "kundali") {
        window.location.href = screenHref(name);
        return;
      }
      const hash = `#app=${name}`;
      if (window.location.hash !== hash) {
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}${hash}`);
      }
      applyScreen(name);
      if (name === "dasha") initDasha();
      if (name === "horoscope") initHoroscope();
      if (name === "dos") initDosDont();
      if (name === "kundali") openKundaliDetails();
      return;
    }
    window.location.href = pageHref(`${name}.html`);
  }

  function boot() {
    ensureFonts();
    ensureNativeCss();
    document.body.classList.add("app-native");
    stripHouseGridsOffAuspicious();
    if (livePage() === "kundali") injectAppScreens();
    const page = currentPage();
    applyScreen(page);
    rebuildHeader();
    mountDock();
    mountDrawer();
    mountProfiles();
    enhanceKundaliForm();
    bindSavedBirthSelects();
    enhanceKundaliHouses();
    enhanceRemedy();
    enhanceAuspicious();
    stripHouseGridsOffAuspicious();
    hookKundaliPersist();
    initHome();
    fillSupportContacts();
    if (page === "dasha") initDasha();
    if (page === "horoscope") initHoroscope();
    if (page === "dos") initDosDont();
    if (page === "kundali") openKundaliDetails();
    window.addEventListener("hashchange", () => {
      const next = currentPage();
      applyScreen(next);
      if (next === "kundali") openKundaliDetails();
    });
  }

  function start() {
    boot();
    global.addEventListener("saptarishi-native-chart-changed", () => {
      refreshHeaderAuth();
      if (!document.getElementById("app-drawer")?.hidden) renderDrawer();
      if (currentPage() === "kundali") openKundaliDetails();
    });
    global.addEventListener("saptarishi-auth-changed", () => {
      refreshHeaderAuth();
      if (!document.getElementById("app-drawer")?.hidden) renderDrawer();
      if (!document.getElementById("app-sheet-mask")?.hidden) renderProfiles();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(start, 0));
  } else {
    setTimeout(start, 0);
  }

  function handleBack() {
    const visible = (el) => el && !el.hidden;
    if (global.SaptarishiAuthModal && global.SaptarishiAuthModal.dismiss && global.SaptarishiAuthModal.dismiss()) {
      return true;
    }
    const authOverlay = document.getElementById("auth-modal-overlay");
    if (visible(authOverlay) && global.SaptarishiAuthModal && global.SaptarishiAuthModal.hide) {
      global.SaptarishiAuthModal.hide();
      return true;
    }
    if (global.SaptarishiWalletModal && global.SaptarishiWalletModal.isOpen && global.SaptarishiWalletModal.isOpen()) {
      global.SaptarishiWalletModal.close(false);
      return true;
    }
    if (global.SaptarishiPremiumModal && global.SaptarishiPremiumModal.isOpen && global.SaptarishiPremiumModal.isOpen()) {
      global.SaptarishiPremiumModal.close(false);
      return true;
    }
    const zoom = document.getElementById("kundali-chart-zoom-overlay");
    if (visible(zoom)) {
      zoom.remove();
      return true;
    }
    const coupon = document.getElementById("send-coupon-overlay");
    if (visible(coupon)) {
      coupon.hidden = true;
      document.body.classList.remove("send-coupon-open");
      return true;
    }
    const sheet = document.getElementById("app-sheet-mask");
    if (visible(sheet)) {
      closeProfiles();
      return true;
    }
    const drawer = document.getElementById("app-drawer");
    if (visible(drawer)) {
      closeDrawer();
      return true;
    }
    const range = document.getElementById("auspicious-range-view");
    const backBtn = document.getElementById("auspicious-back-btn");
    if (visible(range) && backBtn) {
      backBtn.click();
      return true;
    }
    const page = currentPage();
    if (overlayScreens().includes(page) && page !== "home") {
      goScreen("home");
      return true;
    }
    if (livePage() === "kundali" && page === "kundali") {
      goScreen("home");
      return true;
    }
    return false;
  }

  global.SaptarishiNativeApp = {
    pageHref,
    getActiveChart,
    setActiveChart,
    rememberChartPayload,
    lastChartPayload,
    loadChartPayload,
    handleBack
  };
})(window);

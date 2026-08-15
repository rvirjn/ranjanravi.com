// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Login, registration, guest id, and API fetch for Saptarishi. */

(function authModule(global) {
  const STORAGE_TOKEN = "saptarishi_auth_token";
  const STORAGE_USER = "saptarishi_user";
  const STORAGE_USAGE = "saptarishi_usage";
  const STORAGE_GUEST = "saptarishi_guest_id";
  const STORAGE_VIEW_COUNT = "saptarishi_view_count";
  const STORAGE_KUNDALI_CACHE = "saptarishi_kundali_cache";
  const STORAGE_AUSPICIOUS_CACHE = "saptarishi_auspicious_cache";
  const STORAGE_VIEW_RECORDED = "saptarishi_view_recorded_session";
  const SCAN_CACHE_MAX_ENTRIES = 5;

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AC) return;

  function normalizeUsage(usage) {
    if (!usage || typeof usage !== "object") return usage;
    if (usage.is_premium) {
      const tier = usage.premium_tier || "unlimited";
      if (tier === "pack_299") {
        const limit = Number(AC.PREMIUM_PACK_QUERY_LIMIT) || 6;
        const used = Number(usage.queries_used) || 0;
        const remaining = Math.max(0, limit - used);
        return {
          ...usage,
          is_premium: true,
          premium_tier: "pack_299",
          remedy_unlocked: remaining > 0 || Boolean(usage.remedy_unlocked),
          query_limit: limit,
          queries_used: used,
          queries_remaining: remaining,
          kundali_limit: limit,
          auspicious_limit: limit,
          kundali_remaining: remaining,
          auspicious_remaining: remaining
        };
      }
      return {
        ...usage,
        is_premium: true,
        premium_tier: "unlimited",
        remedy_unlocked: true,
        premium_expires_at: usage.premium_expires_at || null,
        kundali_limit: null,
        auspicious_limit: null,
        kundali_remaining: null,
        auspicious_remaining: null,
        query_limit: null,
        queries_used: null,
        queries_remaining: null
      };
    }
    // Only treat explicit logged-in sessions as unlimited (API sets is_guest: false).
    if (usage.is_guest === false) {
      // Logged-in non-premium: unlimited scans; remedies unlock with Premium.
      return {
        ...usage,
        is_guest: false,
        is_premium: false,
        remedy_unlocked: Boolean(usage.remedy_unlocked),
        queries_used: null,
        query_limit: null,
        queries_remaining: null,
        kundali_limit: null,
        auspicious_limit: null,
        kundali_remaining: null,
        auspicious_remaining: null,
        kundali_used: Number(usage.kundali_used) || 0,
        auspicious_used: Number(usage.auspicious_used) || 0
      };
    }
    const limit = AC.MAX_FREE_QUERIES_PER_GUEST;
    const kUsed = Number(usage.kundali_used) || 0;
    const aUsed = Number(usage.auspicious_used) || 0;
    const totalUsed =
      usage.queries_used != null ? Number(usage.queries_used) : kUsed + aUsed;
    const remaining = Math.max(
      0,
      usage.queries_remaining != null
        ? Number(usage.queries_remaining)
        : limit - totalUsed
    );
    return {
      ...usage,
      is_guest: true,
      remedy_unlocked: false,
      queries_used: totalUsed,
      query_limit: usage.query_limit ?? limit,
      queries_remaining: remaining,
      kundali_limit: limit,
      auspicious_limit: limit,
      kundali_remaining: remaining,
      auspicious_remaining: remaining
    };
  }

  function isLocalDevUi() {
    const host = window.location.hostname;
    return (
      window.location.protocol === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  }

  function apiOrigin() {
    if (isLocalDevUi()) {
      return `http://localhost:${AC.FLASK_PORT}`;
    }
    return String(AC.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  function getGuestId() {
    let id = localStorage.getItem(STORAGE_GUEST);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? `g_${crypto.randomUUID()}`
          : `g_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(STORAGE_GUEST, id);
    }
    return id;
  }

  /** Persist login like a native app (survives app restart / WebView recycle). */
  function migrateLegacySessionStorage() {
    try {
      const token = sessionStorage.getItem(STORAGE_TOKEN);
      if (token && !localStorage.getItem(STORAGE_TOKEN)) {
        localStorage.setItem(STORAGE_TOKEN, token);
      }
      const user = sessionStorage.getItem(STORAGE_USER);
      if (user && !localStorage.getItem(STORAGE_USER)) {
        localStorage.setItem(STORAGE_USER, user);
      }
      const usage = sessionStorage.getItem(STORAGE_USAGE);
      if (usage && !localStorage.getItem(STORAGE_USAGE)) {
        localStorage.setItem(STORAGE_USAGE, usage);
      }
      sessionStorage.removeItem(STORAGE_TOKEN);
      sessionStorage.removeItem(STORAGE_USER);
      sessionStorage.removeItem(STORAGE_USAGE);
    } catch {
      /* ignore quota / private mode */
    }
  }

  migrateLegacySessionStorage();

  function getToken() {
    return localStorage.getItem(STORAGE_TOKEN) || sessionStorage.getItem(STORAGE_TOKEN) || "";
  }

  function getUser() {
    try {
      const raw =
        localStorage.getItem(STORAGE_USER) || sessionStorage.getItem(STORAGE_USER);
      return raw ? normalizeUsage(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function getUsage() {
    const user = getUser();
    if (user) return user;
    try {
      const raw =
        localStorage.getItem(STORAGE_USAGE) || sessionStorage.getItem(STORAGE_USAGE);
      return raw ? normalizeUsage(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function setUsage(usage) {
    if (!usage) return;
    const normalized = normalizeUsage(usage);
    if (normalized.is_guest) {
      localStorage.setItem(STORAGE_USAGE, JSON.stringify(normalized));
      sessionStorage.removeItem(STORAGE_USAGE);
    } else {
      localStorage.removeItem(STORAGE_USAGE);
      sessionStorage.removeItem(STORAGE_USAGE);
      setSession(getToken(), normalized);
    }
  }

  function setSession(token, user) {
    if (token) {
      localStorage.setItem(STORAGE_TOKEN, token);
      sessionStorage.removeItem(STORAGE_TOKEN);
    }
    if (user) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(normalizeUsage(user)));
      sessionStorage.removeItem(STORAGE_USER);
    }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
    localStorage.removeItem(STORAGE_USAGE);
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
    sessionStorage.removeItem(STORAGE_USAGE);
  }

  async function parseJsonResponse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      if (response.status === 404) {
        throw new Error(
          `API route not found (HTTP 404). Deploy the latest Saptarishi API — ${response.url || "premium endpoint missing"}.`
        );
      }
      throw new Error(
        `API returned HTML (HTTP ${response.status}). Restart Flask on port ${AC.FLASK_PORT}.`
      );
    }
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    headers[AC.GUEST_ID_HEADER] = getGuestId();
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    let response;
    try {
      response = await fetch(`${apiOrigin()}${path}`, {
        ...options,
        headers
      });
    } catch (err) {
      const origin = apiOrigin();
      const hint = isLocalDevUi()
        ? `Cannot reach API at ${origin}. Start Flask on port ${AC.FLASK_PORT}.`
        : `Cannot reach API at ${origin}. Check your connection, or wait if the API was just updated.`;
      throw new Error(err?.message === "Failed to fetch" ? hint : err.message || hint);
    }
    const payload = await parseJsonResponse(response);
    if (!response.ok) {
      const err = new Error(payload.error || `HTTP ${response.status}`);
      err.status = response.status;
      err.payload = payload;
      err.premiumRequired = Boolean(payload.premium_required);
      throw err;
    }
    return payload;
  }

  function loginPagePath() {
    const C =
      typeof SAPTARISHI_CONSTANTS !== "undefined"
        ? SAPTARISHI_CONSTANTS
        : global.SAPTARISHI_CONSTANTS;
    const map = C && C.PAGE_FILE_TO_PATH;
    const base = (map && map["kundali.html"]) || "/kundali";
    return `${base}?auth=login`;
  }

  function requireAuth() {
    return Boolean(getToken());
  }

  async function ensureAuth(options = {}) {
    if (getToken()) return true;
    if (global.SaptarishiAuthModal) {
      await global.SaptarishiAuthModal.open({
        tab: options.tab || "login",
        required: options.required !== false,
        reason: options.reason || "premium",
        message: options.message
      });
      return Boolean(getToken());
    }
    return false;
  }

  async function refreshMe() {
    const tokenAtStart = getToken();
    if (!tokenAtStart) {
      return fetchUsage();
    }
    const payload = await apiFetch(AC.API_AUTH_ME_PATH);
    if (getToken() !== tokenAtStart) {
      return { user: getUser(), usage: getUsage() };
    }
    if (payload.user) setSession(getToken(), payload.user);
    if (payload.usage) setUsage(payload.usage);
    return payload;
  }

  async function fetchUsage() {
    if (!getToken()) {
      const cached = getUsage();
      if (cached && cached.query_limit != null) {
        return { usage: cached };
      }
    }
    try {
      const payload = await apiFetch(AC.API_USAGE_PATH);
      if (payload.usage) setUsage(payload.usage);
      return payload;
    } catch {
      return { usage: getUsage() };
    }
  }

  async function login(mobile, password) {
    const payload = await apiFetch(AC.API_AUTH_LOGIN_PATH, {
      method: "POST",
      body: JSON.stringify({ mobile, password })
    });
    setSession(payload.token, payload.user);
    if (payload.user) setUsage(payload.user);
    return payload;
  }

  async function register(name, mobile, email, password, confirmPassword) {
    const payload = await apiFetch(AC.API_AUTH_REGISTER_PATH, {
      method: "POST",
      body: JSON.stringify({
        name,
        mobile,
        email,
        password,
        confirm_password: confirmPassword
      })
    });
    setSession(payload.token, payload.user);
    if (payload.user) setUsage(payload.user);
    return payload;
  }

  async function fetchProfile() {
    return apiFetch(AC.API_AUTH_PROFILE_PATH);
  }

  async function updateProfile(name, mobile, email) {
    const payload = await apiFetch(AC.API_AUTH_PROFILE_UPDATE_PATH, {
      method: "POST",
      body: JSON.stringify({ name, mobile, email })
    });
    if (payload.user) setSession(getToken(), payload.user);
    if (payload.usage) setUsage(payload.usage);
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: getUser(), usage: getUsage() }
      })
    );
    return payload;
  }

  async function updatePassword(currentPassword, newPassword, confirmPassword) {
    return apiFetch(AC.API_AUTH_PASSWORD_UPDATE_PATH, {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      })
    });
  }

  async function forgotPassword(mobile, email) {
    return apiFetch(AC.API_AUTH_PASSWORD_FORGOT_PATH, {
      method: "POST",
      body: JSON.stringify({ mobile, email })
    });
  }

  async function deleteAccount(password) {
    const payload = await apiFetch(AC.API_AUTH_ACCOUNT_DELETE_PATH, {
      method: "POST",
      body: JSON.stringify({ password })
    });
    clearSession();
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: null, usage: null }
      })
    );
    return payload;
  }

  function isAdmin(userOrUsage) {
    const src = userOrUsage || getUsage() || getUser() || {};
    const type = String(src.user_type || "").trim().toLowerCase();
    return type === (AC.USER_TYPE_ADMIN || "admin");
  }

  async function fetchDbUsers() {
    return apiFetch(AC.API_DB_USERS_PATH);
  }

  async function fetchDbWallet() {
    return apiFetch(AC.API_DB_WALLET_PATH);
  }

  async function sendDbCoupon({ id, name, amount_inr, coupon_code }) {
    return apiFetch(AC.API_DB_SEND_COUPON_PATH, {
      method: "POST",
      body: JSON.stringify({
        id: id || "",
        name: name || "",
        amount_inr,
        coupon_code: coupon_code || ""
      })
    });
  }

  async function logout() {
    const token = getToken();
    clearSession();
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: null, usage: null }
      })
    );
    if (!token) return;
    try {
      await fetch(`${apiOrigin()}${AC.API_AUTH_LOGOUT_PATH}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      /* session already cleared locally */
    }
  }

  function getCachedViewCount() {
    const raw = localStorage.getItem(STORAGE_VIEW_COUNT);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function cacheViewCount(count) {
    if (count != null && Number.isFinite(Number(count))) {
      localStorage.setItem(STORAGE_VIEW_COUNT, String(count));
    }
  }

  /** Fetch current total from API (GET). */
  async function fetchSiteViewCount() {
    const path = AC.API_SITE_VIEW_PATH;
    const url = `${apiOrigin()}${path}`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer =
      controller && window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: controller ? controller.signal : undefined
      });
      const payload = await parseJsonResponse(response);
      if (response.ok && payload.view_count != null) {
        cacheViewCount(payload.view_count);
        return payload;
      }
    } catch {
      /* fall through */
    } finally {
      if (timer) window.clearTimeout(timer);
    }
    return { view_count: getCachedViewCount() };
  }

  /** Count once per browser session; always refresh display from GET. */
  async function recordSiteView() {
    if (sessionStorage.getItem(STORAGE_VIEW_RECORDED)) {
      return fetchSiteViewCount();
    }
    const path = AC.API_SITE_VIEW_PATH;
    const url = `${apiOrigin()}${path}`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer =
      controller && window.setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: controller ? controller.signal : undefined
      });
      const payload = await parseJsonResponse(response);
      if (response.ok && payload.view_count != null) {
        sessionStorage.setItem(STORAGE_VIEW_RECORDED, "1");
        cacheViewCount(payload.view_count);
        return payload;
      }
    } catch {
      /* fall through to GET */
    } finally {
      if (timer) window.clearTimeout(timer);
    }
    return fetchSiteViewCount();
  }

  function hasUnlimitedPremium() {
    const usage = normalizeUsage(getUsage());
    if (!usage?.is_premium || usage.premium_tier === "pack_299") return false;
    if (usage.premium_expires_at) {
      const expires = new Date(usage.premium_expires_at);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() <= Date.now()) {
        return false;
      }
    }
    return true;
  }

  function isPremiumActive() {
    const usage = normalizeUsage(getUsage());
    if (!usage?.is_premium) return false;
    if (usage.premium_tier === "pack_299") {
      return (Number(usage.queries_remaining) || 0) > 0;
    }
    return hasUnlimitedPremium();
  }

  function isGuestScanLimitReached(scanType) {
    const usage = normalizeUsage(getUsage());
    if (usage?.is_premium) {
      if (usage.premium_tier === "pack_299") {
        return (Number(usage.queries_remaining) || 0) <= 0;
      }
      return false;
    }
    if (requireAuth()) return false;
    if (!usage) return false;
    const remaining = usage.queries_remaining;
    return remaining != null && Number(remaining) <= 0;
  }

  function buildScanCacheKey(parts) {
    return parts.map((part) => String(part || "").trim().toLowerCase()).join("|");
  }

  function readScanCache(storageKey) {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function getCachedScanResult(storageKey, cacheKey) {
    const cache = readScanCache(storageKey);
    return cache[cacheKey] || null;
  }

  function setCachedScanResult(storageKey, cacheKey, payload) {
    try {
      const cache = readScanCache(storageKey);
      delete cache[cacheKey];
      const next = { [cacheKey]: payload, ...cache };
      const keys = Object.keys(next);
      while (keys.length > SCAN_CACHE_MAX_ENTRIES) {
        delete next[keys.pop()];
      }
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
  }

  function createLimitError() {
    const usage = normalizeUsage(getUsage());
    let message;
    if (usage?.is_premium && usage.premium_tier === "pack_299") {
      const limit = Number(usage.query_limit) || Number(AC.PREMIUM_PACK_QUERY_LIMIT) || 6;
      const used = Number(usage.queries_used);
      const usedLabel = Number.isFinite(used) && used > 0 ? used : limit;
      message =
        `Paid query limit reached (${usedLabel} of ${limit} scans used). ` +
        "Upgrade to Unlimited for unlimited kundali and auspicious scans.";
    } else {
      const limit = AC.MAX_FREE_QUERIES_PER_GUEST || AC.MAX_FREE_QUERIES_PER_USER || 2;
      message =
        `Free query limit reached (${limit} queries per device). ` +
        "Sign in for unlimited scans. Buy Premium to unlock remedy details.";
    }
    const err = new Error(message);
    err.premiumRequired = true;
    err.status = 403;
    return err;
  }

  async function fetchKundali(path, date, time, place, name) {
    const cacheKey = buildScanCacheKey([date, time, place, name || ""]);
    if (isGuestScanLimitReached("kundali")) {
      const cached = getCachedScanResult(STORAGE_KUNDALI_CACHE, cacheKey);
      if (cached) return cached;
      throw createLimitError();
    }
    const payload = await apiFetch(path);
    updateUserFromApiPayload(payload);
    if (!requireAuth() && !isPremiumActive()) {
      setCachedScanResult(STORAGE_KUNDALI_CACHE, cacheKey, payload);
    }
    return payload;
  }

  async function fetchAuspicious(path, dateFrom, dateTo, place) {
    const cacheKey = buildScanCacheKey([dateFrom, dateTo, place]);
    if (isGuestScanLimitReached("auspicious")) {
      const cached = getCachedScanResult(STORAGE_AUSPICIOUS_CACHE, cacheKey);
      if (cached) return cached;
      throw createLimitError();
    }
    const payload = await apiFetch(path);
    updateUserFromApiPayload(payload);
    if (!requireAuth() && !isPremiumActive()) {
      setCachedScanResult(STORAGE_AUSPICIOUS_CACHE, cacheKey, payload);
    }
    return payload;
  }

  function updateUserFromApiPayload(payload) {
    if (payload && payload.user) {
      setSession(getToken(), payload.user);
      setUsage(payload.user);
    } else if (payload && payload.usage) {
      setUsage(payload.usage);
    }
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: getUser(), usage: getUsage() }
      })
    );
  }

  async function activatePremium(couponCode) {
    const payload = await apiFetch(AC.API_PREMIUM_ACTIVATE_PATH, {
      method: "POST",
      body: JSON.stringify({ coupon_code: couponCode })
    });
    if (payload.user) setSession(getToken(), payload.user);
    if (payload.usage) setUsage(payload.usage);
    global.dispatchEvent(
      new CustomEvent("saptarishi-auth-changed", {
        detail: { user: getUser(), usage: getUsage() }
      })
    );
    return payload;
  }

  async function fetchWalletInfo() {
    return apiFetch(AC.API_WALLET_PATH);
  }

  async function activateWalletTopup(couponCode) {
    const payload = await apiFetch(AC.API_WALLET_PATH, {
      method: "POST",
      body: JSON.stringify({
        action: "topup",
        coupon_code: String(couponCode || "").trim()
      })
    });
    updateUserFromApiPayload(payload);
    return payload;
  }

  async function buyPremiumWithWallet(planId) {
    const payload = await apiFetch(AC.API_WALLET_PATH, {
      method: "POST",
      body: JSON.stringify({
        action: "buy_premium",
        plan_id: String(planId || "").trim()
      })
    });
    updateUserFromApiPayload(payload);
    return payload;
  }

  async function chargeWalletForService(service, minutes) {
    const payload = await apiFetch(AC.API_WALLET_PATH, {
      method: "POST",
      body: JSON.stringify({
        action: "charge",
        service: String(service || "").trim(),
        minutes: minutes == null ? 1 : minutes
      })
    });
    updateUserFromApiPayload(payload);
    return payload;
  }

  async function openWalletFlow(options = {}) {
    if (!getToken()) {
      const ok = await ensureAuth({
        tab: options.tab || "login",
        required: true,
        message: options.message || "Sign in to manage your wallet."
      });
      if (!ok) return false;
    }
    const modal = global.SaptarishiWalletModal;
    if (!modal || !modal.open) {
      throw new Error("Wallet modal is not available.");
    }
    return modal.open(options);
  }

  async function openPremiumFlow(options = {}) {
    if (!getToken()) {
      const authed = await ensureAuth({
        tab: options.tab || "login",
        required: options.required !== false,
        reason: "premium",
        message:
          options.loginMessage ||
          "Sign in or register, then buy Premium from your wallet balance."
      });
      if (!authed) return false;
    }
    if (hasUnlimitedPremium()) {
      if (global.SaptarishiPremiumModal) {
        await global.SaptarishiPremiumModal.open({
          message: "Unlimited plan is already active on your account."
        });
      }
      return true;
    }
    if (global.SaptarishiPremiumModal) {
      const usage = normalizeUsage(getUsage());
      const upgradeMessage =
        usage?.premium_tier === "pack_299"
          ? "Upgrade to Unlimited using your wallet balance."
          : options.message;
      await global.SaptarishiPremiumModal.open({
        message: upgradeMessage,
        selectedPlanId: usage?.premium_tier === "pack_299" ? "unlimited" : options.selectedPlanId
      });
      return hasUnlimitedPremium() || isPremiumActive();
    }
    return false;
  }

  function getDefaultBirth(usage) {
    const u = usage || getUsage() || getUser();
    if (!u || typeof u !== "object") return null;
    const views = u.birth_views;
    const latestFromViews =
      Array.isArray(views) && views.length ? parseBirthViewLabel(views[0]) : null;
    const direct = u.default_birth;
    if (direct && direct.date) {
      return {
        name:
          String(direct.name || "").trim() || String(latestFromViews?.name || "").trim(),
        date: String(direct.date || "").trim(),
        time: String(direct.time || "").trim() || String(latestFromViews?.time || "").trim(),
        place:
          String(direct.place || "").trim() || String(latestFromViews?.place || "").trim()
      };
    }
    return latestFromViews;
  }

  function getBirthViews(usage) {
    const u = usage || getUsage() || getUser();
    if (!u || typeof u !== "object" || !Array.isArray(u.birth_views)) return [];
    const seen = new Set();
    const out = [];
    u.birth_views
      .map((entry) => parseBirthViewLabel(entry))
      .filter((entry) => entry && entry.date && entry.name)
      .forEach((entry) => {
        const key = String(entry.name || "")
          .trim()
          .toLowerCase();
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(entry);
      });
    return out;
  }

  /** Stable select value for a saved birth: name is the unique identifier. */
  function birthViewKey(view) {
    if (!view || typeof view !== "object") return "";
    return String(view.name || "")
      .trim()
      .toLowerCase();
  }

  function getWalletBalance(usage) {
    const u = usage || getUsage() || getUser();
    if (!u || typeof u !== "object") return 0;
    const value = Number(u.wallet_balance_inr);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function getWalletCreditedTotal(usage) {
    const u = usage || getUsage() || getUser();
    if (!u || typeof u !== "object") return 0;
    const value = Number(u.wallet_credited_total_inr);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  }

  function parseBirthViewLabel(label) {
    if (label && typeof label === "object" && !Array.isArray(label)) {
      const date = String(label.date || "").trim();
      if (!date) return null;
      return {
        name: String(label.name || "").trim(),
        date,
        time: String(label.time || "").trim(),
        place: String(label.place || "").trim()
      };
    }
    const text = String(label || "").trim();
    if (!text) return null;
    let name = "";
    let rest = text;
    const dot = text.indexOf(" · ");
    if (dot >= 0) {
      name = text.slice(0, dot).trim();
      rest = text.slice(dot + 3).trim();
    }
    let place = "";
    let dtPart = rest;
    const pipe = rest.lastIndexOf(" | ");
    if (pipe >= 0) {
      dtPart = rest.slice(0, pipe).trim();
      place = rest.slice(pipe + 3).trim();
    }
    const chunks = dtPart.split(/\s+/);
    if (!chunks.length) return null;
    const date = chunks[0];
    const time = chunks.length > 1 ? chunks.slice(1).join(" ") : "";
    return { name, date, time, place };
  }

  /** Prefill birth form from latest saved birth (logged-in users). */
  function applyDefaultBirthToForm(elements, defaultBirth) {
    if (!defaultBirth || !defaultBirth.date) return false;
    const {
      placePreset,
      placeCustom,
      customWrap,
      birthDate,
      birthTime,
      birthName,
      placeCustomValue
    } = elements || {};
    const customVal = placeCustomValue || AC.PLACE_CUSTOM_VALUE;
    let applied = false;

    if (birthName && defaultBirth.name != null) {
      birthName.value = String(defaultBirth.name || "").trim();
      applied = true;
    }
    if (birthDate && defaultBirth.date) {
      birthDate.value = defaultBirth.date;
      applied = true;
    }
    if (birthTime && defaultBirth.time) {
      birthTime.value = defaultBirth.time;
      applied = true;
    }
    if (placePreset && defaultBirth.place) {
      const place = String(defaultBirth.place).trim();
      let matched = false;
      for (const opt of placePreset.options) {
        if (opt.value && opt.value === place) {
          placePreset.value = place;
          matched = true;
          break;
        }
      }
      if (!matched) {
        placePreset.value = customVal;
        if (placeCustom) placeCustom.value = place;
      }
      if (customWrap) {
        customWrap.hidden = placePreset.value !== customVal;
      }
      applied = true;
    }
    return applied;
  }

  async function refreshDefaultBirthForm(elements) {
    if (!getToken() || !elements) return null;
    try {
      await refreshMe();
    } catch {
      /* use cached session */
    }
    const def = getDefaultBirth(getUsage());
    if (def) applyDefaultBirthToForm(elements, def);
    return def;
  }

  async function handlePremiumRequired(err, options = {}) {
    if (!err || (!err.premiumRequired && err.status !== 403)) return false;
    await openPremiumFlow({
      tab: options.tab || "login",
      required: true,
      message:
        err.message ||
        options.message ||
        "Your scan limit is used. Add money to your wallet, then buy a Premium plan."
    });
    return true;
  }

  global.SaptarishiAuth = {
    apiOrigin,
    apiFetch,
    getGuestId,
    getToken,
    getUser,
    getUsage,
    setSession,
    setUsage,
    clearSession,
    requireAuth,
    ensureAuth,
    refreshMe,
    fetchUsage,
    login,
    register,
    fetchProfile,
    updateProfile,
    updatePassword,
    forgotPassword,
    deleteAccount,
    isAdmin,
    fetchDbUsers,
    fetchDbWallet,
    sendDbCoupon,
    logout,
    recordSiteView,
    getCachedViewCount,
    cacheViewCount,
    isGuestScanLimitReached,
    fetchKundali,
    fetchAuspicious,
    updateUserFromApiPayload,
    normalizeUsage,
    hasUnlimitedPremium,
    isPremiumActive,
    activatePremium,
    fetchWalletInfo,
    activateWalletTopup,
    buyPremiumWithWallet,
    chargeWalletForService,
    openWalletFlow,
    openPremiumFlow,
    handlePremiumRequired,
    getDefaultBirth,
    getBirthViews,
    birthViewKey,
    getWalletBalance,
    getWalletCreditedTotal,
    parseBirthViewLabel,
    applyDefaultBirthToForm,
    refreshDefaultBirthForm,
    loginPagePath,
    isLocalDevUi
  };
})(window);

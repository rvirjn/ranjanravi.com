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
      if (tier === "pack_50") {
        const limit = Number(usage.query_limit) || AC.PREMIUM_PACK_QUERY_LIMIT;
        const used = Number(usage.queries_used) || 0;
        const remaining = Math.max(
          0,
          usage.queries_remaining != null ? Number(usage.queries_remaining) : limit - used
        );
        return {
          ...usage,
          is_premium: true,
          premium_tier: "pack_50",
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
    const isGuest = Boolean(usage.is_guest);
    const limit = isGuest
      ? AC.MAX_FREE_QUERIES_PER_GUEST
      : AC.MAX_FREE_QUERIES_PER_USER;
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

  function getToken() {
    return sessionStorage.getItem(STORAGE_TOKEN) || "";
  }

  function getUser() {
    try {
      const raw = sessionStorage.getItem(STORAGE_USER);
      return raw ? normalizeUsage(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function getUsage() {
    const user = getUser();
    if (user) return user;
    try {
      const raw = sessionStorage.getItem(STORAGE_USAGE);
      return raw ? normalizeUsage(JSON.parse(raw)) : null;
    } catch {
      return null;
    }
  }

  function setUsage(usage) {
    if (!usage) return;
    const normalized = normalizeUsage(usage);
    if (normalized.is_guest) {
      sessionStorage.setItem(STORAGE_USAGE, JSON.stringify(normalized));
    } else {
      sessionStorage.removeItem(STORAGE_USAGE);
      setSession(getToken(), normalized);
    }
  }

  function setSession(token, user) {
    if (token) sessionStorage.setItem(STORAGE_TOKEN, token);
    if (user) sessionStorage.setItem(STORAGE_USER, JSON.stringify(normalizeUsage(user)));
  }

  function clearSession() {
    sessionStorage.removeItem(STORAGE_TOKEN);
    sessionStorage.removeItem(STORAGE_USER);
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

  /** Count once per browser session; GET uses cached count only. */
  async function recordSiteView() {
    if (sessionStorage.getItem(STORAGE_VIEW_RECORDED)) {
      return { view_count: getCachedViewCount() };
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
      /* fall through to cache */
    } finally {
      if (timer) window.clearTimeout(timer);
    }
    return { view_count: getCachedViewCount() };
  }

  function hasUnlimitedPremium() {
    const usage = normalizeUsage(getUsage());
    if (!usage?.is_premium || usage.premium_tier === "pack_50") return false;
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
    if (usage.premium_tier === "pack_50") {
      return (Number(usage.queries_remaining) || 0) > 0;
    }
    return hasUnlimitedPremium();
  }

  function isGuestScanLimitReached(scanType) {
    const usage = normalizeUsage(getUsage());
    if (usage?.is_premium) {
      if (usage.premium_tier === "pack_50") {
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
    const limit = AC.MAX_FREE_QUERIES_PER_GUEST || AC.MAX_FREE_QUERIES_PER_USER || 2;
    const message = `Free query limit reached (${limit} queries per device).`;
    const err = new Error(message);
    err.premiumRequired = true;
    err.status = 403;
    return err;
  }

  async function fetchKundali(path, date, time, place) {
    const cacheKey = buildScanCacheKey([date, time, place]);
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

  async function openPremiumFlow(options = {}) {
    if (!getToken()) {
      const authed = await ensureAuth({
        tab: options.tab || "login",
        required: options.required !== false,
        reason: "premium",
        message:
          options.loginMessage ||
          "Sign in or register, then scan the QR and enter your coupon code to unlock Premium."
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
        usage?.premium_tier === "pack_50"
          ? "Upgrade to Unlimited (₹1899 for 1 month) for unlimited kundali and auspicious scans."
          : options.message;
      await global.SaptarishiPremiumModal.open({
        message: upgradeMessage,
        selectedPlanId: usage?.premium_tier === "pack_50" ? "unlimited" : options.selectedPlanId
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
        date: String(direct.date || "").trim(),
        time: String(direct.time || "").trim() || String(latestFromViews?.time || "").trim(),
        place:
          String(direct.place || "").trim() || String(latestFromViews?.place || "").trim()
      };
    }
    return latestFromViews;
  }

  function parseBirthViewLabel(label) {
    const text = String(label || "").trim();
    if (!text) return null;
    let place = "";
    let dtPart = text;
    const pipe = text.lastIndexOf(" | ");
    if (pipe >= 0) {
      dtPart = text.slice(0, pipe).trim();
      place = text.slice(pipe + 3).trim();
    }
    const chunks = dtPart.split(/\s+/);
    if (!chunks.length) return null;
    const date = chunks[0];
    const time = chunks.length > 1 ? chunks.slice(1).join(" ") : "";
    return { date, time, place };
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
      placeCustomValue
    } = elements || {};
    const customVal = placeCustomValue || AC.PLACE_CUSTOM_VALUE;
    let applied = false;

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
        "Your scan limit is used. Choose ₹299 for 6 queries or ₹1899 for unlimited access."
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
    openPremiumFlow,
    handlePremiumRequired,
    getDefaultBirth,
    parseBirthViewLabel,
    applyDefaultBirthToForm,
    refreshDefaultBirthForm,
    loginPagePath,
    isLocalDevUi
  };
})(window);

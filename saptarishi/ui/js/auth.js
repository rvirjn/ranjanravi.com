// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Login, registration, guest id, and API fetch for Saptarishi. */

(function authModule(global) {
  const STORAGE_TOKEN = "saptarishi_auth_token";
  const STORAGE_USER = "saptarishi_user";
  const STORAGE_USAGE = "saptarishi_usage";
  const STORAGE_GUEST = "saptarishi_guest_id";
  const STORAGE_VIEW_COUNT = "saptarishi_view_count";

  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
    FLASK_PORT: 8081,
    PRODUCTION_API_ORIGIN: "https://api.ranjanravi.com",
    API_AUTH_LOGIN_PATH: "/api/auth/login",
    API_AUTH_REGISTER_PATH: "/api/auth/register",
    API_AUTH_LOGOUT_PATH: "/api/auth/logout",
    API_AUTH_ME_PATH: "/api/auth/me",
    API_USAGE_PATH: "/api/usage",
    API_SITE_VIEW_PATH: "/api/site/view",
    GUEST_ID_HEADER: "X-Guest-Id",
    MAX_KUNDALI_PER_USER: 5,
    MAX_KUNDALI_PER_GUEST: 5,
    MAX_AUSPICIOUS_PER_USER: 2,
    MAX_AUSPICIOUS_PER_GUEST: 2
  };

  function normalizeUsage(usage) {
    if (!usage || typeof usage !== "object") return usage;
    const isGuest = Boolean(usage.is_guest);
    const kLimit = isGuest ? (AC.MAX_KUNDALI_PER_GUEST ?? 5) : (AC.MAX_KUNDALI_PER_USER ?? 5);
    const aLimit = isGuest
      ? (AC.MAX_AUSPICIOUS_PER_GUEST ?? 2)
      : (AC.MAX_AUSPICIOUS_PER_USER ?? 2);
    const kUsed = Number(usage.kundali_used) || 0;
    const aUsed = Number(usage.auspicious_used) || 0;
    return {
      ...usage,
      kundali_limit: kLimit,
      auspicious_limit: aLimit,
      kundali_remaining: Math.max(0, kLimit - kUsed),
      auspicious_remaining: Math.max(0, aLimit - aUsed)
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
    return String(AC.PRODUCTION_API_ORIGIN || "https://api.ranjanravi.com").replace(
      /\/$/,
      ""
    );
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
      throw new Error(
        `API returned HTML (HTTP ${response.status}). Restart Flask on port ${AC.FLASK_PORT}.`
      );
    }
  }

  async function apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      headers[AC.GUEST_ID_HEADER || "X-Guest-Id"] = getGuestId();
    }
    if (options.body && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${apiOrigin()}${path}`, {
      ...options,
      headers
    });
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
    const base = window.location.pathname.replace(/\/[^/]+$/, "");
    return `${base}/kundali.html?auth=login`;
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
    if (!getToken()) {
      return fetchUsage();
    }
    const payload = await apiFetch(AC.API_AUTH_ME_PATH);
    if (payload.user) setSession(getToken(), payload.user);
    if (payload.usage) setUsage(payload.usage);
    return payload;
  }

  async function fetchUsage() {
    try {
      const payload = await apiFetch(AC.API_USAGE_PATH || "/api/usage");
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

  async function register(name, mobile, email, password) {
    const payload = await apiFetch(AC.API_AUTH_REGISTER_PATH, {
      method: "POST",
      body: JSON.stringify({ name, mobile, email, password })
    });
    setSession(payload.token, payload.user);
    if (payload.user) setUsage(payload.user);
    return payload;
  }

  async function logout() {
    try {
      await apiFetch(AC.API_AUTH_LOGOUT_PATH, { method: "POST" });
    } catch {
      /* ignore */
    }
    clearSession();
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

  /** Count every visit; no login or guest id required. */
  async function recordSiteView() {
    const path = AC.API_SITE_VIEW_PATH || "/api/site/view";
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

  async function handlePremiumRequired(err, options = {}) {
    if (!err || (!err.premiumRequired && err.status !== 403)) return false;
    await ensureAuth({
      tab: options.tab || "login",
      required: true,
      reason: "premium",
      message: err.message || options.message
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
    logout,
    recordSiteView,
    getCachedViewCount,
    cacheViewCount,
    updateUserFromApiPayload,
    normalizeUsage,
    handlePremiumRequired,
    loginPagePath,
    isLocalDevUi
  };
})(window);

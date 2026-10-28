const MPS = (() => {
  const SESSION_KEY = "school_session";

  function session() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    } catch (e) {
      return null;
    }
  }

  function saveSession(data) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  async function request(method, path, data) {
    const current = session();
    const headers = { Accept: "application/json" };
    if (data !== undefined) headers["Content-Type"] = "application/json";
    if (current && current.token) headers.Authorization = "Bearer " + current.token;

    let response;
    try {
      response = await fetch(MPS_CONFIG.API_BASE + path, {
        method,
        headers,
        body: data !== undefined ? JSON.stringify(data) : undefined,
      });
    } catch (e) {
      throw new Error("Cannot reach the school server. Check your internet connection and try again.");
    }

    let json = {};
    try {
      json = await response.json();
    } catch (e) {
      json = {};
    }

    if (response.status === 401 && current && current.token && path !== "/auth/login") {
      clearSession();
      location.replace("login.html?expired=1");
      throw new Error(json.error || "Session expired");
    }
    if (!response.ok) {
      throw new Error(json.error || "Request failed (" + response.status + ")");
    }
    return json;
  }

  return {
    session,
    saveSession,
    clearSession,
    get: (path) => request("GET", path),
    post: (path, data) => request("POST", path, data || {}),
    del: (path) => request("DELETE", path),
  };
})();

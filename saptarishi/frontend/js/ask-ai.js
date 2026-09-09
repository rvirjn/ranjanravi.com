// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/**
 * Corner Ask AI chat widget — logged-in users only.
 * POSTs to Flask /api/ask (Groq key stays on server).
 */
(function askAiWidget(global) {
  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  if (!AC) return;

  const AUTH = global.SaptarishiAuth;
  const UTILS = global.SaptarishiCommonUtils;
  const MAX_Q = Number(AC.ASK_AI_MAX_QUESTION_LENGTH) || 800;

  function displayFirstName() {
    const raw =
      (AUTH && typeof AUTH.getUser === "function" && AUTH.getUser()?.name) || "";
    const name = String(raw).trim();
    if (!name) return "";
    return name.split(/\s+/)[0];
  }

  function welcomeMessage() {
    const name = displayFirstName();
    if (name) {
      return `Hi ${name}, welcome - ask our AI about your kundali.`;
    }
    return "Hi, welcome - ask our AI about your kundali.";
  }

  function isLoggedIn() {
    return Boolean(AUTH && AUTH.getToken && AUTH.getToken());
  }

  function apiOrigin() {
    if (UTILS && typeof UTILS.getApiOrigin === "function") {
      return UTILS.getApiOrigin(AC);
    }
    if (AUTH && typeof AUTH.apiOrigin === "function") {
      return AUTH.apiOrigin();
    }
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || window.location.protocol === "file:") {
      return `http://localhost:${AC.FLASK_PORT}`;
    }
    return String(AC.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  const ASK_AI_MOBILE_CSS_ID = "ask-ai-mobile-css";

  function ensureMobileAskAiCss() {
    if (document.getElementById(ASK_AI_MOBILE_CSS_ID)) return;
    const style = document.createElement("style");
    style.id = ASK_AI_MOBILE_CSS_ID;
    style.textContent = `
      @media (max-width: 720px) {
        .ask-ai.ask-ai--open {
          position: fixed !important;
          top: var(--ask-ai-vv-top, 0px) !important;
          left: 0 !important;
          right: 0 !important;
          bottom: auto !important;
          width: 100% !important;
          height: var(--ask-ai-vv-height, 100dvh) !important;
          max-height: none !important;
          display: flex !important;
          flex-direction: column !important;
          z-index: 1300 !important;
          background: var(--color-bg-page, #fffdf8) !important;
        }
        .ask-ai.ask-ai--open .ask-ai__panel {
          flex: 1 1 auto !important;
          display: grid !important;
          grid-template-rows: auto minmax(0, 1fr) auto !important;
          width: 100% !important;
          height: 100% !important;
          min-height: 0 !important;
          max-height: none !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
        .ask-ai.ask-ai--open .ask-ai__log {
          min-height: 0 !important;
          height: auto !important;
          overflow-x: hidden !important;
          overflow-y: scroll !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          touch-action: pan-y !important;
        }
        .ask-ai.ask-ai--open .ask-ai__form {
          flex-shrink: 0 !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function scrollLogToEnd(log) {
    if (!log) return;
    const pin = () => {
      log.scrollTop = Math.max(0, log.scrollHeight - log.clientHeight);
    };
    pin();
    requestAnimationFrame(pin);
  }

  function appendBubble(log, role, text) {
    const row = document.createElement("div");
    row.className = `ask-ai__bubble ask-ai__bubble--${role}`;
    row.textContent = text;
    log.appendChild(row);
    scrollLogToEnd(log);
  }

  function getCurrentBirthDetails() {
    const page = window.SaptarishiKundaliPage;
    if (page && typeof page.getMainBirthInput === "function") {
      const input = page.getMainBirthInput();
      if (input && input.date && input.time && input.place) return input;
    }
    if (AUTH && typeof AUTH.getDefaultBirth === "function") {
      return AUTH.getDefaultBirth() || null;
    }
    return null;
  }

  async function postAsk(question) {
    const payload = { question: question.slice(0, MAX_Q) };
    const birth = getCurrentBirthDetails();
    if (birth) {
      payload.birth_details = {
        name: birth.name || "",
        date: birth.date || "",
        time: birth.time || "",
        place: birth.place || "",
      };
    }
    const body = JSON.stringify(payload);
    if (AUTH && typeof AUTH.apiFetch === "function") {
      return AUTH.apiFetch(AC.API_ASK_PATH, {
        method: "POST",
        body,
      });
    }
    const headers = { "Content-Type": "application/json" };
    const token = AUTH && AUTH.getToken ? AUTH.getToken() : "";
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${apiOrigin()}${AC.API_ASK_PATH}`, {
      method: "POST",
      headers,
      body,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || "Ask AI is unavailable right now.");
      err.status = res.status;
      throw err;
    }
    return data;
  }

  async function sendQuestion(question, log, input, sendBtn) {
    const trimmed = question.trim();
    if (!trimmed) return;

    if (!isLoggedIn()) {
      syncVisibility();
      return;
    }

    appendBubble(log, "user", trimmed);
    input.value = "";
    sendBtn.disabled = true;
    input.disabled = true;
    appendBubble(log, "status", "Thinking…");

    try {
      const data = await postAsk(trimmed);
      const status = log.querySelector(".ask-ai__bubble--status:last-child");
      if (status) status.remove();
      appendBubble(log, "assistant", data.answer || "(no answer)");
    } catch (err) {
      const status = log.querySelector(".ask-ai__bubble--status:last-child");
      if (status) status.remove();
      if (err && err.status === 401) {
        appendBubble(log, "error", "Please log in to use Ask AI.");
        if (AUTH && AUTH.clearSession) AUTH.clearSession();
        syncVisibility();
        return;
      }
      appendBubble(
        log,
        "error",
        (err && err.message) ||
          "Could not reach the API. Is the Flask server running with GROQ_API_KEY set?"
      );
    } finally {
      sendBtn.disabled = false;
      input.disabled = false;
      if (isLoggedIn()) input.focus();
    }
  }

  function syncVisibility() {
    const root = document.getElementById("ask-ai-root");
    if (!root) return;
    const loggedIn = isLoggedIn();
    root.hidden = !loggedIn;
    if (!loggedIn) {
      const panel = root.querySelector("#ask-ai-panel");
      const fab = root.querySelector("#ask-ai-fab");
      if (panel) panel.hidden = true;
      if (fab) {
        fab.hidden = false;
        fab.setAttribute("aria-expanded", "false");
      }
      root.style.position = "";
      root.style.inset = "";
      root.style.width = "";
      root.style.height = "";
      root.style.display = "";
      root.style.flexDirection = "";
      root.style.zIndex = "";
      root.classList.remove("ask-ai--open");
      document.documentElement.classList.remove("ask-ai-lock");
      if (document.body) document.body.classList.remove("ask-ai-open");
      root.style.removeProperty("--ask-ai-vv-top");
      root.style.removeProperty("--ask-ai-vv-height");
      try {
        if (global.SaptarishiAndroid && SaptarishiAndroid.setPullToRefreshEnabled) {
          SaptarishiAndroid.setPullToRefreshEnabled(true);
        }
      } catch (_) {}
    }
  }

  function mount() {
    if (document.getElementById("ask-ai-root")) {
      syncVisibility();
      return;
    }

    const root = document.createElement("div");
    root.id = "ask-ai-root";
    root.className = "ask-ai";
    root.hidden = !isLoggedIn();
    root.innerHTML = `
      <button type="button" class="ask-ai__fab" id="ask-ai-fab" aria-expanded="false" aria-controls="ask-ai-panel">
        Ask AI
      </button>
      <div id="ask-ai-panel" class="ask-ai__panel" hidden>
        <header class="ask-ai__header">
          <button type="button" class="ask-ai__close" id="ask-ai-close" aria-label="Close Ask AI">
            <span class="ask-ai__close-mark ask-ai__close-mark--back" aria-hidden="true">‹</span>
            <span class="ask-ai__close-mark ask-ai__close-mark--x" aria-hidden="true">×</span>
          </button>
          <p class="ask-ai__title">Ask AI</p>
        </header>
        <div class="ask-ai__log" id="ask-ai-log" role="log" aria-live="polite"></div>
        <form class="ask-ai__form" id="ask-ai-form">
          <label class="ask-ai__sr-only" for="ask-ai-input">Your question</label>
          <textarea
            id="ask-ai-input"
            class="ask-ai__input"
            rows="2"
            maxlength="${MAX_Q}"
            placeholder="version v16"
          ></textarea>
          <button type="submit" class="ask-ai__send" id="ask-ai-send" aria-label="Send" title="Send">
            <svg class="ask-ai__send-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M3.2 21.2 22 12 3.2 2.8l-.2 7.1L15 12 3 14.1z"/>
            </svg>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(root);

    const fab = root.querySelector("#ask-ai-fab");
    const panel = root.querySelector("#ask-ai-panel");
    const closeBtn = root.querySelector("#ask-ai-close");
    const form = root.querySelector("#ask-ai-form");
    const input = root.querySelector("#ask-ai-input");
    const sendBtn = root.querySelector("#ask-ai-send");
    const log = root.querySelector("#ask-ai-log");

    function isMobileScreen() {
      return (
        window.matchMedia("(max-width: 720px)").matches ||
        document.documentElement.classList.contains("saptarishi-native-app")
      );
    }

    function setPageLocked(locked) {
      const html = document.documentElement;
      const body = document.body;
      if (html) html.classList.toggle("ask-ai-lock", locked);
      if (body) body.classList.toggle("ask-ai-open", locked);
      try {
        if (global.SaptarishiAndroid && SaptarishiAndroid.setPullToRefreshEnabled) {
          SaptarishiAndroid.setPullToRefreshEnabled(!locked);
        }
      } catch (_) {}
    }

    function fitMobileViewport() {
      if (!root.classList.contains("ask-ai--open") || !isMobileScreen()) {
        root.style.removeProperty("--ask-ai-vv-top");
        root.style.removeProperty("--ask-ai-vv-height");
        return;
      }
      const vv = window.visualViewport;
      const height = Math.max(240, Math.round((vv && vv.height) || window.innerHeight || 0));
      const top = Math.max(0, Math.round((vv && vv.offsetTop) || 0));
      root.style.setProperty("--ask-ai-vv-top", `${top}px`);
      root.style.setProperty("--ask-ai-vv-height", `${height}px`);
    }

    function setOpen(open) {
      if (open && !isLoggedIn()) {
        syncVisibility();
        return;
      }
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      fab.hidden = open;
      root.classList.toggle("ask-ai--open", open);
      closeBtn.setAttribute("aria-label", isMobileScreen() ? "Back" : "Close Ask AI");
      if (!open) {
        setPageLocked(false);
        fitMobileViewport();
        return;
      }
      ensureMobileAskAiCss();
      setPageLocked(true);
      if (!log.dataset.greeted) {
        appendBubble(log, "assistant", welcomeMessage());
        log.dataset.greeted = "1";
      }
      fitMobileViewport();
      scrollLogToEnd(log);
      if (!isMobileScreen()) {
        input.focus({ preventScroll: true });
      }
      window.setTimeout(() => {
        fitMobileViewport();
        scrollLogToEnd(log);
      }, 280);
    }

    fab.addEventListener("click", () => setOpen(true));
    closeBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      sendQuestion(input.value, log, input, sendBtn);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });

    global.addEventListener("saptarishi-auth-changed", syncVisibility);

    function onViewportChange() {
      if (!root.classList.contains("ask-ai--open")) return;
      fitMobileViewport();
    }
    ensureMobileAskAiCss();
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onViewportChange);
      window.visualViewport.addEventListener("scroll", onViewportChange);
    }
    window.addEventListener("resize", onViewportChange);
    input.addEventListener("focus", () => {
      window.setTimeout(onViewportChange, 300);
    });
    input.addEventListener("blur", () => {
      window.setTimeout(onViewportChange, 200);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  global.SaptarishiAskAi = { mount, syncVisibility };
})(window);

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

  function scrollLogToEnd(log) {
    if (!log) return;
    const pin = () => {
      log.scrollTop = Math.max(0, log.scrollHeight - log.clientHeight);
    };
    pin();
    requestAnimationFrame(() => {
      pin();
      requestAnimationFrame(pin);
    });
    window.setTimeout(pin, 150);
    window.setTimeout(pin, 400);
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
      const body = document.body;
      if (body && body.style.position === "fixed") {
        const y = Number(body.dataset.askAiScroll || 0);
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        delete body.dataset.askAiScroll;
        window.scrollTo(0, y);
      }
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
            placeholder=""
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
      if (!body) return;
      if (locked) {
        const y = window.scrollY || window.pageYOffset || 0;
        body.dataset.askAiScroll = String(y);
        html.classList.add("ask-ai-lock");
        body.style.position = "fixed";
        body.style.top = `-${y}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        return;
      }
      const y = Number(body.dataset.askAiScroll || 0);
      const wasLocked = body.style.position === "fixed";
      html.classList.remove("ask-ai-lock");
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      delete body.dataset.askAiScroll;
      if (wasLocked) window.scrollTo(0, y);
    }

    function applyMobileInlineLayout(open) {
      const mobile = isMobileScreen();
      if (!open || !mobile) {
        root.style.position = "";
        root.style.inset = "";
        root.style.width = "";
        root.style.height = "";
        root.style.display = "";
        root.style.flexDirection = "";
        root.style.zIndex = "";
        panel.style.flex = "";
        panel.style.display = "";
        panel.style.flexDirection = "";
        panel.style.height = "";
        panel.style.minHeight = "";
        panel.style.maxHeight = "";
        log.style.flex = "";
        log.style.height = "";
        log.style.minHeight = "";
        log.style.overflowY = "";
        form.style.flexShrink = "";
        return;
      }
      root.style.position = "fixed";
      root.style.inset = "0";
      root.style.width = "100%";
      root.style.height = "100%";
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.zIndex = "1300";
      panel.style.flex = "1 1 0%";
      panel.style.display = "flex";
      panel.style.flexDirection = "column";
      panel.style.height = "0";
      panel.style.minHeight = "0";
      panel.style.maxHeight = "none";
      log.style.flex = "1 1 0%";
      log.style.height = "0";
      log.style.minHeight = "0";
      log.style.overflowY = "scroll";
      form.style.flexShrink = "0";
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
        applyMobileInlineLayout(false);
        setPageLocked(false);
        return;
      }
      applyMobileInlineLayout(true);
      if (isMobileScreen()) setPageLocked(true);
      else document.documentElement.classList.add("ask-ai-lock");
      if (!log.dataset.greeted) {
        appendBubble(log, "assistant", welcomeMessage());
        log.dataset.greeted = "1";
      }
      scrollLogToEnd(log);
      if (!isMobileScreen()) {
        input.focus({ preventScroll: true });
      }
      window.setTimeout(() => scrollLogToEnd(log), 280);
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

    function onResize() {
      if (!root.classList.contains("ask-ai--open")) return;
      applyMobileInlineLayout(true);
      scrollLogToEnd(log);
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onResize);
    }
    window.addEventListener("resize", onResize);
    input.addEventListener("focus", () => {
      window.setTimeout(() => scrollLogToEnd(log), 300);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  global.SaptarishiAskAi = { mount, syncVisibility };
})(window);

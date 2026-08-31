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

  function privacyHref() {
    if (UTILS && typeof UTILS.privacyPolicyHref === "function") {
      return UTILS.privacyPolicyHref();
    }
    if (AC.PAGE_FILE_TO_PATH && AC.PAGE_FILE_TO_PATH["privacy.html"]) {
      return AC.PAGE_FILE_TO_PATH["privacy.html"];
    }
    return `${AC.DEPLOY_PREFIX || ""}/privacy`;
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

  function appendBubble(log, role, text) {
    const row = document.createElement("div");
    row.className = `ask-ai__bubble ask-ai__bubble--${role}`;
    row.textContent = text;
    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  async function postAsk(question) {
    const body = JSON.stringify({ question: question.slice(0, MAX_Q) });
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
          <div>
            <p class="ask-ai__title">Ask AI</p>
            <p class="ask-ai__subtitle">General Vedic guidance</p>
          </div>
          <button type="button" class="ask-ai__close" id="ask-ai-close" aria-label="Close Ask AI">×</button>
        </header>
        <div class="ask-ai__log" id="ask-ai-log" role="log" aria-live="polite"></div>
        <p class="ask-ai__hint">
          Not a substitute for a personal chart reading.
          Questions are sent to <a href="https://groq.com/" target="_blank" rel="noopener noreferrer">Groq</a>
          to generate answers. See <a href="${privacyHref()}">Privacy Policy</a>.
        </p>
        <form class="ask-ai__form" id="ask-ai-form">
          <label class="ask-ai__sr-only" for="ask-ai-input">Your question</label>
          <textarea
            id="ask-ai-input"
            class="ask-ai__input"
            rows="2"
            maxlength="${MAX_Q}"
            placeholder="e.g. What is Lagna?"
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

    function setOpen(open) {
      if (open && !isLoggedIn()) {
        syncVisibility();
        return;
      }
      panel.hidden = !open;
      fab.setAttribute("aria-expanded", open ? "true" : "false");
      fab.hidden = open;
      if (open) {
        if (!log.dataset.greeted) {
          appendBubble(
            log,
            "assistant",
            "Hi — ask a short astrology question. For a precise chart answer, include birth date, time, and place."
          );
          log.dataset.greeted = "1";
        }
        input.focus();
      }
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }

  global.SaptarishiAskAi = { mount, syncVisibility };
})(window);

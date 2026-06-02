// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Small spinner with elapsed seconds for page status areas. */

(function loadingModule(global) {
  const timers = new WeakMap();

  function startStatusLoadingIndicator(statusEl) {
    if (!statusEl) return;
    stopStatusLoadingIndicator(statusEl);

    const startedAt = Date.now();
    statusEl.hidden = false;
    statusEl.classList.remove("error", "status--limit");
    statusEl.classList.add("status--loading");
    statusEl.textContent = "";
    statusEl.innerHTML = `
      <span class="status-loader" aria-label="Loading">
        <span class="status-loader__ring"></span>
        <span class="status-loader__seconds">0</span>
      </span>
    `;

    const secondsEl = statusEl.querySelector(".status-loader__seconds");
    const tick = () => {
      if (secondsEl) {
        secondsEl.textContent = String(Math.floor((Date.now() - startedAt) / 1000));
      }
    };
    tick();
    const timerId = window.setInterval(tick, 250);
    timers.set(statusEl, timerId);
  }

  function stopStatusLoadingIndicator(statusEl) {
    if (!statusEl) return;
    const timerId = timers.get(statusEl);
    if (timerId != null) {
      window.clearInterval(timerId);
      timers.delete(statusEl);
    }
    statusEl.classList.remove("status--loading");
  }

  // Backward-compatible aliases for existing callers.
  const start = startStatusLoadingIndicator;
  const stop = stopStatusLoadingIndicator;
  global.SaptarishiLoading = {
    startStatusLoadingIndicator,
    stopStatusLoadingIndicator,
    start,
    stop
  };
})(window);


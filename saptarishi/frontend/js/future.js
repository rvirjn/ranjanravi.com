// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Future page: favourable career / marriage / child windows from dasha + transit. */
(function futurePage() {
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  const KV = window.SaptarishiKundaliView || null;
  if (!C) return;

  const optionsView = document.getElementById("future-options-view");
  const detailView = document.getElementById("future-detail-view");
  const dashaSection = document.getElementById("planet-active-dasha-section");
  const dashaSummary = document.getElementById("current-dasha-summary");
  const backBtn = document.getElementById("future-back-btn");
  const selectedTitleEl = document.getElementById("future-selected-title");
  const form = document.getElementById("future-form");
  const statusEl = document.getElementById("status");
  const openBirthStatusEl = document.getElementById("open-birth-status");
  const resultsEl = document.getElementById("results");
  const disclaimerEl = document.getElementById("future-disclaimer");
  const bestEl = document.getElementById("future-best");
  const windowsSection = document.getElementById("future-windows-section");
  const windowsEl = document.getElementById("future-windows");
  const placePreset = document.getElementById("place-preset");
  const customWrap = document.getElementById("custom-place-wrap");
  const placeCustom = document.getElementById("place-custom");
  const birthDate = document.getElementById("birth-date");
  const birthTime = document.getElementById("birth-time");
  const birthName = document.getElementById("birth-name");
  const saveBirth = document.getElementById("save-birth");
  const openBirthWrap = document.getElementById("open-birth-wrap");
  const savedBirthSelect = document.getElementById("saved-birth-select");
  const savedBirthList = document.getElementById("saved-birth-list");
  const savedBirthSearch = document.getElementById("saved-birth-search");
  const newBirthFields = document.getElementById("new-birth-fields");
  const tabOpenBirth = document.getElementById("tab-open-birth");
  const tabNewBirth = document.getElementById("tab-new-birth");

  const EVENT_LABELS = {
    career: "Career",
    marriage: "Marriage",
    child: "Child born"
  };

  let selectedEvent = "";
  let birthMode = "new";
  let birthChooserHidden = false;

  function activeStatusEl() {
    if (birthChooserHidden) return statusEl;
    return birthMode === "open" && openBirthStatusEl ? openBirthStatusEl : statusEl;
  }

  function idleStatusEl() {
    if (birthChooserHidden) return openBirthStatusEl;
    return birthMode === "open" ? statusEl : openBirthStatusEl;
  }

  function showStatus(message, isError, isLimitError) {
    const target = activeStatusEl();
    const other = idleStatusEl();
    if (other && other !== target) {
      if (CU && CU.setStatusMessage) CU.setStatusMessage(other, "");
      else {
        other.textContent = "";
        other.hidden = true;
        other.classList.remove("error", "status--limit", "status--loading");
      }
    }
    if (CU && CU.setStatusMessage) {
      CU.setStatusMessage(target, message, isError, isLimitError);
      return;
    }
    if (!target) return;
    const text = message || "";
    target.textContent = text;
    target.hidden = !text;
    target.classList.toggle("error", Boolean(isError));
    target.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function showLoading() {
    const target = activeStatusEl();
    const other = idleStatusEl();
    if (other && other !== target) {
      if (CU && CU.setStatusMessage) CU.setStatusMessage(other, "");
    }
    if (openBirthWrap) openBirthWrap.classList.toggle("is-loading", birthMode === "open");
    if (CU && CU.startStatusLoading) {
      CU.startStatusLoading(target, showStatus);
      return;
    }
    showStatus("Loading…");
  }

  function getBirthPlace() {
    if (CU && CU.getPlaceFromPresetOrCustom) {
      return CU.getPlaceFromPresetOrCustom(placePreset, placeCustom, C.PLACE_CUSTOM_VALUE);
    }
    if (!placePreset) return "";
    if (placePreset.value === C.PLACE_CUSTOM_VALUE) {
      return (placeCustom && placeCustom.value.trim()) || "";
    }
    return placePreset.value.trim();
  }

  function syncCustomPlaceFieldVisibility() {
    if (CU && CU.syncCustomPlaceVisibility) {
      CU.syncCustomPlaceVisibility(placePreset, customWrap, placeCustom, C.PLACE_CUSTOM_VALUE);
      return;
    }
    const isCustom = placePreset && placePreset.value === C.PLACE_CUSTOM_VALUE;
    if (customWrap) customWrap.hidden = !isCustom;
    if (!isCustom && placeCustom) placeCustom.value = "";
  }

  function shouldSaveBirthDetails() {
    if (birthMode === "open") return false;
    return !saveBirth || saveBirth.checked;
  }

  function validateBirthForm(place) {
    if (birthMode === "open" && savedBirthSelect && !savedBirthSelect.value) {
      return "Select saved birth details.";
    }
    if (CU && CU.validateBirthDetailsInput) {
      return CU.validateBirthDetailsInput({
        requireName: birthMode === "new" && shouldSaveBirthDetails(),
        emptyNameMessage: "Enter a name to save these birth details.",
        name: birthName && birthName.value,
        place,
        date: birthDate && birthDate.value,
        time: birthTime && birthTime.value,
        allowCustom: placePreset && placePreset.value === C.PLACE_CUSTOM_VALUE
      });
    }
    if (!place) return "Select Place.";
    if (!birthDate?.value || !birthTime?.value) return "Select Day, Month, and Year.";
    return null;
  }

  function birthViewOptionLabel(view) {
    if (!view) return "";
    if (view.name) return view.name;
    const when = [view.date, view.time].filter(Boolean).join(" ");
    return when || view.place || "Saved birth details";
  }

  function birthViewSelectKey(view) {
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.openBirthViewKey) {
      return SaptarishiAuth.openBirthViewKey(view);
    }
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.birthViewKey) {
      return SaptarishiAuth.birthViewKey(view);
    }
    return String(view?.name || "")
      .trim()
      .toLowerCase();
  }

  function formatSavedBirthListDate(raw) {
    const value = String(raw || "").trim();
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return value;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[Number(match[2]) - 1] || match[2];
    return `${Number(match[3])}-${month}-${match[1]}`;
  }

  function currentSavedBirthViews() {
    if (typeof SaptarishiAuth === "undefined") return [];
    if (SaptarishiAuth.getOpenBirthViews) return SaptarishiAuth.getOpenBirthViews();
    if (SaptarishiAuth.getBirthViews) return SaptarishiAuth.getBirthViews();
    return [];
  }

  function renderSavedBirthList(views) {
    if (!savedBirthList) return;
    const selected = String(savedBirthSelect?.value || "").trim();
    const query = String(savedBirthSearch?.value || "")
      .trim()
      .toLowerCase();
    const allViews = Array.isArray(views) ? views : [];
    const filtered = query
      ? allViews.filter((view) =>
          [view?.name, view?.date, view?.place, formatSavedBirthListDate(view?.date)]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
        )
      : allViews;
    savedBirthList.replaceChildren();
    if (!allViews.length || !filtered.length) {
      const empty = document.createElement("p");
      empty.className = "birth-open-list__empty";
      empty.textContent = allViews.length ? "No births match that search." : "No saved birth details yet.";
      savedBirthList.appendChild(empty);
      return;
    }
    filtered.forEach((view, index) => {
      const key = birthViewSelectKey(view);
      if (!key) return;
      const row = document.createElement("div");
      row.className = "birth-open-list__row";
      row.setAttribute("role", "option");
      if (key === selected) row.classList.add("is-on");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "birth-open-list__item";
      const avatar = document.createElement("span");
      avatar.className = `birth-open-list__avatar birth-open-list__avatar--${index % 2}`;
      avatar.textContent = String(view.name || "S")
        .trim()
        .slice(0, 2)
        .toUpperCase();
      const text = document.createElement("span");
      text.className = "birth-open-list__text";
      const nameEl = document.createElement("strong");
      nameEl.textContent = birthViewOptionLabel(view);
      const meta = document.createElement("span");
      meta.textContent = [formatSavedBirthListDate(view.date), view.time, view.place]
        .filter(Boolean)
        .join(", ");
      text.append(nameEl, meta);
      btn.append(avatar, text);
      btn.addEventListener("click", () => pickSavedBirth(key));
      row.append(btn);
      savedBirthList.appendChild(row);
    });
  }

  function refreshSavedBirthDropdown() {
    if (!savedBirthSelect || typeof SaptarishiAuth === "undefined") return;
    const views = currentSavedBirthViews();
    const previous = savedBirthSelect.value;
    savedBirthSelect.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = views.length ? "Select saved name…" : "No saved birth details yet";
    savedBirthSelect.appendChild(placeholder);
    views.forEach((view) => {
      const key = birthViewSelectKey(view);
      if (!key) return;
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = birthViewOptionLabel(view);
      savedBirthSelect.appendChild(opt);
    });
    if (previous && [...savedBirthSelect.options].some((opt) => opt.value === previous)) {
      savedBirthSelect.value = previous;
    }
    renderSavedBirthList(views);
  }

  async function loadOpenBirthViews() {
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.ensureOpenBirthViews) {
      try {
        await SaptarishiAuth.ensureOpenBirthViews({ refresh: true });
      } catch {
        /* keep cached births */
      }
    }
    refreshSavedBirthDropdown();
  }

  function applySavedBirthSelection() {
    if (!savedBirthSelect || typeof SaptarishiAuth === "undefined") return;
    const key = String(savedBirthSelect.value || "").trim();
    if (!key) return;
    const view = currentSavedBirthViews().find((entry) => birthViewSelectKey(entry) === key);
    if (!view) return;
    SaptarishiAuth.applyDefaultBirthToForm(
      {
        placePreset,
        placeCustom,
        customWrap,
        birthDate,
        birthTime,
        birthName,
        placeCustomValue: C.PLACE_CUSTOM_VALUE
      },
      view
    );
  }

  function pickSavedBirth(key) {
    if (!savedBirthSelect || !key) return;
    if (birthMode !== "open") setBirthMode("open");
    savedBirthSelect.value = key;
    applySavedBirthSelection();
    renderSavedBirthList(currentSavedBirthViews());
    void loadFuture();
  }

  function setBirthMode(mode) {
    birthMode = mode === "open" ? "open" : "new";
    const isOpen = birthMode === "open";
    if (form) {
      form.classList.toggle("is-open-mode", isOpen);
      form.classList.toggle("is-new-mode", !isOpen);
      form.noValidate = true;
    }
    if (tabOpenBirth) {
      tabOpenBirth.classList.toggle("kundali-tabs__item--active", isOpen);
      tabOpenBirth.setAttribute("aria-selected", isOpen ? "true" : "false");
    }
    if (tabNewBirth) {
      tabNewBirth.classList.toggle("kundali-tabs__item--active", !isOpen);
      tabNewBirth.setAttribute("aria-selected", !isOpen ? "true" : "false");
    }
    if (openBirthWrap) {
      openBirthWrap.hidden = !isOpen;
      if (!isOpen) openBirthWrap.classList.remove("is-loading");
    }
    if (newBirthFields) newBirthFields.hidden = isOpen;
    if (saveBirth && !isOpen) saveBirth.checked = true;
    if (isOpen) loadOpenBirthViews();
  }

  function setFutureBirthChooserHidden(hidden) {
    birthChooserHidden = Boolean(hidden);
    if (detailView) detailView.classList.toggle("is-showing-results", birthChooserHidden);
    if (CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(hidden);
    if (form) form.hidden = hidden;
    const tabs = detailView && detailView.querySelector(".kundali-tabs");
    if (tabs) tabs.hidden = hidden;
    if (openBirthWrap) openBirthWrap.classList.remove("is-loading");
    if (!hidden) setBirthMode(birthMode);
  }

  function stripPerIpWording(message) {
    if (CU && CU.removePerIpText) return CU.removePerIpText(message);
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatLoadError(err) {
    if (CU && CU.formatApiLoadError) {
      return CU.formatApiLoadError(err, {
        failurePrefix: "Failed to load future timings",
        limitReachedFallback: "Free kundali limit reached."
      });
    }
    const msg = stripPerIpWording(err?.message || "Request failed");
    return { text: `Failed to load future timings: ${msg}`, limitReached: false };
  }

  function getApiOrigin() {
    if (CU && CU.getApiOrigin) return CU.getApiOrigin(C);
    return String(C.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  async function parseApiJsonResponse(response) {
    if (CU && CU.parseApiJsonResponse) {
      return CU.parseApiJsonResponse(response, {
        restartHint: `Restart the Flask container on port ${C.FLASK_PORT} after code updates.`
      });
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        `API returned HTML (HTTP ${response.status}). Restart the Flask container on port ${C.FLASK_PORT} after code updates.`
      );
    }
  }

  async function fetchFutureJson(eventKey, date, time, place, name, saveBirthDetails) {
    const params = new URLSearchParams({
      event: eventKey,
      date,
      time,
      place,
      house_system: C.DEFAULT_HOUSE_SYSTEM
    });
    if (name) params.set("name", name);
    if (saveBirthDetails) params.set("save", "1");
    const path = `${C.API_FUTURE_PATH}?${params}`;
    if (typeof SaptarishiAuth !== "undefined") {
      if (SaptarishiAuth.fetchFuture) {
        return SaptarishiAuth.fetchFuture(path);
      }
      const payload = await SaptarishiAuth.apiFetch(path);
      SaptarishiAuth.updateUserFromApiPayload(payload);
      return payload;
    }
    const response = await fetch(`${getApiOrigin()}${path}`);
    const payload = await parseApiJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }

  function clearResults() {
    showStatus("");
    if (openBirthWrap) openBirthWrap.classList.remove("is-loading");
    if (resultsEl) resultsEl.hidden = true;
    if (disclaimerEl) disclaimerEl.textContent = "";
    if (bestEl) {
      bestEl.hidden = true;
      bestEl.replaceChildren();
    }
    if (windowsSection) windowsSection.hidden = true;
    if (windowsEl) windowsEl.replaceChildren();
    if (dashaSection) dashaSection.hidden = true;
    if (dashaSummary) dashaSummary.replaceChildren();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function windowCard(row, isBest) {
    const article = document.createElement("article");
    article.className = `future-window${isBest ? " future-window--best" : ""}`;
    if (row.score_color) article.classList.add(`future-window--${row.score_color}`);
    const dasha = `${row.mahadasha || "—"} – ${row.antardasha || "—"} – ${row.pratyantardasha || "—"}`;
    const why = Array.isArray(row.why) ? row.why.slice(0, 4) : [];
    const transitHits = Array.isArray(row.transit?.hits) ? row.transit.hits : [];
    article.innerHTML = `
      <header class="future-window__head">
        ${row.rank ? `<span class="future-window__rank">${escapeHtml(row.rank)}</span>` : ""}
        <div>
          <strong class="future-window__dasha">${escapeHtml(dasha)}</strong>
          <p class="future-window__range">${escapeHtml(row.range || "")}</p>
        </div>
        <span class="future-window__score">${escapeHtml(row.score_label || "")} · ${escapeHtml(row.score ?? "")}</span>
      </header>
      ${
        row.transit?.confirmed
          ? `<p class="future-window__transit">Transit confirmed${
              transitHits.length ? `: ${escapeHtml(transitHits.join("; "))}` : ""
            }</p>`
          : ""
      }
      ${row.is_current ? `<p class="future-window__now">Running now</p>` : ""}
      ${
        why.length
          ? `<ul class="future-window__why">${why
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : ""
      }
    `;
    return article;
  }

  function renderFuturePayload(payload) {
    if (!resultsEl) return;
    resultsEl.hidden = false;
    if (bestEl) {
      bestEl.replaceChildren();
      if (payload.best) {
        const heading = document.createElement("h2");
        heading.className = "result-heading";
        heading.textContent = "Best favourable window";
        bestEl.append(heading, windowCard(payload.best, true));
        bestEl.hidden = false;
      } else {
        bestEl.hidden = true;
      }
    }
    if (windowsEl && windowsSection) {
      windowsEl.replaceChildren();
      const windows = Array.isArray(payload.windows) ? payload.windows : [];
      windows.forEach((row) => windowsEl.appendChild(windowCard(row, false)));
      windowsSection.hidden = !windows.length;
    }
    if (KV && KV.renderCurrentDashaFromPayload) {
      KV.renderCurrentDashaFromPayload(payload, {
        section: dashaSection,
        summaryHost: dashaSummary
      });
    }
    if (disclaimerEl) {
      const reason = payload.windows?.length ? "" : String(payload.empty_reason || "").trim();
      disclaimerEl.textContent = reason;
      disclaimerEl.hidden = !reason;
    }
    showStatus("");
  }

  function showOptionsView() {
    selectedEvent = "";
    if (form) delete form.dataset.event;
    if (optionsView) optionsView.hidden = false;
    if (detailView) detailView.hidden = true;
    if (optionsView) {
      optionsView.querySelectorAll(".feature-tile").forEach((tile) => {
        tile.classList.remove("feature-tile--active");
        tile.setAttribute("aria-pressed", "false");
      });
    }
    setFutureBirthChooserHidden(false);
    clearResults();
  }

  function showDetailView(eventKey) {
    selectedEvent = eventKey || "";
    const label = EVENT_LABELS[selectedEvent] || selectedEvent || "Future";
    if (selectedTitleEl) selectedTitleEl.textContent = label;
    if (form) form.dataset.event = selectedEvent;
    if (optionsView) optionsView.hidden = true;
    if (detailView) detailView.hidden = false;
    setFutureBirthChooserHidden(false);
    clearResults();
    if (birthMode === "new" && placePreset) placePreset.focus();
  }

  async function loadFuture() {
    const eventKey = selectedEvent || form?.dataset.event || "";
    if (!eventKey) {
      showStatus("Choose Career, Marriage, or Child born first.", true);
      return;
    }
    const place = getBirthPlace();
    const validationError = validateBirthForm(place);
    if (validationError) {
      showStatus(validationError, true);
      return;
    }
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.requireLoginForCharts) {
      const ok = await SaptarishiAuth.requireLoginForCharts({
        message: "Register or sign in to see future timings."
      });
      if (!ok) {
        showStatus("Register or sign in to see future timings.", true);
        return;
      }
    }

    setFutureBirthChooserHidden(true);
    showLoading();
    if (resultsEl) resultsEl.hidden = true;
    const name = birthName ? String(birthName.value || "").trim() : "";
    try {
      const payload = await fetchFutureJson(
        eventKey,
        birthDate.value,
        birthTime.value,
        place,
        name,
        shouldSaveBirthDetails()
      );
      renderFuturePayload(payload);
      refreshSavedBirthDropdown();
    } catch (err) {
      setFutureBirthChooserHidden(false);
      const formatted = formatLoadError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        const ready = await SaptarishiAuth.handlePremiumRequired(err);
        if (ready && SaptarishiAuth.requireAuth && SaptarishiAuth.requireAuth()) {
          setFutureBirthChooserHidden(true);
          showLoading();
          try {
            const payload = await fetchFutureJson(
              eventKey,
              birthDate.value,
              birthTime.value,
              place,
              name,
              shouldSaveBirthDetails()
            );
            renderFuturePayload(payload);
          } catch (retryErr) {
            setFutureBirthChooserHidden(false);
            const retryFormatted = formatLoadError(retryErr);
            showStatus(retryFormatted.text, true, retryFormatted.limitReached);
          }
        }
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadFuture();
  }

  if (optionsView) {
    optionsView.querySelectorAll(".feature-tile").forEach((tile) => {
      tile.setAttribute("aria-pressed", "false");
    });
    optionsView.addEventListener("click", (event) => {
      const tile = event.target.closest(".feature-tile");
      if (!tile || !optionsView.contains(tile)) return;
      const eventKey = (tile.getAttribute("data-event") || "").trim();
      if (!eventKey) return;
      optionsView.querySelectorAll(".feature-tile").forEach((btn) => {
        const active = btn === tile;
        btn.classList.toggle("feature-tile--active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
      showDetailView(eventKey);
    });
  }
  if (backBtn) backBtn.addEventListener("click", showOptionsView);
  if (placePreset) placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  if (tabOpenBirth) tabOpenBirth.addEventListener("click", () => setBirthMode("open"));
  if (tabNewBirth) tabNewBirth.addEventListener("click", () => setBirthMode("new"));
  if (savedBirthSelect) savedBirthSelect.addEventListener("change", applySavedBirthSelection);
  if (savedBirthSearch) {
    savedBirthSearch.addEventListener("input", () => renderSavedBirthList(currentSavedBirthViews()));
    savedBirthSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
  }
  if (form) form.addEventListener("submit", handleSubmit);
  setBirthMode("new");
  if (CU && CU.enhanceBirthChooser) CU.enhanceBirthChooser(form);
})();

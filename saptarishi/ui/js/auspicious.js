// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Auspicious page (loaded after kundali.js on auspicious.html). */
(function auspiciousPage() {
  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
    FLASK_PORT: 8081,
    PRODUCTION_API_ORIGIN: "https://saptarishi.ranjanravi.com",
    DEFAULT_HOUSE_SYSTEM: "W",
    API_AUSPICIOUS_PATH: "/api/auspicious",
    PLACE_CUSTOM_VALUE: "__custom__",
    MAX_PLACE_QUERY_LENGTH: 240,
    AUSPICIOUS_READY_STATUS_MESSAGE: "Top auspicious date and time slots are ready"
  };

  const auspiciousForm = document.getElementById("auspicious-form");
  const auspiciousStatusEl = document.getElementById("status");
  const auspiciousResultsEl = document.getElementById("results");
  const kundaliDetailEl = document.getElementById("kundali-detail");
  const kundaliDetailHeading = document.getElementById("kundali-detail-heading");
  const auspiciousPlacePreset = document.getElementById("place-preset");
  const auspiciousCustomWrap = document.getElementById("custom-place-wrap");
  const auspiciousPlaceCustom = document.getElementById("place-custom");
  const dateFrom = document.getElementById("date-from");
  const dateTo = document.getElementById("date-to");

  const TOP_TABLE_COLUMNS = [
    { key: "rank", className: "" },
    { key: "date", className: "" },
    { key: "time", className: "" },
    { key: "houses_strength_total", className: "planets-td-strength" }
  ];

  const SLOT_KUNDALI_TARGETS = {
    summaryTable: "#slot-summary-table tbody",
    chartHost: "slot-kundali-chart",
    planetsTable: "#slot-planets-table tbody",
    nakshatraTable: "#slot-nakshatra-table tbody",
    skipShellUpdates: true
  };

  let lastScanPlace = "";
  let selectedTopRow = null;
  let kundaliLoadToken = 0;

  function isLocalDevUi() {
    const host = window.location.hostname;
    return (
      window.location.protocol === "file:" ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  }

  function getFlaskApiOrigin() {
    if (isLocalDevUi()) {
      return `http://localhost:${AC.FLASK_PORT}`;
    }
    return String(AC.PRODUCTION_API_ORIGIN || "https://saptarishi.ranjanravi.com").replace(
      /\/$/,
      ""
    );
  }

  function showAuspiciousStatus(message, isError) {
    if (!auspiciousStatusEl) return;
    const text = message || "";
    auspiciousStatusEl.textContent = text;
    auspiciousStatusEl.hidden = !text;
    auspiciousStatusEl.classList.toggle("error", Boolean(isError));
  }

  function getPlaceFromForm() {
    if (!auspiciousPlacePreset) return "";
    if (auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE) {
      return (auspiciousPlaceCustom && auspiciousPlaceCustom.value.trim()) || "";
    }
    return auspiciousPlacePreset.value.trim();
  }

  function toTitleCaseWords(text) {
    return String(text ?? "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function createSummaryLabelValueRow(label, value) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.scope = "row";
    th.textContent = toTitleCaseWords(label);
    const td = document.createElement("td");
    td.textContent = String(value ?? "");
    tr.appendChild(th);
    tr.appendChild(td);
    return tr;
  }

  function renderSummaryTableFromApiRows(summaryBody, summaryRows) {
    if (!summaryBody) return;
    summaryBody.replaceChildren();
    for (const row of summaryRows || []) {
      summaryBody.appendChild(createSummaryLabelValueRow(row.label, row.value));
    }
  }

  function applyTopTableCellStyle(td, colorKind) {
    if (!colorKind) return;
    const extra = td.className ? `${td.className} ` : "";
    td.className = `${extra}planets-td-status planet-cell planet-cell--${colorKind}`.trim();
  }

  function topTableCellText(key, rowData) {
    const value = rowData[key];
    if (value == null || value === "") return "—";
    return String(value);
  }

  function normalizeKundaliTimeValue(timeValue) {
    const raw = String(timeValue ?? "").trim();
    if (!raw) return raw;
    const parts = raw.split(":");
    if (parts.length === 1) return `${parts[0].padStart(2, "0")}:00:00`;
    if (parts.length === 2) {
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:00`;
    }
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}:${parts[2].padStart(2, "0")}`;
  }

  function setSelectedTopRow(tr) {
    if (selectedTopRow) {
      selectedTopRow.classList.remove("auspicious-top-row--selected");
      selectedTopRow.removeAttribute("aria-selected");
    }
    selectedTopRow = tr || null;
    if (selectedTopRow) {
      selectedTopRow.classList.add("auspicious-top-row--selected");
      selectedTopRow.setAttribute("aria-selected", "true");
    }
  }

  function hideKundaliDetail() {
    if (kundaliDetailEl) kundaliDetailEl.hidden = true;
    setSelectedTopRow(null);
  }

  async function loadKundaliForTopRow(rowData) {
    const view = window.SaptarishiKundaliView;
    if (!view || !lastScanPlace || !rowData?.date || !rowData?.time) return;

    const loadToken = ++kundaliLoadToken;
    const date = String(rowData.date);
    const time = normalizeKundaliTimeValue(rowData.time);

    if (kundaliDetailHeading) {
      kundaliDetailHeading.textContent = `Kundali — ${date} ${time.slice(0, 5)}`;
    }
    if (kundaliDetailEl) kundaliDetailEl.hidden = false;
    showAuspiciousStatus(`Loading kundali for ${date} ${time.slice(0, 5)}…`);

    try {
      await view.ensurePlanetDatabase();
      const payload = await view.fetchJson(date, time, lastScanPlace);
      if (loadToken !== kundaliLoadToken) return;
      view.renderIntoPage(payload, SLOT_KUNDALI_TARGETS);
      if (kundaliDetailEl) {
        kundaliDetailEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      showAuspiciousStatus(AC.AUSPICIOUS_READY_STATUS_MESSAGE);
    } catch (err) {
      if (loadToken !== kundaliLoadToken) return;
      const apiHint = isLocalDevUi()
        ? `Is Flask running on http://localhost:${AC.FLASK_PORT}?`
        : `Is the API reachable at ${getFlaskApiOrigin()}?`;
      showAuspiciousStatus(`Failed to load kundali: ${err.message}. ${apiHint}`, true);
    }
  }

  function handleTopRowClick(event) {
    const tr = event.currentTarget;
    if (!tr?.dataset?.date || !tr?.dataset?.time) return;
    setSelectedTopRow(tr);
    loadKundaliForTopRow({
      date: tr.dataset.date,
      time: tr.dataset.time,
      houses_strength_total: tr.dataset.strength
    });
  }

  function handleTopRowKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleTopRowClick(event);
  }

  function renderTopTableFromApiRows(tbody, rows) {
    if (!tbody) return;
    tbody.replaceChildren();
    hideKundaliDetail();

    for (const rowData of rows || []) {
      const tr = document.createElement("tr");
      tr.className = "auspicious-top-row";
      tr.tabIndex = 0;
      tr.setAttribute("role", "button");
      tr.title = "Show kundali for this date and time";
      tr.dataset.date = String(rowData.date || "");
      tr.dataset.time = String(rowData.time || "");
      tr.dataset.strength = String(rowData.houses_strength_total ?? "");

      const cellStyles = rowData.cell_styles || {};
      for (const col of TOP_TABLE_COLUMNS) {
        const td = document.createElement("td");
        if (col.className) td.className = col.className;
        td.textContent = topTableCellText(col.key, rowData);
        applyTopTableCellStyle(td, cellStyles[col.key] || "");
        tr.appendChild(td);
      }

      tr.addEventListener("click", handleTopRowClick);
      tr.addEventListener("keydown", handleTopRowKeydown);
      tbody.appendChild(tr);
    }
  }

  async function parseApiJsonResponse(response) {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      const hint =
        `API returned HTML (HTTP ${response.status}). ` +
        `Restart the Flask container on port ${AC.FLASK_PORT} after code updates.`;
      throw new Error(hint);
    }
  }

  function validateForm(place) {
    if (!auspiciousPlacePreset.value) return "Select a place.";
    if (auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE && !place) {
      return "Enter a custom place.";
    }
    if (!dateFrom.value || !dateTo.value) return "From and to dates are required.";
    if (dateTo.value < dateFrom.value) return "To date must be on or after from date.";
    return null;
  }

  function syncCustomPlaceFieldVisibility() {
    const isCustom = auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE;
    if (auspiciousCustomWrap) auspiciousCustomWrap.hidden = !isCustom;
    if (!isCustom && auspiciousPlaceCustom) auspiciousPlaceCustom.value = "";
  }

  async function fetchAuspiciousJsonFromApi(dateFromValue, dateToValue, place) {
    const params = new URLSearchParams({
      date_from: dateFromValue,
      date_to: dateToValue,
      place,
      house_system: AC.DEFAULT_HOUSE_SYSTEM
    });
    const response = await fetch(`${getFlaskApiOrigin()}${AC.API_AUSPICIOUS_PATH}?${params}`);
    const payload = await parseApiJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }

  function renderAuspiciousResponseIntoPage(payload) {
    const summaryBody = document.querySelector("#summary-table tbody");
    const topBody = document.querySelector("#top-table tbody");

    lastScanPlace = payload.place_query || getPlaceFromForm();
    renderSummaryTableFromApiRows(summaryBody, payload.summary_table);
    renderTopTableFromApiRows(topBody, payload.top_table || []);

    if (auspiciousResultsEl) auspiciousResultsEl.hidden = false;
    showAuspiciousStatus(payload.ui_status_message || AC.AUSPICIOUS_READY_STATUS_MESSAGE);
  }

  async function handleAuspiciousFormSubmit(event) {
    event.preventDefault();
    const place = getPlaceFromForm();
    const validationError = validateForm(place);
    if (validationError) {
      showAuspiciousStatus(validationError, true);
      return;
    }

    showAuspiciousStatus("Loading…");
    if (auspiciousResultsEl) auspiciousResultsEl.hidden = true;
    hideKundaliDetail();
    lastScanPlace = place;

    try {
      const payload = await fetchAuspiciousJsonFromApi(dateFrom.value, dateTo.value, place);
      renderAuspiciousResponseIntoPage(payload);
    } catch (err) {
      const apiHint = isLocalDevUi()
        ? `Is Flask running on http://localhost:${AC.FLASK_PORT}?`
        : `Is the API reachable at ${getFlaskApiOrigin()}?`;
      showAuspiciousStatus(`Failed: ${err.message}. ${apiHint}`, true);
    }
  }

  if (auspiciousPlacePreset) {
    auspiciousPlacePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }

  if (auspiciousForm) {
    auspiciousForm.addEventListener("submit", handleAuspiciousFormSubmit);
  }

  if (dateFrom && !dateFrom.value) {
    dateFrom.value = "2026-05-20";
  }
  if (dateTo && !dateTo.value) {
    dateTo.value = "2026-06-20";
  }

  if (window.SaptarishiKundaliView) {
    window.SaptarishiKundaliView.ensurePlanetDatabase().catch(() => {});
  }
})();

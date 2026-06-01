// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Auspicious page (loaded after kundali.js on auspicious.html). */
(function auspiciousPage() {
  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
    FLASK_PORT: 8081,
    PRODUCTION_API_ORIGIN: "https://api.ranjanravi.com",
    DEFAULT_HOUSE_SYSTEM: "W",
    API_AUSPICIOUS_PATH: "/api/auspicious",
    PLACE_CUSTOM_VALUE: "__custom__",
    MAX_PLACE_QUERY_LENGTH: 240,
    AUSPICIOUS_READY_STATUS_MESSAGE: "Top auspicious date and time slots are ready"
  };

  const auspiciousForm = document.getElementById("auspicious-form");
  const auspiciousStatusEl = document.getElementById("status");
  const auspiciousResultsEl = document.getElementById("results");
  const auspiciousScanResultsEl = document.getElementById("auspicious-scan-results");
  const auspiciousPlacePreset = document.getElementById("place-preset");
  const auspiciousCustomWrap = document.getElementById("custom-place-wrap");
  const auspiciousPlaceCustom = document.getElementById("place-custom");
  const dateFrom = document.getElementById("date-from");
  const dateTo = document.getElementById("date-to");

  function formatDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function addMonths(date, months) {
    const result = new Date(date.getTime());
    result.setMonth(result.getMonth() + months);
    return result;
  }

  function setDefaultAuspiciousDateRange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dateFrom && !dateFrom.value) {
      dateFrom.value = formatDateInputValue(today);
    }
    if (dateTo && !dateTo.value) {
      dateTo.value = formatDateInputValue(addMonths(today, 1));
    }
  }

  const TOP_TABLE_COLUMNS = [
    { key: "rank", className: "" },
    { key: "date", className: "" },
    { key: "time", className: "" },
    { key: "houses_strength_total", className: "planets-td-strength" }
  ];

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
    return String(AC.PRODUCTION_API_ORIGIN || "https://api.ranjanravi.com").replace(
      /\/$/,
      ""
    );
  }

  function showAuspiciousStatus(message, isError, isLimitError) {
    if (!auspiciousStatusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.stop(auspiciousStatusEl);
    }
    const text = message || "";
    auspiciousStatusEl.textContent = text;
    auspiciousStatusEl.hidden = !text;
    auspiciousStatusEl.classList.toggle("error", Boolean(isError));
    auspiciousStatusEl.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function showAuspiciousLoading() {
    if (!auspiciousStatusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.start(auspiciousStatusEl);
      return;
    }
    showAuspiciousStatus("Loading…");
  }

  function stripPerIpWording(message) {
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatAuspiciousLoadError(err) {
    const msg = stripPerIpWording(err?.message || "Request failed");
    const limitReached =
      Boolean(err?.premiumRequired) || /limit reached/i.test(msg);
    return {
      text: limitReached
        ? msg || "Free auspicious limit reached."
        : `Failed to load auspicious times: ${msg}`,
      limitReached
    };
  }

  function getPlaceFromForm() {
    if (!auspiciousPlacePreset) return "";
    if (auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE) {
      return (auspiciousPlaceCustom && auspiciousPlaceCustom.value.trim()) || "";
    }
    return auspiciousPlacePreset.value.trim();
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

  function renderTopTableFromApiRows(tbody, rows) {
    if (!tbody) return;
    tbody.replaceChildren();

    for (const rowData of rows || []) {
      const tr = document.createElement("tr");

      const cellStyles = rowData.cell_styles || {};
      for (const col of TOP_TABLE_COLUMNS) {
        const td = document.createElement("td");
        if (col.className) td.className = col.className;
        td.textContent = topTableCellText(col.key, rowData);
        applyTopTableCellStyle(td, cellStyles[col.key] || "");
        tr.appendChild(td);
      }

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
    const path = `${AC.API_AUSPICIOUS_PATH}?${params}`;
    if (typeof SaptarishiAuth !== "undefined") {
      if (SaptarishiAuth.fetchAuspicious) {
        return SaptarishiAuth.fetchAuspicious(
          path,
          dateFromValue,
          dateToValue,
          place
        );
      }
      const payload = await SaptarishiAuth.apiFetch(path);
      SaptarishiAuth.updateUserFromApiPayload(payload);
      return payload;
    }
    const response = await fetch(`${getFlaskApiOrigin()}${path}`);
    const payload = await parseApiJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }

  function topTableHeadingText(payload) {
    const topCount = Number(payload.top_count) || 5;
    return `Top ${topCount} unique highest house strength totals`;
  }

  function renderAuspiciousResponseIntoPage(payload) {
    const topBody = document.querySelector("#top-table tbody");
    const topHeading = document.getElementById("top-table-heading");

    if (topHeading) {
      topHeading.textContent = topTableHeadingText(payload);
    }
    const summaryRenderer = window.SaptarishiKundaliView?.renderSummaryTable;
    if (summaryRenderer) {
      summaryRenderer(document.querySelector("#summary-table tbody"), payload.summary_table);
    }
    renderTopTableFromApiRows(topBody, payload.top_table || []);
    if (auspiciousScanResultsEl) auspiciousScanResultsEl.hidden = false;
    const lord = window.SaptarishiLordComparison;
    if (lord) {
      lord.setChrome("top");
      lord.renderTable(payload.lord_comparison_table || {});
    }

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

    showAuspiciousLoading();
    if (auspiciousResultsEl) auspiciousResultsEl.hidden = true;
    const lordSection = document.getElementById("lord-comparison-section");
    if (lordSection) lordSection.hidden = true;

    try {
      const payload = await fetchAuspiciousJsonFromApi(dateFrom.value, dateTo.value, place);
      renderAuspiciousResponseIntoPage(payload);
    } catch (err) {
      const formatted = formatAuspiciousLoadError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showAuspiciousStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        await SaptarishiAuth.handlePremiumRequired(err);
      }
    }
  }

  if (auspiciousPlacePreset) {
    auspiciousPlacePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }

  if (auspiciousForm) {
    auspiciousForm.addEventListener("submit", handleAuspiciousFormSubmit);
  }

  setDefaultAuspiciousDateRange();

  if (window.SaptarishiKundaliView) {
    window.SaptarishiKundaliView.ensurePlanetDatabase().catch(() => {});
  }
})();

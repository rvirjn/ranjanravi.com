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
  const kundaliDetailEl = document.getElementById("kundali-detail");
  const kundaliDetailHeading = document.getElementById("kundali-detail-heading");
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

  const SLOT_KUNDALI_TARGETS =
    (window.SaptarishiKundaliView && window.SaptarishiKundaliView.SLOT_TARGETS) ||
    {
      summaryTable: "#slot-summary-table tbody",
      chartHost: "slot-kundali-chart",
      planetsTable: "#slot-planets-table tbody",
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

  function formatKundaliSlotLoadError(err) {
    const msg = stripPerIpWording(err?.message || "Request failed");
    const limitReached =
      Boolean(err?.premiumRequired) || /limit reached/i.test(msg);
    return {
      text: limitReached
        ? msg || "Free kundali limit reached."
        : `Failed to load kundali: ${msg}`,
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
    showAuspiciousLoading();

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
      const formatted = formatKundaliSlotLoadError(err);
      showAuspiciousStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        await SaptarishiAuth.handlePremiumRequired(err);
      }
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

  function formatPlanetDisplayName(planetKey) {
    const key = String(planetKey || "").trim().toLowerCase();
    if (!key) return "—";
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  function formatRashiTitle(rashiEnglish) {
    const text = String(rashiEnglish || "").trim();
    if (!text) return "—";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function formatLordComparisonCell(cell) {
    if (cell?.display) return String(cell.display);
    if (!cell || (!cell.rashi_english && cell.strength_percent == null)) return "—";
    const rashi = formatRashiTitle(cell.rashi_english);
    const relation = String(cell.rashi_relation || "neutral").toLowerCase();
    const adjustment = cell.adjustment;
    if (typeof adjustment === "number" && adjustment !== 0) {
      return adjustment > 0
        ? `${rashi} · ${relation} +${adjustment}`
        : `${rashi} · ${relation} ${adjustment}`;
    }
    return `${rashi} · ${relation}`;
  }

  function lordComparisonCellTitle(cell) {
    const parts = [];
    if (cell?.breakdown) parts.push(String(cell.breakdown));
    if (
      typeof cell?.factor_sum === "number" &&
      typeof cell?.strength_percent === "number" &&
      cell.factor_sum === cell.strength_percent
    ) {
      parts.push(`100 + adjustments = ${cell.factor_sum}`);
    } else if (typeof cell?.strength_percent === "number") {
      parts.push(`Total ${cell.strength_percent} (100 + adjustments)`);
    }
    return parts.join(" · ") || "Show kundali for this slot";
  }

  function lordFactorBracketText(factor) {
    const text = String(factor?.text || "").trim();
    const value = factor?.value;
    const name = text.replace(/\s+house$/i, "").replace(/\s+[+-]?\d+$/, "").trim();
    if (typeof value === "number") {
      if (value > 0) return `${name}(+${value})`;
      if (value < 0) return `${name}(${value})`;
      return `${name}(+0)`;
    }
    return text;
  }

  function appendLordFactorSpan(parent, factor) {
    const tone = String(factor?.tone || "").toLowerCase();
    const part = document.createElement("span");
    part.className = "auspicious-lord-cell__part";
    if (tone === "sign") part.classList.add("auspicious-lord-cell__rashi");
    else if (tone === "plus") part.classList.add("auspicious-lord-adj--plus");
    else if (tone === "minus") part.classList.add("auspicious-lord-adj--minus");
    else if (tone === "neutral") part.classList.add("auspicious-lord-relation--neutral");
    else if (tone === "total") part.classList.add("auspicious-lord-cell__total");
    part.textContent = String(factor?.text || "");
    parent.appendChild(part);
    return part;
  }

  function buildLordComparisonCellElement(cell) {
    const wrap = document.createElement("div");
    wrap.className = "auspicious-lord-cell";
    if (!cell || (!cell.rashi_english && cell.strength_percent == null)) {
      wrap.textContent = "—";
      return wrap;
    }

    const factors = Array.isArray(cell.factors) ? cell.factors : [];
    if (factors.length) {
      let signFactor = null;
      let rashiFactor = null;
      const otherFactors = [];
      let totalFactor = null;
      for (const factor of factors) {
        const tone = String(factor?.tone || "").toLowerCase();
        if (tone === "sign") signFactor = factor;
        else if (tone === "total") totalFactor = factor;
        else if (!rashiFactor && (tone === "plus" || tone === "minus" || tone === "neutral")) {
          rashiFactor = factor;
        } else {
          otherFactors.push(factor);
        }
      }

      if (signFactor && rashiFactor) {
        appendLordFactorSpan(wrap, signFactor);
        wrap.appendChild(document.createTextNode("("));
        appendLordFactorSpan(wrap, rashiFactor);
        wrap.appendChild(document.createTextNode(")"));
      } else if (signFactor) {
        appendLordFactorSpan(wrap, signFactor);
      } else if (rashiFactor) {
        appendLordFactorSpan(wrap, rashiFactor);
      }

      otherFactors.forEach((factor, index) => {
        wrap.appendChild(document.createTextNode(", "));
        const bracket = lordFactorBracketText(factor);
        const part = document.createElement("span");
        part.className = "auspicious-lord-cell__part";
        const tone = String(factor?.tone || "").toLowerCase();
        if (tone === "plus") part.classList.add("auspicious-lord-adj--plus");
        else if (tone === "minus") part.classList.add("auspicious-lord-adj--minus");
        part.textContent = bracket;
        wrap.appendChild(part);
      });

      if (totalFactor) {
        wrap.appendChild(document.createElement("br"));
        appendLordFactorSpan(wrap, totalFactor);
      }
      return wrap;
    }

    if (cell.display_main || cell.display_total) {
      if (cell.display_main) {
        wrap.appendChild(document.createTextNode(String(cell.display_main)));
      }
      if (cell.display_total) {
        wrap.appendChild(document.createElement("br"));
        const total = document.createElement("span");
        total.className = "auspicious-lord-cell__part auspicious-lord-cell__total";
        total.textContent = String(cell.display_total);
        wrap.appendChild(total);
      }
      return wrap;
    }

    wrap.textContent = formatLordComparisonCell(cell);
    return wrap;
  }

  function highlightTopRowForSlot(date, time) {
    const tbody = document.querySelector("#top-table tbody");
    if (!tbody) return;
    let match = null;
    for (const tr of tbody.querySelectorAll("tr.auspicious-top-row")) {
      if (tr.dataset.date === String(date || "") && tr.dataset.time === String(time || "")) {
        match = tr;
        break;
      }
    }
    setSelectedTopRow(match);
  }

  function handleLordComparisonSlotActivate(slotData) {
    if (!slotData?.date || !slotData?.time) return;
    highlightTopRowForSlot(slotData.date, slotData.time);
    loadKundaliForTopRow({
      date: slotData.date,
      time: slotData.time,
      houses_strength_total: slotData.houses_strength_total
    });
  }

  function handleLordComparisonHeaderClick(event) {
    const th = event.currentTarget;
    if (!th?.dataset?.date || !th?.dataset?.time) return;
    handleLordComparisonSlotActivate({
      date: th.dataset.date,
      time: th.dataset.time,
      houses_strength_total: th.dataset.strength
    });
  }

  function handleLordComparisonCellClick(event) {
    const td = event.currentTarget;
    const columnIndex = Number(td.dataset.columnIndex);
    const table = document.getElementById("lord-comparison-table");
    const columns = table?._lordComparisonColumns;
    if (!Number.isInteger(columnIndex) || !Array.isArray(columns)) return;
    const slot = columns[columnIndex];
    if (!slot) return;
    handleLordComparisonSlotActivate(slot);
  }

  function renderLordComparisonTable(comparison) {
    const section = document.getElementById("lord-comparison-section");
    const table = document.getElementById("lord-comparison-table");
    if (!section || !table) return;

    const columns = comparison?.columns || [];
    const rows = comparison?.rows || [];
    table._lordComparisonColumns = columns;

    if (!columns.length || !rows.length) {
      section.hidden = true;
      table.querySelector("thead")?.replaceChildren();
      table.querySelector("tbody")?.replaceChildren();
      return;
    }

    section.hidden = false;
    const thead = table.querySelector("thead");
    const tbody = table.querySelector("tbody");
    if (!thead || !tbody) return;

    const headerRow = document.createElement("tr");
    headerRow.appendChild(Object.assign(document.createElement("th"), { textContent: "Planet" }));
    headerRow.appendChild(Object.assign(document.createElement("th"), { textContent: "Houses" }));

    columns.forEach((column, index) => {
      const th = document.createElement("th");
      th.className = "auspicious-lord-col auspicious-lord-col--clickable";
      th.tabIndex = 0;
      th.setAttribute("role", "button");
      th.dataset.date = String(column.date || "");
      th.dataset.time = String(column.time || "");
      th.dataset.strength = String(column.houses_strength_total ?? "");
      th.dataset.columnIndex = String(index);
      th.title = "Show kundali for this slot";

      const label = document.createElement("span");
      label.className = "auspicious-lord-col__label";
      label.textContent = column.label || `${column.date} ${column.time}`;

      const total = document.createElement("span");
      total.className = "auspicious-lord-col__total";
      total.textContent =
        typeof column.houses_strength_total === "number"
          ? `Total ${column.houses_strength_total}`
          : "";

      th.append(label, total);
      th.addEventListener("click", handleLordComparisonHeaderClick);
      th.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        handleLordComparisonHeaderClick({ currentTarget: th });
      });
      headerRow.appendChild(th);
    });
    thead.replaceChildren(headerRow);
    tbody.replaceChildren();

    for (const rowData of rows) {
      const tr = document.createElement("tr");
      tr.appendChild(
        Object.assign(document.createElement("td"), {
          textContent: formatPlanetDisplayName(rowData.planet)
        })
      );

      const houses = Array.isArray(rowData.houses) ? rowData.houses.join(", ") : "";
      tr.appendChild(Object.assign(document.createElement("td"), { textContent: houses || "—" }));

      (rowData.cells || []).forEach((cell, index) => {
        const td = document.createElement("td");
        td.className = "auspicious-lord-col auspicious-lord-col--clickable";
        td.tabIndex = 0;
        td.setAttribute("role", "button");
        td.dataset.columnIndex = String(index);
        td.title = lordComparisonCellTitle(cell);
        td.appendChild(buildLordComparisonCellElement(cell));
        td.addEventListener("click", handleLordComparisonCellClick);
        td.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          handleLordComparisonCellClick({ currentTarget: td });
        });
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
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

    lastScanPlace = payload.place_query || getPlaceFromForm();
    if (topHeading) {
      topHeading.textContent = topTableHeadingText(payload);
    }
    const summaryRenderer = window.SaptarishiKundaliView?.renderSummaryTable;
    if (summaryRenderer) {
      summaryRenderer(document.querySelector("#summary-table tbody"), payload.summary_table);
    }
    renderTopTableFromApiRows(topBody, payload.top_table || []);
    renderLordComparisonTable(payload.lord_comparison_table || {});

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
    hideKundaliDetail();
    lastScanPlace = place;

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

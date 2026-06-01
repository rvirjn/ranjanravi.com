// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Auspicious page (loaded after kundali.js on auspicious.html). */
(function auspiciousPage() {
  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
    FLASK_PORT: 8081,
    PRODUCTION_API_ORIGIN: "https://api.ranjanravi.com",
    DEFAULT_HOUSE_SYSTEM: "W",
    API_AUSPICIOUS_PATH: "/api/auspicious",
    API_KUNDALI_PATH: "/api/kundali",
    API_KUNDALI_COMPARE_PATH: "/api/kundali/compare",
    PLACE_CUSTOM_VALUE: "__custom__",
    MAX_PLACE_QUERY_LENGTH: 240,
    AUSPICIOUS_READY_STATUS_MESSAGE: "Top auspicious date and time slots are ready"
  };

  const COMPARE_MIN_BIRTHS = 2;
  const COMPARE_MAX_BIRTHS = 5;
  const COMPARE_PLACE_OPTIONS = [
    { value: "", label: "Select place…" },
    { value: "New Delhi, India", label: "New Delhi, India" },
    { value: "Mumbai, India", label: "Mumbai, India" },
    { value: "Kolkata, India", label: "Kolkata, India" },
    { value: "Bengaluru, India", label: "Bengaluru, India" },
    { value: "Patna, India", label: "Patna, India" },
    { value: "Motihari, India", label: "Motihari, India" },
    { value: AC.PLACE_CUSTOM_VALUE, label: "Other…" }
  ];
  const LORD_COMPARISON_HEADING_TOP =
    "Lord strength differences across top slots";
  const LORD_COMPARISON_LEAD_TOP =
    "Details of the dates and times above. Each lord starts at <strong>100</strong> strength; +/- adjustments increase or decrease its power. Birth charts appear in each column header.";
  const LORD_COMPARISON_HEADING_COMPARE =
    "Lord strength differences across compared births";
  const LORD_COMPARISON_LEAD_COMPARE =
    "Each lord starts at <strong>100</strong> strength; +/- adjustments increase or decrease its power. Birth charts appear in each column header.";

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
    return parts.join(" · ");
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

  function renderInlineColumnChart(column, chartHost) {
    const view = window.SaptarishiKundaliView;
    if (!view || !column?.kundali_chart || !chartHost) return;
    const build = view.buildNorthIndianChartFromPayload;
    const render = view.renderKundaliChart;
    if (typeof build !== "function" || typeof render !== "function") return;
    const chartData = build(column.kundali_chart);
    render(chartData, chartHost);
  }

  function normalizeCompareTime(timeS) {
    const raw = String(timeS || "").trim();
    if (/^\d{2}:\d{2}$/.test(raw)) return raw;
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
    return raw;
  }

  function setAuspiciousResultsView(mode) {
    if (auspiciousScanResultsEl) {
      auspiciousScanResultsEl.hidden = mode === "compare";
    }
  }

  function setLordComparisonChrome(mode) {
    const heading = document.getElementById("lord-comparison-heading");
    const lead = document.querySelector(".auspicious-lord-comparison-lead");
    if (mode === "compare") {
      if (heading) heading.textContent = LORD_COMPARISON_HEADING_COMPARE;
      if (lead) lead.innerHTML = LORD_COMPARISON_LEAD_COMPARE;
      return;
    }
    if (heading) heading.textContent = LORD_COMPARISON_HEADING_TOP;
    if (lead) lead.innerHTML = LORD_COMPARISON_LEAD_TOP;
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

    columns.forEach((column) => {
      const th = document.createElement("th");
      th.className = "auspicious-lord-col";

      const label = document.createElement("span");
      label.className = "auspicious-lord-col__label";
      label.textContent = column.label || `${column.date} ${column.time}`;

      const total = document.createElement("span");
      total.className = "auspicious-lord-col__total";
      total.textContent =
        typeof column.houses_strength_total === "number"
          ? `Total ${column.houses_strength_total}`
          : "";

      const chartHost = document.createElement("div");
      chartHost.className = "auspicious-lord-col__chart kundali-chart-host";
      th.append(label, total, chartHost);
      renderInlineColumnChart(column, chartHost);
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

      (rowData.cells || []).forEach((cell) => {
        const td = document.createElement("td");
        td.className = "auspicious-lord-col";
        td.title = lordComparisonCellTitle(cell);
        td.appendChild(buildLordComparisonCellElement(cell));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
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
    setAuspiciousResultsView("top");
    setLordComparisonChrome("top");
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

  /* ---------- Kundali compare (2–5 births) ---------- */

  const compareToggleBtn = document.getElementById("compare-toggle-btn");
  const comparePanel = document.getElementById("kundali-compare-panel");
  const compareForm = document.getElementById("kundali-compare-form");
  const compareBirthsHost = document.getElementById("compare-births");
  const compareAddBtn = document.getElementById("compare-add-btn");
  let compareBirthCounter = 0;

  function buildPlaceSelectElement(selectedValue) {
    const select = document.createElement("select");
    select.className = "compare-place-preset";
    for (const opt of COMPARE_PLACE_OPTIONS) {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      if (opt.value === selectedValue) option.selected = true;
      select.appendChild(option);
    }
    return select;
  }

  function getPlaceFromCompareRow(rowEl) {
    const preset = rowEl.querySelector(".compare-place-preset");
    const custom = rowEl.querySelector(".compare-place-custom");
    if (!preset) return "";
    if (preset.value === AC.PLACE_CUSTOM_VALUE) {
      return (custom && custom.value.trim()) || "";
    }
    return preset.value.trim();
  }

  function syncCompareCustomPlace(rowEl) {
    const preset = rowEl.querySelector(".compare-place-preset");
    const wrap = rowEl.querySelector(".compare-custom-place-wrap");
    const custom = rowEl.querySelector(".compare-place-custom");
    const isCustom = preset && preset.value === AC.PLACE_CUSTOM_VALUE;
    if (wrap) wrap.hidden = !isCustom;
    if (!isCustom && custom) custom.value = "";
  }

  function createCompareBirthRow(index) {
    compareBirthCounter += 1;
    const row = document.createElement("div");
    row.className = "kundali-compare-birth search-form kundali-form";
    row.dataset.birthIndex = String(index);

    const placeField = document.createElement("div");
    placeField.className = "form-field";
    placeField.innerHTML = "<label>Place</label>";
    const placeSelect = buildPlaceSelectElement("");
    placeSelect.classList.add("compare-place-preset");
    placeField.appendChild(placeSelect);

    const customWrap = document.createElement("div");
    customWrap.className = "form-field compare-custom-place-wrap";
    customWrap.hidden = true;
    const customLabel = document.createElement("label");
    customLabel.textContent = "Custom Place";
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.className = "compare-place-custom";
    customInput.maxLength = AC.MAX_PLACE_QUERY_LENGTH;
    customInput.placeholder = "City, Country";
    customWrap.append(customLabel, customInput);

    const dateField = document.createElement("div");
    dateField.className = "form-field";
    dateField.innerHTML = "<label>Date</label>";
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.className = "compare-birth-date";
    dateInput.required = true;
    dateField.appendChild(dateInput);

    const timeField = document.createElement("div");
    timeField.className = "form-field";
    timeField.innerHTML = "<label>Time</label>";
    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.step = "1";
    timeInput.className = "compare-birth-time";
    timeInput.required = true;
    timeField.appendChild(timeInput);

    const removeField = document.createElement("div");
    removeField.className = "form-field form-field--submit kundali-compare-birth__remove-wrap";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-secondary";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      if (!compareBirthsHost) return;
      if (compareBirthsHost.querySelectorAll(".kundali-compare-birth").length <= COMPARE_MIN_BIRTHS) {
        showAuspiciousStatus(`At least ${COMPARE_MIN_BIRTHS} births are required for compare.`, true);
        return;
      }
      row.remove();
      renumberCompareBirths();
      updateCompareAddButton();
      updateCompareRemoveButtons();
    });
    removeField.appendChild(removeBtn);

    placeSelect.addEventListener("change", () => syncCompareCustomPlace(row));

    row.append(placeField, customWrap, dateField, timeField, removeField);
    return row;
  }

  function updateCompareRemoveButtons() {
    if (!compareBirthsHost) return;
    const rows = compareBirthsHost.querySelectorAll(".kundali-compare-birth");
    const showRemove = rows.length > COMPARE_MIN_BIRTHS;
    rows.forEach((row) => {
      const wrap = row.querySelector(".kundali-compare-birth__remove-wrap");
      if (wrap) wrap.hidden = !showRemove;
    });
  }

  function renumberCompareBirths() {
    if (!compareBirthsHost) return;
    compareBirthsHost.querySelectorAll(".kundali-compare-birth").forEach((row, idx) => {
      row.dataset.birthIndex = String(idx + 1);
    });
  }

  function updateCompareAddButton() {
    if (!compareAddBtn || !compareBirthsHost) return;
    const count = compareBirthsHost.querySelectorAll(".kundali-compare-birth").length;
    compareAddBtn.disabled = count >= COMPARE_MAX_BIRTHS;
    compareAddBtn.textContent =
      count >= COMPARE_MAX_BIRTHS
        ? `+ Add More (max ${COMPARE_MAX_BIRTHS})`
        : "+ Add More";
  }

  function initCompareBirthRows() {
    if (!compareBirthsHost) return;
    compareBirthsHost.replaceChildren();
    compareBirthsHost.appendChild(createCompareBirthRow(1));
    compareBirthsHost.appendChild(createCompareBirthRow(2));
    updateCompareAddButton();
    updateCompareRemoveButtons();
  }

  function validateCompareBirthRow(rowEl, index) {
    const date = rowEl.querySelector(".compare-birth-date")?.value?.trim();
    const time = rowEl.querySelector(".compare-birth-time")?.value?.trim();
    const place = getPlaceFromCompareRow(rowEl);
    const preset = rowEl.querySelector(".compare-place-preset");
    if (!preset?.value) return `Birth ${index}: select a place.`;
    if (preset.value === AC.PLACE_CUSTOM_VALUE && !place) {
      return `Birth ${index}: enter a custom place.`;
    }
    if (!date || !time) return `Birth ${index}: date and time are required.`;
    return null;
  }

  function collectCompareInputs() {
    const rows = compareBirthsHost
      ? [...compareBirthsHost.querySelectorAll(".kundali-compare-birth")]
      : [];
    const inputs = [];
    for (let i = 0; i < rows.length; i += 1) {
      const err = validateCompareBirthRow(rows[i], i + 1);
      if (err) return { error: err, inputs: [] };
      inputs.push({
        label: `Birth ${i + 1}`,
        date: rows[i].querySelector(".compare-birth-date").value.trim(),
        time: rows[i].querySelector(".compare-birth-time").value.trim(),
        place: getPlaceFromCompareRow(rows[i])
      });
    }
    if (inputs.length < COMPARE_MIN_BIRTHS) {
      return {
        error: `Add at least ${COMPARE_MIN_BIRTHS} births to compare.`,
        inputs: []
      };
    }
    return { error: null, inputs };
  }

  async function fetchKundaliCompareReport(births) {
    const path = AC.API_KUNDALI_COMPARE_PATH;
    const body = JSON.stringify({
      births: births.map((input) => ({
        date: input.date,
        time: normalizeCompareTime(input.time),
        place: input.place
      })),
      house_system: AC.DEFAULT_HOUSE_SYSTEM
    });
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.apiFetch) {
      const payload = await SaptarishiAuth.apiFetch(path, {
        method: "POST",
        body
      });
      SaptarishiAuth.updateUserFromApiPayload(payload);
      return payload;
    }
    const response = await fetch(`${getFlaskApiOrigin()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });
    const payload = await parseApiJsonResponse(response);
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }
    return payload;
  }

  async function handleCompareShow() {
    const collected = collectCompareInputs();
    if (collected.error) {
      showAuspiciousStatus(collected.error, true);
      return;
    }

    showAuspiciousLoading();
    if (auspiciousResultsEl) auspiciousResultsEl.hidden = true;
    const lordSection = document.getElementById("lord-comparison-section");
    if (lordSection) lordSection.hidden = true;

    try {
      if (window.SaptarishiKundaliView?.ensurePlanetDatabase) {
        await window.SaptarishiKundaliView.ensurePlanetDatabase();
      }
      const payload = await fetchKundaliCompareReport(collected.inputs);
      const comparison = payload.lord_comparison_table || {};
      setAuspiciousResultsView("compare");
      setLordComparisonChrome("compare");
      renderLordComparisonTable(comparison);
      if (!comparison.rows?.length) {
        if (auspiciousResultsEl) auspiciousResultsEl.hidden = true;
        showAuspiciousStatus(
          "No lord strength differences between these births.",
          true
        );
        return;
      }
      if (auspiciousResultsEl) auspiciousResultsEl.hidden = false;
      showAuspiciousStatus(
        payload.ui_status_message ||
          `Compared ${collected.inputs.length} births — lord strength table below.`
      );
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

  if (compareToggleBtn && comparePanel) {
    compareToggleBtn.addEventListener("click", () => {
      const show = comparePanel.hidden;
      comparePanel.hidden = !show;
      compareToggleBtn.setAttribute("aria-expanded", show ? "true" : "false");
      if (show && compareBirthsHost && !compareBirthsHost.childElementCount) {
        initCompareBirthRows();
      }
    });
  }

  if (compareAddBtn) {
    compareAddBtn.addEventListener("click", () => {
      if (!compareBirthsHost) return;
      const count = compareBirthsHost.querySelectorAll(".kundali-compare-birth").length;
      if (count >= COMPARE_MAX_BIRTHS) return;
      compareBirthsHost.appendChild(createCompareBirthRow(count + 1));
      renumberCompareBirths();
      updateCompareAddButton();
      updateCompareRemoveButtons();
    });
  }

  if (compareForm) {
    compareForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleCompareShow();
    });
  }

  initCompareBirthRows();
})();

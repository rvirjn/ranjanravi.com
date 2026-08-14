// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Kundali page: compare 2–5 births (lord strength table). */
(function kundaliComparePage() {
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  if (!C) return;
  const panel = document.getElementById("kundali-compare-panel");
  if (!panel) return;

  const COMPARE_MIN_BIRTHS = 2;
  const COMPARE_MAX_BIRTHS = 5;
  /** Extra birth rows in the compare panel (birth 1 is always the main form above). */
  const COMPARE_MIN_EXTRA_ROWS = 1;
  const COMPARE_MAX_EXTRA_ROWS = COMPARE_MAX_BIRTHS - 1;
  const COMPARE_PLACE_OPTIONS = [
    { value: "", label: "Select place…" },
    { value: "New Delhi, India", label: "New Delhi, India" },
    { value: "Mumbai, India", label: "Mumbai, India" },
    { value: "Kolkata, India", label: "Kolkata, India" },
    { value: "Bengaluru, India", label: "Bengaluru, India" },
    { value: "Patna, India", label: "Patna, India" },
    { value: "Motihari, India", label: "Motihari, India" },
    { value: C.PLACE_CUSTOM_VALUE, label: "Other…" }
  ];

  const compareToggleBtn = document.getElementById("compare-toggle-btn");
  const compareForm = document.getElementById("kundali-compare-form");
  const compareBirthsHost = document.getElementById("compare-births");
  const compareAddBtn = document.getElementById("compare-add-btn");
  const compareShowBtn = document.getElementById("compare-show-btn");
  const mainLeadEl = document.querySelector("#saptarishi.main-shell > p.lead");
  const resultsEl = document.getElementById("results");
  const singleResultsEl = document.getElementById("kundali-single-results");
  const page = window.SaptarishiKundaliPage || {};
  const lord = window.SaptarishiLordComparison;

  function showStatus(message, isError, isLimitError) {
    if (typeof page.showStatus === "function") {
      page.showStatus(message, isError, isLimitError);
    }
  }

  function showLoading() {
    if (typeof page.showLoading === "function") page.showLoading();
  }

  function formatError(err) {
    if (typeof page.formatError === "function") return page.formatError(err);
    return { text: String(err?.message || err), limitReached: false };
  }

  function getApiOrigin() {
    if (typeof page.getApiOrigin === "function") return page.getApiOrigin();
    if (CU && CU.getApiOrigin) return CU.getApiOrigin(C);
    return String(C.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  async function parseApiJsonResponse(response) {
    if (CU && CU.parseApiJsonResponse) {
      return CU.parseApiJsonResponse(response, {
        restartHint: `Restart Flask on port ${C.FLASK_PORT}.`
      });
    }
    const text = await response.text();
    return JSON.parse(text);
  }

  function normalizeCompareTime(timeS) {
    const raw = String(timeS || "").trim();
    if (/^\d{2}:\d{2}$/.test(raw)) return raw;
    if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw.slice(0, 5);
    return raw;
  }

  function setResultsView(mode) {
    if (singleResultsEl) singleResultsEl.hidden = mode === "compare";
  }

  function birthViewSelectKey(view) {
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.birthViewKey) {
      return SaptarishiAuth.birthViewKey(view);
    }
    if (!view || !view.name) return "";
    return String(view.name || "")
      .trim()
      .toLowerCase();
  }

  function birthViewOptionLabel(view) {
    if (!view) return "";
    if (view.name) return view.name;
    const when = [view.date, view.time].filter(Boolean).join(" ");
    return when || view.place || "Saved birth details";
  }

  function getSavedBirthViews() {
    return typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.getBirthViews
      ? SaptarishiAuth.getBirthViews()
      : [];
  }

  function populateCompareSavedSelect(selectEl, selectedKey) {
    if (!selectEl) return;
    const views = getSavedBirthViews();
    const previous = selectedKey || selectEl.value;
    selectEl.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = views.length ? "Select saved name…" : "No saved birth details yet";
    selectEl.appendChild(placeholder);
    views.forEach((view) => {
      const key = birthViewSelectKey(view);
      if (!key) return;
      const opt = document.createElement("option");
      opt.value = key;
      const detail = [view.date, view.place].filter(Boolean).join(" · ");
      opt.textContent = detail
        ? `${birthViewOptionLabel(view)} (${detail})`
        : birthViewOptionLabel(view);
      selectEl.appendChild(opt);
    });
    if (previous && [...selectEl.options].some((o) => o.value === previous)) {
      selectEl.value = previous;
    }
  }

  function refreshCompareSavedDropdowns() {
    compareBirthsHost.querySelectorAll(".compare-saved-birth").forEach((selectEl) => {
      populateCompareSavedSelect(selectEl);
    });
  }

  function applySavedBirthToCompareRow(rowEl, view) {
    if (!rowEl || !view || typeof SaptarishiAuth === "undefined") return;
    SaptarishiAuth.applyDefaultBirthToForm(
      {
        placePreset: rowEl.querySelector(".compare-place-preset"),
        placeCustom: rowEl.querySelector(".compare-place-custom"),
        customWrap: rowEl.querySelector(".compare-custom-place-wrap"),
        birthDate: rowEl.querySelector(".compare-birth-date"),
        birthTime: rowEl.querySelector(".compare-birth-time"),
        birthName: rowEl.querySelector(".compare-birth-name"),
        placeCustomValue: C.PLACE_CUSTOM_VALUE
      },
      view
    );
  }

  function applyCompareSavedSelection(rowEl) {
    const selectEl = rowEl.querySelector(".compare-saved-birth");
    const key = String(selectEl?.value || "").trim();
    if (!key) return;
    const view = getSavedBirthViews().find((entry) => birthViewSelectKey(entry) === key);
    if (view) applySavedBirthToCompareRow(rowEl, view);
  }

  function getCompareRowBirthInput(rowEl) {
    const selectEl = rowEl.querySelector(".compare-saved-birth");
    const key = String(selectEl?.value || "").trim();
    if (key) {
      const view = getSavedBirthViews().find((entry) => birthViewSelectKey(entry) === key);
      if (view) {
        return {
          name: String(view.name || "").trim(),
          date: String(view.date || "").trim(),
          time: String(view.time || "").trim(),
          place: String(view.place || "").trim()
        };
      }
    }
    return {
      name: rowEl.querySelector(".compare-birth-name")?.value?.trim() || "",
      date: rowEl.querySelector(".compare-birth-date")?.value?.trim() || "",
      time: rowEl.querySelector(".compare-birth-time")?.value?.trim() || "",
      place: getPlaceFromCompareRow(rowEl)
    };
  }

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
    if (CU && CU.getPlaceFromPresetOrCustom) {
      return CU.getPlaceFromPresetOrCustom(preset, custom, C.PLACE_CUSTOM_VALUE);
    }
    if (!preset) return "";
    return preset.value === C.PLACE_CUSTOM_VALUE ? (custom && custom.value.trim()) || "" : preset.value.trim();
  }

  function syncCompareCustomPlace(rowEl) {
    const preset = rowEl.querySelector(".compare-place-preset");
    const wrap = rowEl.querySelector(".compare-custom-place-wrap");
    const custom = rowEl.querySelector(".compare-place-custom");
    if (CU && CU.syncCustomPlaceVisibility) {
      CU.syncCustomPlaceVisibility(preset, wrap, custom, C.PLACE_CUSTOM_VALUE);
      return;
    }
    const isCustom = preset && preset.value === C.PLACE_CUSTOM_VALUE;
    if (wrap) wrap.hidden = !isCustom;
    if (!isCustom && custom) custom.value = "";
  }

  function createCompareBirthRow(index) {
    const row = document.createElement("div");
    row.className = "kundali-compare-birth search-form kundali-form";
    row.dataset.birthIndex = String(index);

    const savedField = document.createElement("div");
    savedField.className = "form-field compare-saved-wrap";
    const savedLabel = document.createElement("label");
    savedLabel.textContent = "Saved birth details";
    const savedSelect = document.createElement("select");
    savedSelect.className = "compare-saved-birth";
    populateCompareSavedSelect(savedSelect);
    savedField.append(savedLabel, savedSelect);

    const nameField = document.createElement("div");
    nameField.className = "form-field compare-name-wrap";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Name";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.className = "compare-birth-name";
    nameInput.maxLength = 120;
    nameInput.placeholder = "Enter name";
    nameField.append(nameLabel, nameInput);

    const placeField = document.createElement("div");
    placeField.className = "form-field";
    placeField.innerHTML = "<label>Place</label>";
    const placeSelect = buildPlaceSelectElement("");
    placeField.appendChild(placeSelect);

    const customWrap = document.createElement("div");
    customWrap.className = "form-field compare-custom-place-wrap";
    customWrap.hidden = true;
    const customLabel = document.createElement("label");
    customLabel.textContent = "Custom Place";
    const customInput = document.createElement("input");
    customInput.type = "text";
    customInput.className = "compare-place-custom";
    customInput.maxLength = C.MAX_PLACE_QUERY_LENGTH;
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
    timeField.appendChild(timeInput);

    const removeField = document.createElement("div");
    removeField.className = "form-field form-field--submit kundali-compare-birth__remove-wrap";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn-secondary";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      if (compareBirthsHost.querySelectorAll(".kundali-compare-birth").length <= COMPARE_MIN_EXTRA_ROWS) {
        showStatus(`At least ${COMPARE_MIN_EXTRA_ROWS} more birth is required for compare.`, true);
        return;
      }
      row.remove();
      renumberCompareBirths();
      updateCompareAddButton();
      updateCompareRemoveButtons();
    });
    removeField.appendChild(removeBtn);

    placeSelect.addEventListener("change", () => syncCompareCustomPlace(row));
    savedSelect.addEventListener("change", () => applyCompareSavedSelection(row));

    row.append(savedField, nameField, placeField, customWrap, dateField, timeField, removeField);
    return row;
  }

  function updateCompareRemoveButtons() {
    const rows = compareBirthsHost.querySelectorAll(".kundali-compare-birth");
    const showRemove = rows.length > COMPARE_MIN_EXTRA_ROWS;
    rows.forEach((row) => {
      const wrap = row.querySelector(".kundali-compare-birth__remove-wrap");
      if (wrap) wrap.hidden = !showRemove;
    });
  }

  function renumberCompareBirths() {
    compareBirthsHost.querySelectorAll(".kundali-compare-birth").forEach((row, idx) => {
      row.dataset.birthIndex = String(idx + 1);
    });
  }

  function updateCompareAddButton() {
    if (!compareAddBtn) return;
    const count = compareBirthsHost.querySelectorAll(".kundali-compare-birth").length;
    compareAddBtn.disabled = count >= COMPARE_MAX_EXTRA_ROWS;
    compareAddBtn.textContent =
      count >= COMPARE_MAX_EXTRA_ROWS
        ? `+ Add More (max ${COMPARE_MAX_BIRTHS} births)`
        : "+ Add More";
  }

  function initCompareBirthRows() {
    compareBirthsHost.replaceChildren();
    compareBirthsHost.appendChild(createCompareBirthRow(1));
    updateCompareAddButton();
    updateCompareRemoveButtons();
  }

  function getMainBirthInput() {
    if (typeof page.getMainBirthInput === "function") {
      return page.getMainBirthInput();
    }
    return { date: "", time: "", place: "" };
  }

  function validateMainBirthForm() {
    if (typeof page.validateMainBirthForm === "function") {
      return page.validateMainBirthForm();
    }
    return "Enter birth details in the form above.";
  }

  function validateCompareBirthRow(rowEl, index) {
    const input = getCompareRowBirthInput(rowEl);
    const savedKey = String(rowEl.querySelector(".compare-saved-birth")?.value || "").trim();
    if (savedKey) {
      if (!input.date || !input.time || !input.place) {
        return `Birth ${index}: saved birth details are incomplete.`;
      }
      return null;
    }
    if (!input.name) return `Birth ${index}: enter a name for new birth details.`;
    const preset = rowEl.querySelector(".compare-place-preset");
    if (!preset?.value) return `Birth ${index}: select a place.`;
    if (preset.value === C.PLACE_CUSTOM_VALUE && !input.place) {
      return `Birth ${index}: enter a custom place.`;
    }
    if (!input.date || !input.time) return `Birth ${index}: date and time are required.`;
    return null;
  }

  function collectCompareInputs() {
    const mainErr = validateMainBirthForm();
    if (mainErr) {
      return { error: `Birth 1 (form above): ${mainErr}`, inputs: [] };
    }
    const inputs = [getMainBirthInput()];
    const rows = [...compareBirthsHost.querySelectorAll(".kundali-compare-birth")];
    for (let i = 0; i < rows.length; i += 1) {
      const err = validateCompareBirthRow(rows[i], i + 2);
      if (err) return { error: err, inputs: [] };
      const rowInput = getCompareRowBirthInput(rows[i]);
      inputs.push({
        date: rowInput.date,
        time: rowInput.time,
        place: rowInput.place
      });
    }
    if (inputs.length < COMPARE_MIN_BIRTHS) {
      return {
        error: `Add at least ${COMPARE_MIN_EXTRA_ROWS} more birth below to compare.`,
        inputs: []
      };
    }
    return { error: null, inputs };
  }

  async function fetchKundaliCompareReport(births) {
    const path = C.API_KUNDALI_COMPARE_PATH;
    const body = JSON.stringify({
      births: births.map((input) => ({
        date: input.date,
        time: normalizeCompareTime(input.time),
        place: input.place
      })),
      house_system: C.DEFAULT_HOUSE_SYSTEM
    });
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.apiFetch) {
      const payload = await SaptarishiAuth.apiFetch(path, {
        method: "POST",
        body
      });
      SaptarishiAuth.updateUserFromApiPayload(payload);
      return payload;
    }
    const response = await fetch(`${getApiOrigin()}${path}`, {
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
      showStatus(collected.error, true);
      return;
    }

    showLoading();
    if (resultsEl) resultsEl.hidden = true;
    const lordSection = document.getElementById("lord-comparison-section");
    if (lordSection) lordSection.hidden = true;

    try {
      if (window.SaptarishiKundaliView?.ensurePlanetDatabase) {
        await window.SaptarishiKundaliView.ensurePlanetDatabase();
      }
      const payload = await fetchKundaliCompareReport(collected.inputs);
      const comparison = payload.lord_comparison_table || {};
      const lordRef = window.SaptarishiLordComparison;
      setResultsView("compare");
      if (lordRef) {
        lordRef.setChrome("compare");
        lordRef.renderTable(comparison);
      }
      if (!comparison.rows?.length) {
        if (resultsEl) resultsEl.hidden = true;
        showStatus("No lord strength data returned for these births.", true);
        return;
      }
      if (resultsEl) resultsEl.hidden = false;
      showStatus(
        payload.ui_status_message ||
          `Compared ${collected.inputs.length} births — lord strength table below.`
      );
    } catch (err) {
      const formatted = formatError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        await SaptarishiAuth.handlePremiumRequired(err);
      }
    }
  }

  if (compareToggleBtn) {
    compareToggleBtn.addEventListener("click", () => {
      const show = panel.hidden;
      panel.hidden = !show;
      compareToggleBtn.setAttribute("aria-expanded", show ? "true" : "false");
      if (mainLeadEl) mainLeadEl.hidden = show;
      if (show) {
        if (!compareBirthsHost.childElementCount) initCompareBirthRows();
        refreshCompareSavedDropdowns();
        if (typeof page.refreshSavedViews === "function") page.refreshSavedViews();
      }
    });
  }

  if (compareAddBtn) {
    compareAddBtn.addEventListener("click", () => {
      const count = compareBirthsHost.querySelectorAll(".kundali-compare-birth").length;
      if (count >= COMPARE_MAX_EXTRA_ROWS) return;
      compareBirthsHost.appendChild(createCompareBirthRow(count + 1));
      renumberCompareBirths();
      updateCompareAddButton();
      updateCompareRemoveButtons();
    });
  }

  if (compareShowBtn) {
    compareShowBtn.addEventListener("click", (event) => {
      event.preventDefault();
      handleCompareShow();
    });
  }

  if (compareForm) {
    compareForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleCompareShow();
    });
  }

  window.SaptarishiKundaliCompare = {
    refreshSavedDropdowns: refreshCompareSavedDropdowns
  };

})();

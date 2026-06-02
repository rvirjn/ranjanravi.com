// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Auspicious page (loaded after kundali.js on auspicious.html). */
(function auspiciousPage() {
  const AC = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  if (!AC) return;

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

  function addMonthsToDate(date, months) {
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
      dateTo.value = formatDateInputValue(addMonthsToDate(today, 1));
    }
  }

  function getFlaskApiOrigin() {
    if (CU && CU.getApiOrigin) return CU.getApiOrigin(AC);
    return String(AC.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
  }

  function showAuspiciousStatus(message, isError, isLimitError) {
    if (CU && CU.setStatusMessage) {
      CU.setStatusMessage(auspiciousStatusEl, message, isError, isLimitError);
      return;
    }
    if (!auspiciousStatusEl) return;
    const text = message || "";
    auspiciousStatusEl.textContent = text;
    auspiciousStatusEl.hidden = !text;
    auspiciousStatusEl.classList.toggle("error", Boolean(isError));
    auspiciousStatusEl.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function showAuspiciousLoading() {
    if (CU && CU.startStatusLoading) {
      CU.startStatusLoading(auspiciousStatusEl, showAuspiciousStatus);
      return;
    }
    showAuspiciousStatus("Loading…");
  }

  function stripPerIpWording(message) {
    if (CU && CU.removePerIpText) return CU.removePerIpText(message);
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatAuspiciousLoadError(err) {
    if (CU && CU.formatApiLoadError) {
      return CU.formatApiLoadError(err, {
        failurePrefix: "Failed to load auspicious times",
        limitReachedFallback: "Free auspicious limit reached."
      });
    }
    const msg = stripPerIpWording(err?.message || "Request failed");
    return { text: `Failed to load auspicious times: ${msg}`, limitReached: false };
  }

  function getPlaceFromForm() {
    if (CU && CU.getPlaceFromPresetOrCustom) {
      return CU.getPlaceFromPresetOrCustom(
        auspiciousPlacePreset,
        auspiciousPlaceCustom,
        AC.PLACE_CUSTOM_VALUE
      );
    }
    if (!auspiciousPlacePreset) return "";
    if (auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE) {
      return (auspiciousPlaceCustom && auspiciousPlaceCustom.value.trim()) || "";
    }
    return auspiciousPlacePreset.value.trim();
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

  function validateAuspiciousFormInput(place) {
    if (!auspiciousPlacePreset.value) return "Select a place.";
    if (auspiciousPlacePreset.value === AC.PLACE_CUSTOM_VALUE && !place) {
      return "Enter a custom place.";
    }
    if (!dateFrom.value || !dateTo.value) return "From and to dates are required.";
    if (dateTo.value < dateFrom.value) return "To date must be on or after from date.";
    return null;
  }

  function syncCustomPlaceFieldVisibility() {
    if (CU && CU.syncCustomPlaceVisibility) {
      CU.syncCustomPlaceVisibility(
        auspiciousPlacePreset,
        auspiciousCustomWrap,
        auspiciousPlaceCustom,
        AC.PLACE_CUSTOM_VALUE
      );
      return;
    }
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

  function renderAuspiciousResponseIntoPage(payload) {
    const summaryRenderer = window.SaptarishiKundaliView?.renderSummaryTable;
    if (summaryRenderer) {
      summaryRenderer(document.querySelector("#summary-table tbody"), payload.summary_table);
    }
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
    const validationError = validateAuspiciousFormInput(place);
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

// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Remedy page: birth details → auspicious nava-tara buttons → detail below each button. */

(function remedyPage() {
  const C =
    typeof SAPTARISHI_CONSTANTS !== "undefined"
      ? SAPTARISHI_CONSTANTS
      : {
          PLACE_CUSTOM_VALUE: "__custom__",
          API_PLANET_DATABASE_PATH: "/api/planet-database"
        };

  const REMEDY_TABLE_HEADERS = [
    "Nakshatra",
    "Navatara",
    "Symbol",
    "Ruling Planet",
    "Deity",
    "Tree",
    "Directions",
    "Lunar Month",
    "Tithi",
    "Remedy",
    "Mantra",
    "Animal",
    "Colors",
    "Number",
    "Day",
    "Time"
  ];

  const form = document.getElementById("remedy-form");
  if (!form) return;

  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  const buttonsHost = document.getElementById("navatara-buttons");
  const placePreset = document.getElementById("place-preset");
  const customWrap = document.getElementById("custom-place-wrap");
  const placeCustom = document.getElementById("place-custom");
  const birthDate = document.getElementById("birth-date");
  const birthTime = document.getElementById("birth-time");

  const KV = window.SaptarishiKundaliView;
  let cachedNakshatraRows = [];
  let selectedNavataraKey = "";

  function normalizeText(value) {
    if (KV && KV.normalizeText) return KV.normalizeText(value);
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function formatNavataraName(value) {
    if (KV && KV.formatNavataraName) return KV.formatNavataraName(value);
    return String(value ?? "").trim();
  }

  function showStatus(message, isError, isLimitError) {
    if (!statusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.stop(statusEl);
    }
    const text = message || "";
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle("error", Boolean(isError));
    statusEl.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function showLoadingStatus() {
    if (!statusEl) return;
    if (globalThis.SaptarishiLoading) {
      globalThis.SaptarishiLoading.start(statusEl);
      return;
    }
    showStatus("Loading…");
  }

  function getBirthPlaceFromForm() {
    if (!placePreset) return "";
    if (placePreset.value === C.PLACE_CUSTOM_VALUE) {
      return (placeCustom && placeCustom.value.trim()) || "";
    }
    return placePreset.value.trim();
  }

  function syncCustomPlaceFieldVisibility() {
    const isCustom = placePreset && placePreset.value === C.PLACE_CUSTOM_VALUE;
    if (customWrap) customWrap.hidden = !isCustom;
    if (!isCustom && placeCustom) placeCustom.value = "";
  }

  function validateBirthForm(place) {
    if (!placePreset.value) return "Select a place.";
    if (placePreset.value === C.PLACE_CUSTOM_VALUE && !place) return "Enter a custom place.";
    if (!birthDate.value || !birthTime.value) return "Date and time are required.";
    return null;
  }

  async function loadNavataraDefinitions() {
    if (KV && KV.ensurePlanetDatabase) {
      const db = await KV.ensurePlanetDatabase();
      const list = db && db.nava_tara && db.nava_tara.navatara;
      if (Array.isArray(list) && list.length) return list;
    }
    const origin =
      typeof SaptarishiAuth !== "undefined"
        ? SaptarishiAuth.apiOrigin()
        : `http://localhost:${C.FLASK_PORT || 8081}`;
    const response = await fetch(`${origin}${C.API_PLANET_DATABASE_PATH || "/api/planet-database"}`);
    const db = await response.json();
    return (db.nava_tara && db.nava_tara.navatara) || [];
  }

  function navataraResultLabel(def) {
    const result = String(def.result || "").trim();
    if (!result) return "";
    return /^for\s/i.test(result) ? result : `For ${result}`;
  }

  function auspiciousNavataraDefinitions(definitions) {
    return (definitions || []).filter(
      (def) => normalizeText(def.auspicious) === "yes" && String(def.name || "").trim()
    );
  }

  function rowsForNavatara(navataraName) {
    const key = normalizeText(navataraName);
    return cachedNakshatraRows.filter(
      (row) => normalizeText(row.navatara) === key && normalizeText(row.auspicious) === "yes"
    );
  }

  function createRemedyTableElement() {
    const table = document.createElement("table");
    table.className = "navatara-data-table kundali-table remedy-table";
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of REMEDY_TABLE_HEADERS) {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    return table;
  }

  function closeAllNavataraPanels() {
    if (!buttonsHost) return;
    buttonsHost.querySelectorAll(".remedy-navatara-panel").forEach((panel) => {
      panel.hidden = true;
    });
    buttonsHost.querySelectorAll(".remedy-navatara-btn").forEach((btn) => {
      btn.classList.remove("remedy-navatara-btn--active");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function showNavataraDetail(def, itemEl) {
    const rows = rowsForNavatara(def.name);
    const panel = itemEl && itemEl.querySelector(".remedy-navatara-panel");
    const btn = itemEl && itemEl.querySelector(".remedy-navatara-btn");
    const tbody = panel && panel.querySelector("tbody");
    const navataraKey = normalizeText(def.name);

    if (selectedNavataraKey === navataraKey && panel && !panel.hidden) {
      closeAllNavataraPanels();
      selectedNavataraKey = "";
      showStatus("");
      return;
    }

    closeAllNavataraPanels();
    selectedNavataraKey = navataraKey;

    if (!rows.length) {
      showStatus(
        `No auspicious nakshatra row found for ${formatNavataraName(def.name)} on this chart.`,
        true
      );
      return;
    }

    if (btn) {
      btn.classList.add("remedy-navatara-btn--active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-expanded", "true");
    }

    if (panel) panel.hidden = false;

    if (KV && KV.renderNakshatraTableWithColors && tbody) {
      KV.renderNakshatraTableWithColors(tbody, rows);
    }

    showStatus("");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderNavataraButtons(definitions) {
    if (!buttonsHost) return;
    buttonsHost.innerHTML = "";
    selectedNavataraKey = "";

    const auspicious = auspiciousNavataraDefinitions(definitions);
    if (!auspicious.length) {
      buttonsHost.textContent = "No auspicious nava-tara definitions found.";
      return;
    }

    for (const def of auspicious) {
      const item = document.createElement("div");
      item.className = "remedy-navatara-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remedy-navatara-btn";
      btn.dataset.navataraKey = normalizeText(def.name);
      btn.textContent = navataraResultLabel(def);
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");

      const panel = document.createElement("div");
      panel.className = "remedy-navatara-panel";
      panel.hidden = true;

      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap nakshatra-table-wrap remedy-navatara-panel__table";
      tableWrap.appendChild(createRemedyTableElement());
      panel.appendChild(tableWrap);

      btn.addEventListener("click", () => showNavataraDetail(def, item));

      item.appendChild(btn);
      item.appendChild(panel);
      buttonsHost.appendChild(item);
    }
  }

  function stripPerIpWording(message) {
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatLoadError(err) {
    const msg = stripPerIpWording(err?.message || "Request failed");
    const limitReached =
      Boolean(err?.premiumRequired) || /limit reached/i.test(msg);
    return {
      text: limitReached ? msg || "Free kundali limit reached." : `Failed to load remedy: ${msg}`,
      limitReached
    };
  }

  async function handleRemedyFormSubmit(event) {
    event.preventDefault();
    const place = getBirthPlaceFromForm();
    const validationError = validateBirthForm(place);
    if (validationError) {
      showStatus(validationError, true);
      return;
    }

    if (!KV || !KV.fetchJson) {
      showStatus("Kundali helpers failed to load.", true);
      return;
    }

    showLoadingStatus();
    if (resultsEl) resultsEl.hidden = true;

    try {
      const [kundaliPayload, definitions] = await Promise.all([
        KV.fetchJson(birthDate.value, birthTime.value, place),
        loadNavataraDefinitions()
      ]);

      cachedNakshatraRows = kundaliPayload.nakshatras || [];
      renderNavataraButtons(definitions);

      if (resultsEl) resultsEl.hidden = false;
      showStatus("nava-tara generated successfully.");
    } catch (err) {
      const formatted = formatLoadError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        await SaptarishiAuth.handlePremiumRequired(err);
      }
    }
  }

  if (placePreset) {
    placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }
  form.addEventListener("submit", handleRemedyFormSubmit);
})();

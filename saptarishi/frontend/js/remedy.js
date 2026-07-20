// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Remedy page: birth details → debilitated planet remedies + auspicious nava-tara. */

(function remedyPage() {
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  if (!C) return;

  const PLANET_REMEDY_COLUMNS = C.PLANET_REMEDY_COLUMNS || [];
  const REMEDY_TABLE_HEADERS = C.REMEDY_NAKSHATRA_TABLE_HEADERS || [];

  const form = document.getElementById("remedy-form");
  if (!form) return;

  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  const buttonsHost = document.getElementById("navatara-buttons");
  const planetRemedyBody = document.querySelector("#planet-remedy-table tbody");
  const planetRemedyEmpty = document.getElementById("planet-remedy-empty");
  const placePreset = document.getElementById("place-preset");
  const customWrap = document.getElementById("custom-place-wrap");
  const placeCustom = document.getElementById("place-custom");
  const birthDate = document.getElementById("birth-date");
  const birthTime = document.getElementById("birth-time");

  const KV = window.SaptarishiKundaliView;
  let cachedNakshatraRows = [];
  let selectedNavataraKey = "";
  let planetRemedyByName = {};

  function normalizeText(value) {
    if (KV && KV.normalizeText) return KV.normalizeText(value);
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  function toTitleCaseWords(value) {
    if (KV && KV.toTitleCaseWords) return KV.toTitleCaseWords(value);
    return String(value ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  function formatNavataraName(value) {
    if (KV && KV.formatNavataraName) return KV.formatNavataraName(value);
    return String(value ?? "").trim();
  }

  function showRemedyStatus(message, isError, isLimitError) {
    if (CU && CU.setStatusMessage) {
      CU.setStatusMessage(statusEl, message, isError, isLimitError);
      return;
    }
    if (!statusEl) return;
    const text = message || "";
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle("error", Boolean(isError));
    statusEl.classList.toggle("status--limit", Boolean(isLimitError));
  }

  function showRemedyLoadingStatus() {
    if (CU && CU.startStatusLoading) {
      CU.startStatusLoading(statusEl, showRemedyStatus);
      return;
    }
    showRemedyStatus("Loading…");
  }

  function getBirthPlaceFromRemedyForm() {
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

  function validateRemedyBirthForm(place) {
    if (!placePreset.value) return "Select a place.";
    if (placePreset.value === C.PLACE_CUSTOM_VALUE && !place) return "Enter a custom place.";
    if (!birthDate.value || !birthTime.value) return "Date and time are required.";
    return null;
  }

  async function loadPlanetDatabase() {
    if (KV && KV.ensurePlanetDatabase) {
      return (await KV.ensurePlanetDatabase()) || {};
    }
    const origin =
      typeof SaptarishiAuth !== "undefined"
        ? SaptarishiAuth.apiOrigin()
        : `http://localhost:${C.FLASK_PORT}`;
    const response = await fetch(`${origin}${C.API_PLANET_DATABASE_PATH}`);
    return response.json();
  }

  function buildPlanetRemedyLookup(db) {
    const out = {};
    for (const planet of db?.planets || []) {
      const name = normalizeText(planet?.name);
      if (!name || name === "ascendant") continue;
      if (planet?.remedy && typeof planet.remedy === "object") {
        out[name] = planet.remedy;
      }
    }
    return out;
  }

  /** Planets needing remedy: debilitated or placed in 6/8/12 houses. */
  function remedyPlanetNamesFromKundali(kundaliPayload) {
    const names = [];
    const add = (raw) => {
      const key = normalizeText(raw);
      if (!key || key === "ascendant" || names.includes(key)) return;
      names.push(key);
    };
    for (const row of kundaliPayload?.planets_table || []) {
      const status = normalizeText(row?.status?.rashi || row?.planet_status_in_rashi);
      if (status === "low") add(row?.planet);
    }
    for (const planet of kundaliPayload?.planets || []) {
      if (normalizeText(planet?.planet_dignity) === "debilitated") {
        add(planet?.name);
      }
      if (normalizeText(planet?.is_planet_in_6_8_12_house) === "yes") {
        add(planet?.name);
      }
    }
    for (const row of kundaliPayload?.summary_table || []) {
      if (normalizeText(row?.label) !== "debilitated planet") continue;
      const value = String(row?.value || "").trim();
      if (!value || /^none$/i.test(value)) continue;
      value.split(",").forEach((part) => add(part));
    }
    const order = C.PLANET_DISPLAY_ORDER || C.VIMSHOTTARI_PLANET_ORDER || [];
    names.sort((a, b) => {
      const ai = order.indexOf(a);
      const bi = order.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });
    return names;
  }

  function renderPlanetRemedyTable(kundaliPayload) {
    if (!planetRemedyBody) return;
    planetRemedyBody.innerHTML = "";
    const remedyPlanets = remedyPlanetNamesFromKundali(kundaliPayload);
    if (!remedyPlanets.length) {
      if (planetRemedyEmpty) planetRemedyEmpty.hidden = false;
      return;
    }
    if (planetRemedyEmpty) planetRemedyEmpty.hidden = true;
    for (const planetKey of remedyPlanets) {
      const remedy = planetRemedyByName[planetKey] || {};
      const tr = document.createElement("tr");
      for (const col of PLANET_REMEDY_COLUMNS) {
        const td = document.createElement("td");
        if (col.key === "planet") {
          td.className = "planets-td-planet";
          td.textContent = toTitleCaseWords(planetKey);
        } else {
          const text = String(remedy[col.key] || "").trim();
          td.textContent = text || "—";
        }
        tr.appendChild(td);
      }
      planetRemedyBody.appendChild(tr);
    }
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

  function navataraDefinitionsForTiles(definitions, nakshatraRows) {
    const helpfulNavataraKeys = new Set(
      (nakshatraRows || [])
        .filter((row) => normalizeText(row.auspicious) === "yes")
        .map((row) => normalizeText(row.navatara))
        .filter(Boolean)
    );
    return auspiciousNavataraDefinitions(definitions).filter((def) =>
      helpfulNavataraKeys.has(normalizeText(def.name))
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
      showRemedyStatus("");
      return;
    }

    closeAllNavataraPanels();
    selectedNavataraKey = navataraKey;

    if (!rows.length) {
      showRemedyStatus(
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

    showRemedyStatus("");
    if (panel) {
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderNavataraButtons(definitions) {
    if (!buttonsHost) return;
    buttonsHost.innerHTML = "";
    selectedNavataraKey = "";

    const auspicious = navataraDefinitionsForTiles(definitions, cachedNakshatraRows);
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
    if (CU && CU.removePerIpText) return CU.removePerIpText(message);
    return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
  }

  function formatLoadError(err) {
    if (CU && CU.formatApiLoadError) {
      return CU.formatApiLoadError(err, {
        failurePrefix: "Failed to load remedy",
        limitReachedFallback: "Free kundali limit reached."
      });
    }
    const msg = stripPerIpWording(err?.message || "Request failed");
    return { text: `Failed to load remedy: ${msg}`, limitReached: false };
  }

  async function handleRemedyFormSubmit(event) {
    event.preventDefault();
    const place = getBirthPlaceFromRemedyForm();
    const validationError = validateRemedyBirthForm(place);
    if (validationError) {
      showRemedyStatus(validationError, true);
      return;
    }

    if (!KV || !KV.fetchJson) {
      showRemedyStatus("Kundali helpers failed to load.", true);
      return;
    }

    showRemedyLoadingStatus();
    if (resultsEl) resultsEl.hidden = true;

    try {
      const [kundaliPayload, db] = await Promise.all([
        KV.fetchJson(birthDate.value, birthTime.value, place),
        loadPlanetDatabase()
      ]);

      planetRemedyByName = buildPlanetRemedyLookup(db);
      cachedNakshatraRows = kundaliPayload.nakshatras || [];
      renderPlanetRemedyTable(kundaliPayload);
      renderNavataraButtons((db.nava_tara && db.nava_tara.navatara) || []);

      if (resultsEl) resultsEl.hidden = false;
      showRemedyStatus("Remedy generated successfully.");
    } catch (err) {
      const formatted = formatLoadError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showRemedyStatus(formatted.text, true, formatted.limitReached);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        await SaptarishiAuth.handlePremiumRequired(err);
      }
    }
  }

  function initDefaultBirthFromUser() {
    if (typeof SaptarishiAuth === "undefined" || !SaptarishiAuth.getToken()) return;
    SaptarishiAuth.refreshDefaultBirthForm({
      placePreset,
      placeCustom,
      customWrap,
      birthDate,
      birthTime,
      placeCustomValue: C.PLACE_CUSTOM_VALUE
    }).catch(() => {});
  }

  if (placePreset) {
    placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }
  form.addEventListener("submit", handleRemedyFormSubmit);
  initDefaultBirthFromUser();
  globalThis.addEventListener("saptarishi-auth-changed", () => {
    initDefaultBirthFromUser();
  });
})();

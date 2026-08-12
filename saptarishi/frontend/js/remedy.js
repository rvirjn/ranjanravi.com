// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Remedy page: dusthana / debilitated / dosh remedies + auspicious nava-tara. */

(function remedyPage() {
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  if (!C) return;

  const PLANET_REMEDY_COLUMNS = C.PLANET_REMEDY_COLUMNS || [];
  const DOSH_REMEDY_DETAIL_COLUMNS = PLANET_REMEDY_COLUMNS.filter(
    (col) => col && col.key !== "planet"
  );
  const REMEDY_TABLE_HEADERS = C.REMEDY_NAKSHATRA_TABLE_HEADERS || [];

  const form = document.getElementById("remedy-form");
  if (!form) return;

  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("results");
  const buttonsHost = document.getElementById("navatara-buttons");
  const dusthanaRemedyHeading = document.getElementById("dusthana-remedy-heading");
  const dusthanaRemedyButtons = document.getElementById("dusthana-remedy-buttons");
  const dusthanaRemedyEmpty = document.getElementById("dusthana-remedy-empty");
  const debilitatedRemedyHeading = document.getElementById("debilitated-remedy-heading");
  const debilitatedRemedyButtons = document.getElementById("debilitated-remedy-buttons");
  const debilitatedRemedyEmpty = document.getElementById("debilitated-remedy-empty");
  const doshRemedyHeading = document.getElementById("dosh-remedy-heading");
  const doshRemedyButtons = document.getElementById("dosh-remedy-buttons");
  const doshRemedyEmpty = document.getElementById("dosh-remedy-empty");
  const placePreset = document.getElementById("place-preset");
  const customWrap = document.getElementById("custom-place-wrap");
  const placeCustom = document.getElementById("place-custom");
  const birthDate = document.getElementById("birth-date");
  const birthTime = document.getElementById("birth-time");
  const birthName = document.getElementById("birth-name");
  const birthNameWrap = document.getElementById("birth-name-wrap");
  const openBirthWrap = document.getElementById("open-birth-wrap");
  const savedBirthSelect = document.getElementById("saved-birth-select");
  const tabOpenBirth = document.getElementById("tab-open-birth");
  const tabNewBirth = document.getElementById("tab-new-birth");

  const KV = window.SaptarishiKundaliView;
  let birthMode = "new";
  let cachedNakshatraRows = [];
  let selectedNavataraKey = "";
  let selectedRemedyTileKeyByHost = {
    dusthana: "",
    debilitated: "",
    dosh: ""
  };
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
    if (birthMode === "new" && birthName && !String(birthName.value || "").trim()) {
      return "Enter a name to save these birth details.";
    }
    if (birthMode === "open" && savedBirthSelect && !savedBirthSelect.value) {
      return "Select saved birth details.";
    }
    if (!placePreset.value) return "Select a place.";
    if (placePreset.value === C.PLACE_CUSTOM_VALUE && !place) return "Enter a custom place.";
    if (!birthDate.value || !birthTime.value) return "Date and time are required.";
    return null;
  }

  function birthViewOptionLabel(view) {
    if (!view) return "";
    if (view.name) return view.name;
    const when = [view.date, view.time].filter(Boolean).join(" ");
    return when || view.place || "Saved birth details";
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

  function refreshSavedBirthDropdown() {
    if (!savedBirthSelect || typeof SaptarishiAuth === "undefined") return;
    const views = SaptarishiAuth.getBirthViews ? SaptarishiAuth.getBirthViews() : [];
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
      const detail = [view.date, view.place].filter(Boolean).join(" · ");
      opt.textContent = detail
        ? `${birthViewOptionLabel(view)} (${detail})`
        : birthViewOptionLabel(view);
      savedBirthSelect.appendChild(opt);
    });
    if (previous && [...savedBirthSelect.options].some((o) => o.value === previous)) {
      savedBirthSelect.value = previous;
    }
  }

  function applySavedBirthSelection() {
    if (!savedBirthSelect || typeof SaptarishiAuth === "undefined") return;
    const views = SaptarishiAuth.getBirthViews ? SaptarishiAuth.getBirthViews() : [];
    const key = String(savedBirthSelect.value || "").trim();
    if (!key) return;
    const view = views.find((entry) => birthViewSelectKey(entry) === key);
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

  function setBirthMode(mode) {
    birthMode = mode === "open" ? "open" : "new";
    const isOpen = birthMode === "open";
    if (tabOpenBirth) {
      tabOpenBirth.classList.toggle("kundali-tabs__item--active", isOpen);
      tabOpenBirth.setAttribute("aria-selected", isOpen ? "true" : "false");
    }
    if (tabNewBirth) {
      tabNewBirth.classList.toggle("kundali-tabs__item--active", !isOpen);
      tabNewBirth.setAttribute("aria-selected", !isOpen ? "true" : "false");
    }
    if (openBirthWrap) openBirthWrap.hidden = !isOpen;
    if (birthNameWrap) birthNameWrap.hidden = isOpen;
    if (isOpen) {
      refreshSavedBirthDropdown();
      applySavedBirthSelection();
    }
  }

  function refreshRemedySavedViews() {
    refreshSavedBirthDropdown();
    if (birthMode === "open") applySavedBirthSelection();
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

  /** Collect planet keys by affliction reason (debilitated / dusthana 6-8-12). */
  function remedyPlanetKeysByReason(kundaliPayload) {
    const debilitated = new Set();
    const dusthana = new Set();

    const addTo = (set, raw) => {
      const key = normalizeText(raw);
      if (!key || key === "ascendant") return;
      set.add(key);
    };

    const addFromSummaryList = (label, set) => {
      for (const row of kundaliPayload?.summary_table || []) {
        if (normalizeText(row?.label) !== label) continue;
        const value = String(row?.value || "").trim();
        if (!value || /^none$/i.test(value)) continue;
        value.split(",").forEach((part) => addTo(set, part));
      }
    };

    for (const row of kundaliPayload?.planets_table || []) {
      const status = normalizeText(row?.status?.rashi || row?.planet_status_in_rashi);
      if (status === "low") addTo(debilitated, row?.planet);
      if (normalizeText(row?.flags?.malefic_6_8_12) === "yes") {
        addTo(dusthana, row?.planet);
      }
    }
    for (const planet of kundaliPayload?.planets || []) {
      if (normalizeText(planet?.planet_dignity) === "debilitated") {
        addTo(debilitated, planet?.name);
      }
      if (normalizeText(planet?.is_planet_in_6_8_12_house) === "yes") {
        addTo(dusthana, planet?.name);
      }
    }
    addFromSummaryList("debilitated planet", debilitated);

    const order = C.PLANET_DISPLAY_ORDER || C.VIMSHOTTARI_PLANET_ORDER || [];
    const sortKeys = (keys) =>
      [...keys].sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });

    return {
      dusthana: sortKeys(dusthana),
      debilitated: sortKeys(debilitated)
    };
  }

  function formatRemedyCellValue(value) {
    if (value == null) return "";
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return String(value).trim();
  }

  function presentDoshEntriesFromKundali(kundaliPayload) {
    const block = kundaliPayload?.kundali_dosh;
    const items = Array.isArray(block?.dosh) ? block.dosh : [];
    return items.filter((item) => {
      if (!item || item.present === false) return false;
      const remedy = item.remedy;
      return Boolean(remedy && typeof remedy === "object");
    });
  }

  function createRemedyDetailTable(remedy, columns) {
    const table = document.createElement("table");
    table.className = "navatara-data-table kundali-table planet-remedy-table remedy-planet-detail-table";
    const tbody = document.createElement("tbody");
    const source = remedy && typeof remedy === "object" ? remedy : {};
    for (const col of columns || []) {
      if (!col || !col.key) continue;
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = String(col.header || col.key || "");
      const td = document.createElement("td");
      td.textContent = formatRemedyCellValue(source[col.key]) || "—";
      tr.appendChild(th);
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
  }

  function createPlanetRemedyDetailTable(planetKey) {
    return createRemedyDetailTable(
      planetRemedyByName[planetKey] || {},
      DOSH_REMEDY_DETAIL_COLUMNS
    );
  }

  function closeRemedyTilePanels(buttonsHost) {
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

  function showRemedyTileDetail(options) {
    const { groupKey, itemKey, itemEl, buttonsHost } = options;
    const panel = itemEl && itemEl.querySelector(".remedy-navatara-panel");
    const btn = itemEl && itemEl.querySelector(".remedy-navatara-btn");
    const key = normalizeText(itemKey);

    if (selectedRemedyTileKeyByHost[groupKey] === key && panel && !panel.hidden) {
      closeRemedyTilePanels(buttonsHost);
      selectedRemedyTileKeyByHost[groupKey] = "";
      return;
    }

    closeRemedyTilePanels(buttonsHost);
    selectedRemedyTileKeyByHost[groupKey] = key;

    if (btn) {
      btn.classList.add("remedy-navatara-btn--active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-expanded", "true");
    }
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function renderPlanetRemedyTiles(options) {
    const {
      groupKey,
      buttonsHost,
      emptyEl,
      headingEl,
      baseHeading,
      planetKeys,
      buttonClassName
    } = options;
    if (!buttonsHost) return;

    buttonsHost.innerHTML = "";
    selectedRemedyTileKeyByHost[groupKey] = "";

    const keys = Array.isArray(planetKeys) ? planetKeys : [];
    if (headingEl) {
      headingEl.textContent = keys.length ? `${baseHeading}(${keys.length})` : baseHeading;
    }

    if (!keys.length) {
      buttonsHost.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    buttonsHost.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    for (const planetKey of keys) {
      const item = document.createElement("div");
      item.className = "remedy-navatara-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = ["remedy-navatara-btn", buttonClassName].filter(Boolean).join(" ");
      btn.dataset.planetKey = normalizeText(planetKey);
      btn.textContent = toTitleCaseWords(planetKey);
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");

      const panel = document.createElement("div");
      panel.className = "remedy-navatara-panel";
      panel.hidden = true;

      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap remedy-navatara-panel__table";
      tableWrap.appendChild(createPlanetRemedyDetailTable(planetKey));
      panel.appendChild(tableWrap);

      btn.addEventListener("click", () =>
        showRemedyTileDetail({
          groupKey,
          itemKey: planetKey,
          itemEl: item,
          buttonsHost
        })
      );
      item.appendChild(btn);
      item.appendChild(panel);
      buttonsHost.appendChild(item);
    }
  }

  function renderPlanetRemedyTables(kundaliPayload) {
    const groups = remedyPlanetKeysByReason(kundaliPayload);
    renderPlanetRemedyTiles({
      groupKey: "dusthana",
      buttonsHost: dusthanaRemedyButtons,
      emptyEl: dusthanaRemedyEmpty,
      headingEl: dusthanaRemedyHeading,
      baseHeading: "Remedy for planet in Dusthana 6/8/12 houses",
      planetKeys: groups.dusthana,
      buttonClassName: "remedy-navatara-btn--dosh"
    });
    renderPlanetRemedyTiles({
      groupKey: "debilitated",
      buttonsHost: debilitatedRemedyButtons,
      emptyEl: debilitatedRemedyEmpty,
      headingEl: debilitatedRemedyHeading,
      baseHeading: "Remedy for debilitated planet",
      planetKeys: groups.debilitated
    });
  }

  function renderDoshRemedyTiles(kundaliPayload) {
    if (!doshRemedyButtons) return;
    doshRemedyButtons.innerHTML = "";
    selectedRemedyTileKeyByHost.dosh = "";

    const doshas = presentDoshEntriesFromKundali(kundaliPayload);
    const baseHeading = "Remedy for kundali dosh";
    if (doshRemedyHeading) {
      doshRemedyHeading.textContent = doshas.length
        ? `${baseHeading}(${doshas.length})`
        : baseHeading;
    }

    if (!doshas.length) {
      doshRemedyButtons.hidden = true;
      if (doshRemedyEmpty) doshRemedyEmpty.hidden = false;
      return;
    }

    doshRemedyButtons.hidden = false;
    if (doshRemedyEmpty) doshRemedyEmpty.hidden = true;

    for (const dosh of doshas) {
      const label = String(dosh.name || dosh.key || "Dosha").trim() || "Dosha";
      const itemKey = String(dosh.key || dosh.name || label).trim();
      const remedy = dosh.remedy && typeof dosh.remedy === "object" ? dosh.remedy : {};

      const item = document.createElement("div");
      item.className = "remedy-navatara-item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remedy-navatara-btn remedy-navatara-btn--dosh";
      btn.dataset.doshKey = normalizeText(itemKey);
      btn.textContent = label;
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");

      const panel = document.createElement("div");
      panel.className = "remedy-navatara-panel";
      panel.hidden = true;

      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap remedy-navatara-panel__table";
      tableWrap.appendChild(createRemedyDetailTable(remedy, DOSH_REMEDY_DETAIL_COLUMNS));
      panel.appendChild(tableWrap);

      btn.addEventListener("click", () =>
        showRemedyTileDetail({
          groupKey: "dosh",
          itemKey,
          itemEl: item,
          buttonsHost: doshRemedyButtons
        })
      );
      item.appendChild(btn);
      item.appendChild(panel);
      doshRemedyButtons.appendChild(item);
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
    table.className = "navatara-data-table kundali-table remedy-table nakshatra-remedy-table";
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
      tableWrap.className =
        "table-wrap nakshatra-table-wrap remedy-navatara-panel__table";
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
    const name = birthName ? String(birthName.value || "").trim() : "";
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
        KV.fetchJson(birthDate.value, birthTime.value, place, name),
        loadPlanetDatabase()
      ]);

      planetRemedyByName = buildPlanetRemedyLookup(db);
      cachedNakshatraRows = kundaliPayload.nakshatras || [];
      renderPlanetRemedyTables(kundaliPayload);
      renderDoshRemedyTiles(kundaliPayload);
      renderNavataraButtons((db.nava_tara && db.nava_tara.navatara) || []);
      refreshSavedBirthDropdown();

      if (resultsEl) resultsEl.hidden = false;
      showRemedyStatus("");
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

  if (placePreset) {
    placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }
  if (tabOpenBirth) {
    tabOpenBirth.addEventListener("click", () => setBirthMode("open"));
  }
  if (tabNewBirth) {
    tabNewBirth.addEventListener("click", () => setBirthMode("new"));
  }
  if (savedBirthSelect) {
    savedBirthSelect.addEventListener("change", applySavedBirthSelection);
  }
  form.addEventListener("submit", handleRemedyFormSubmit);
  setBirthMode("new");
  refreshRemedySavedViews();
  globalThis.addEventListener("saptarishi-auth-changed", refreshRemedySavedViews);
})();

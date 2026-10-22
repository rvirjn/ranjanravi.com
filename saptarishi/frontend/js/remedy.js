// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Remedy page: dosh / debilitated / low-strength / dusthana remedies + auspicious nava-tara. */

(function remedyPage() {
  const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
  const CU = window.SaptarishiCommonUtils || null;
  if (!C) return;

  const PLANET_REMEDY_COLUMNS = C.PLANET_REMEDY_COLUMNS || [];
  const PLANET_REMEDY_DETAIL_COLUMNS = PLANET_REMEDY_COLUMNS.filter(
    (col) => col && col.key !== "planet" && col.key !== "what_to_wear_in_finger"
  );
  const PLANET_GEM_COLUMN = PLANET_REMEDY_COLUMNS.find(
    (col) => col && col.key === "what_to_wear_in_finger"
  );
  const PLANET_ONLY_REMEDY_COLUMNS = PLANET_GEM_COLUMN
    ? [...PLANET_REMEDY_DETAIL_COLUMNS, PLANET_GEM_COLUMN]
    : PLANET_REMEDY_DETAIL_COLUMNS;
  const DOSH_REMEDY_DETAIL_COLUMNS = [
    { key: "desc", header: "Desc" },
    { key: "rule", header: "Rule" },
    ...PLANET_REMEDY_DETAIL_COLUMNS
  ];
  const REMEDY_TABLE_HEADERS = C.REMEDY_NAKSHATRA_TABLE_HEADERS || [];
  const REMEDY_HEADER_KEYS = {
    Desc: "remedy.col.desc",
    Rule: "remedy.col.rule",
    "Whom to worship": "remedy.col.worship",
    "Day to fast": "remedy.col.fast",
    "Mantra to chant": "remedy.col.mantra",
    "Chant count": "remedy.col.count",
    "How to chant": "remedy.col.how",
    "Things to donate": "remedy.col.donate",
    "Whom to respect most": "remedy.col.respect",
    "Feed to animal": "remedy.col.feed",
    Gem: "remedy.col.gem",
    Nakshatra: "remedy.col.nakshatra",
    Navatara: "remedy.col.navatara",
    Symbol: "remedy.col.symbol",
    "Ruling Planet": "remedy.col.ruling",
    Deity: "remedy.col.deity",
    Tree: "remedy.col.tree",
    Directions: "remedy.col.directions",
    "Lunar Month": "remedy.col.lunar",
    Tithi: "remedy.col.tithi",
    Remedy: "remedy.col.remedy",
    Mantra: "remedy.col.mantraWord",
    Animal: "remedy.col.animal",
    Colors: "remedy.col.colors",
    Number: "remedy.col.number",
    Day: "remedy.col.day",
    Time: "remedy.col.time"
  };

  function rt(key) {
    const I18N = window.SaptarishiI18n;
    return I18N && I18N.t ? I18N.t(key) : key;
  }

  function rtf(key, vars) {
    const I18N = window.SaptarishiI18n;
    return I18N && I18N.tf ? I18N.tf(key, vars) : key;
  }

  function chartText(value) {
    const I18N = window.SaptarishiI18n;
    return I18N && I18N.chartText ? I18N.chartText(value) : String(value ?? "");
  }

  function remedyHeader(label) {
    const key = REMEDY_HEADER_KEYS[String(label || "").trim()];
    return key ? rt(key) : chartText(label);
  }

  function setCountedHeading(el, key, count) {
    if (!el || !key) return;
    el.setAttribute("data-i18n", key);
    if (count) {
      el.setAttribute("data-i18n-suffix", `(${count})`);
      el.textContent = `${rt(key)}(${count})`;
    } else {
      el.removeAttribute("data-i18n-suffix");
      el.textContent = rt(key);
    }
  }

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
  const lowStrengthRemedyHeading = document.getElementById("low-strength-remedy-heading");
  const lowStrengthRemedyButtons = document.getElementById("low-strength-remedy-buttons");
  const lowStrengthRemedyEmpty = document.getElementById("low-strength-remedy-empty");
  const doshRemedyHeading = document.getElementById("dosh-remedy-heading");
  const doshRemedyButtons = document.getElementById("dosh-remedy-buttons");
  const doshRemedyEmpty = document.getElementById("dosh-remedy-empty");
  const placePreset = document.getElementById("place-preset");
  const customWrap = document.getElementById("custom-place-wrap");
  const placeCustom = document.getElementById("place-custom");
  const birthDate = document.getElementById("birth-date");
  const birthTime = document.getElementById("birth-time");
  const birthName = document.getElementById("birth-name");
  const saveBirth = document.getElementById("save-birth");
  const openBirthWrap = document.getElementById("open-birth-wrap");
  const openBirthStatusEl = document.getElementById("open-birth-status");
  const savedBirthSelect = document.getElementById("saved-birth-select");
  const savedBirthList = document.getElementById("saved-birth-list");
  const savedBirthSearch = document.getElementById("saved-birth-search");
  const newBirthFields = document.getElementById("new-birth-fields");
  const tabOpenBirth = document.getElementById("tab-open-birth");
  const tabNewBirth = document.getElementById("tab-new-birth");

  const KV = window.SaptarishiKundaliView;
  let birthMode = "open";
  let openBirthLoadSeq = 0;
  let cachedNakshatraRows = [];
  let lastRemedyPayload = null;
  let lastNavataraDefs = [];
  let planetRemedyByName = {};
  let pendingFocusPlanet = "";
  let pendingFocusDosh = "";

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

  function shouldSaveBirthDetails() {
    if (form?.dataset.activeReplay === "1") return false;
    if (birthMode === "open") return false;
    return !saveBirth || saveBirth.checked;
  }

  function noteActiveRemedyBirth() {
    if (!CU || !CU.setActiveBirth) return;
    const place = getBirthPlaceFromRemedyForm();
    const name = birthName ? String(birthName.value || "").trim() : "";
    const date = birthDate?.value || "";
    const time = birthTime?.value || "";
    if (!date || !time || !place) return;
    const match = currentSavedBirthViews().find((view) => {
      const sameName = name && String(view?.name || "").trim().toLowerCase() === name.toLowerCase();
      const sameWhen = view?.date === date && view?.time === time;
      return (sameName && sameWhen) || (!name && sameWhen && view?.place === place);
    });
    CU.setActiveBirth({
      name: name || match?.name || "",
      date,
      time,
      place,
      owner_id: match?.owner_id || ""
    });
  }

  function openActiveRemedyBirth() {
    if (!form || !CU || !CU.applyActiveBirthToForm) return false;
    if (CU.isNativeAppShell && CU.isNativeAppShell()) return false;
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("mode") === "new") return false;
    if (!CU.applyActiveBirthToForm(form)) return false;
    setBirthMode("new");
    if (saveBirth) saveBirth.checked = false;
    form.dataset.activeReplay = "1";
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    return true;
  }

  function validateRemedyBirthForm(place) {
    if (birthMode === "open" && savedBirthSelect && !savedBirthSelect.value) {
      return "Select saved birth details.";
    }
    if (CU && CU.validateBirthDetailsInput) {
      return CU.validateBirthDetailsInput({
        requireName: birthMode === "new",
        emptyNameMessage: "Enter a name for this birth.",
        name: birthName && birthName.value,
        place,
        date: birthDate && birthDate.value,
        time: birthTime && birthTime.value,
        allowCustom: placePreset && placePreset.value === C.PLACE_CUSTOM_VALUE
      });
    }
    if (birthMode === "new" && birthName && !String(birthName.value || "").trim()) {
      return "Enter a name for this birth.";
    }
    if (!place) return "Select Place.";
    if (!birthDate.value || !birthTime.value) return "Select Day, Month, and Year.";
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
    if (!view || !view.name) return "";
    return String(view.name || "")
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

  function savedBirthListMeta(view) {
    if (!view) return "";
    const parts = [formatSavedBirthListDate(view.date), view.time, view.place].filter(Boolean);
    const owner = String(view.owner_name || view.owner_email || "").trim();
    const meta = parts.join(", ");
    return owner ? (meta ? `${meta} · ${owner}` : owner) : meta;
  }

  function savedBirthListInitials(name) {
    const source = String(name || "S").trim();
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function savedBirthSearchQuery() {
    return String(savedBirthSearch?.value || "").trim().toLowerCase();
  }

  function filterSavedBirthViews(views, query) {
    const list = Array.isArray(views) ? views : [];
    const q = String(query || "").trim().toLowerCase();
    if (!q) return list;
    const tokens = q.split(/\s+/).filter(Boolean);
    return list.filter((view) => {
      const hay = [
        birthViewOptionLabel(view),
        view?.name,
        view?.date,
        formatSavedBirthListDate(view?.date),
        view?.time,
        view?.place,
        view?.owner_name,
        view?.owner_email
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return tokens.every((token) => hay.includes(token));
    });
  }

  function currentSavedBirthViews() {
    if (typeof SaptarishiAuth === "undefined") return [];
    if (SaptarishiAuth.getOpenBirthViews) return SaptarishiAuth.getOpenBirthViews();
    if (SaptarishiAuth.getBirthViews) return SaptarishiAuth.getBirthViews();
    return [];
  }

  function canDeleteSavedBirth(view) {
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.canDeleteOpenBirthView) {
      return SaptarishiAuth.canDeleteOpenBirthView(view);
    }
    return true;
  }

  async function deleteSavedBirth(name) {
    const label = String(name || "").trim();
    if (!label || typeof SaptarishiAuth === "undefined" || !SaptarishiAuth.deleteBirthView) return;
    if (!SaptarishiAuth.getToken || !SaptarishiAuth.getToken()) {
      if (SaptarishiAuth.ensureAuth) {
        await SaptarishiAuth.ensureAuth({
          tab: "login",
          required: true,
          message: "Sign in to delete saved birth details."
        });
      }
      return;
    }
    if (!window.confirm(rtf("form.deleteConfirm", { name: label }))) return;
    try {
      await SaptarishiAuth.deleteBirthView(label);
      await loadOpenBirthViews();
    } catch (err) {
      window.alert(err.message || rt("form.deleteFailed"));
    }
  }

  function renderSavedBirthList(views) {
    if (!savedBirthList) return;
    const selected = String(savedBirthSelect?.value || "").trim();
    const allViews = Array.isArray(views) ? views : [];
    const query = savedBirthSearchQuery();
    const filtered = filterSavedBirthViews(allViews, query);
    savedBirthList.replaceChildren();
    if (!allViews.length) {
      const empty = document.createElement("p");
      empty.className = "birth-open-list__empty";
      empty.textContent = rt("form.noSaved");
      savedBirthList.appendChild(empty);
      return;
    }
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "birth-open-list__empty";
      empty.textContent = rtf("form.noMatch", {
        query: String(savedBirthSearch?.value || "").trim()
      });
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
      const showDelete = canDeleteSavedBirth(view);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "birth-open-list__item";
      const avatar = document.createElement("span");
      avatar.className = `birth-open-list__avatar birth-open-list__avatar--${index % 2}`;
      avatar.textContent = savedBirthListInitials(view.name);
      const text = document.createElement("span");
      text.className = "birth-open-list__text";
      const nameEl = document.createElement("strong");
      nameEl.textContent = birthViewOptionLabel(view);
      const meta = document.createElement("span");
      meta.textContent = savedBirthListMeta(view);
      text.append(nameEl, meta);
      btn.append(avatar, text);
      btn.addEventListener("click", () => pickSavedBirth(key));
      row.append(btn);
      let del = null;
      if (showDelete) {
        del = document.createElement("button");
        del.type = "button";
        del.className = "birth-open-list__delete";
        del.textContent = rt("form.delete");
        del.setAttribute("aria-label", rtf("form.deleteNamed", { name: birthViewOptionLabel(view) }));
        del.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          deleteSavedBirth(view.name);
        });
      }
      if (CU && CU.mountBirthRowActions) {
        const marked = CU.mountBirthRowActions(row, view, del);
        if (!del && !marked) row.classList.add("birth-open-list__row--readonly");
      } else if (del) {
        row.append(del);
      } else {
        row.classList.add("birth-open-list__row--readonly");
      }
      savedBirthList.appendChild(row);
    });
  }

  function pickSavedBirth(key) {
    if (!savedBirthSelect || !key) return;
    savedBirthSelect.value = key;
    applySavedBirthSelection();
    renderSavedBirthList(currentSavedBirthViews());
    if (form?.requestSubmit) form.requestSubmit();
    else form?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
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
      const owner = String(view.owner_name || "").trim();
      const detail = [view.date, view.place, owner].filter(Boolean).join(" · ");
      opt.textContent = detail
        ? `${birthViewOptionLabel(view)} (${detail})`
        : birthViewOptionLabel(view);
      savedBirthSelect.appendChild(opt);
    });
    if (previous && [...savedBirthSelect.options].some((o) => o.value === previous)) {
      savedBirthSelect.value = previous;
    } else if (CU && CU.isActiveBirth) {
      const activeView = views.find((view) => CU.isActiveBirth(view));
      const activeKey = activeView ? birthViewSelectKey(activeView) : "";
      if (activeKey && [...savedBirthSelect.options].some((o) => o.value === activeKey)) {
        savedBirthSelect.value = activeKey;
      }
    }
    renderSavedBirthList(views);
  }

  function setOpenBirthListLoading(loading) {
    if (openBirthWrap) openBirthWrap.classList.toggle("is-birth-loading", Boolean(loading));
    if (!openBirthStatusEl) return;
    if (loading) {
      if (CU && CU.startStatusLoading) CU.startStatusLoading(openBirthStatusEl);
      else if (window.SaptarishiLoading) window.SaptarishiLoading.start(openBirthStatusEl);
      return;
    }
    if (CU && CU.setStatusMessage) {
      CU.setStatusMessage(openBirthStatusEl, "");
      return;
    }
    if (window.SaptarishiLoading) window.SaptarishiLoading.stop(openBirthStatusEl);
    openBirthStatusEl.textContent = "";
    openBirthStatusEl.hidden = true;
    openBirthStatusEl.classList.remove("status--loading");
  }

  async function loadOpenBirthViews() {
    const seq = ++openBirthLoadSeq;
    const showSpinner = birthMode === "open";
    if (showSpinner) setOpenBirthListLoading(true);
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.ensureOpenBirthViews) {
      try {
        await SaptarishiAuth.ensureOpenBirthViews({ refresh: true });
      } catch {
        /* keep own saved births */
      }
    }
    if (seq !== openBirthLoadSeq) return;
    if (savedBirthSearch) {
      const adminList =
        typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.isAdmin && SaptarishiAuth.isAdmin();
      savedBirthSearch.placeholder = adminList
        ? "Search by name, place, date, or account…"
        : "Search by name, place, or date…";
    }
    refreshSavedBirthDropdown();
    if (showSpinner && seq === openBirthLoadSeq) setOpenBirthListLoading(false);
  }

  function applySavedBirthSelection() {
    if (!savedBirthSelect || typeof SaptarishiAuth === "undefined") return;
    const views = currentSavedBirthViews();
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
    if (!isOpen) setOpenBirthListLoading(false);
    if (newBirthFields) newBirthFields.hidden = isOpen;
    if (saveBirth && !isOpen) saveBirth.checked = true;
    if (isOpen) {
      loadOpenBirthViews();
      if (savedBirthSearch && currentSavedBirthViews().length >= 8) {
        window.setTimeout(() => savedBirthSearch.focus(), 0);
      }
    }
  }

  async function refreshRemedySavedViews() {
    await loadOpenBirthViews();
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

  function formatPlanetStatusLabel(raw) {
    const s = normalizeText(raw).replace(/_/g, " ");
    if (!s) return "";
    const labels = {
      high: "High",
      low: "Low",
      own: "Own",
      mooltrikona: "Mooltrikona",
      "mool trikona": "Mooltrikona",
      moolatrikona: "Mooltrikona",
      "great friend": "Great Friend",
      "great enemy": "Great Enemy",
      neutral: "Neutral",
      exalted: "Exalted",
      debilitated: "Debilitated",
      friend: "Friend",
      enemy: "Enemy"
    };
    return chartText(labels[s] || toTitleCaseWords(s));
  }

  /** Collect planet keys by affliction reason (debilitated / low strength / dusthana). */
  function remedyPlanetKeysByReason(kundaliPayload) {
    const debilitated = new Set();
    const lowStrength = new Set();
    const dusthana = new Set();
    const strengthByPlanet = new Map();
    const metaByPlanet = new Map();

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

    const strengthPercentFromRow = (row) => {
      if (typeof row?.strength_percent === "number" && Number.isFinite(row.strength_percent)) {
        return row.strength_percent;
      }
      const total = row?.strength_adjustments?.total;
      if (typeof total === "number" && Number.isFinite(total)) return total;
      const text = String(row?.strength || "").replace(/%/g, "").trim();
      const n = Number.parseFloat(text);
      return Number.isFinite(n) ? n : null;
    };

    /**
     * Same red band as the birth chart and timeline.
     * ``cell_styles.strength`` is ``enemy`` / ``low`` only at or below the scaled
     * red line. A raw ``<= 49`` check lists green and white planets too, because
     * strength points and color cutoffs are already divided by strength_scale.
     */
    const isLowStrengthRow = (row) => {
      const kind = normalizeText(row?.cell_styles?.strength);
      return kind === "low" || kind === "enemy";
    };

    const rememberStrength = (raw, pct) => {
      const key = normalizeText(raw);
      if (!key || key === "ascendant" || pct == null || !Number.isFinite(pct)) return;
      const prev = strengthByPlanet.get(key);
      if (prev == null || pct < prev) strengthByPlanet.set(key, pct);
    };

    const rememberMeta = (raw, patch) => {
      const key = normalizeText(raw);
      if (!key || key === "ascendant") return;
      const prev = metaByPlanet.get(key) || {};
      const next = { ...prev };
      const pct = patch?.strengthPercent;
      if (typeof pct === "number" && Number.isFinite(pct) && next.strengthPercent == null) {
        next.strengthPercent = pct;
      }
      const status = String(patch?.status || "").trim();
      if (status && !next.status) next.status = status;
      metaByPlanet.set(key, next);
    };

    for (const row of kundaliPayload?.planets_table || []) {
      const status = normalizeText(row?.status?.rashi || row?.planet_status_in_rashi);
      if (status === "low") addTo(debilitated, row?.planet);
      if (normalizeText(row?.flags?.malefic_6_8_12) === "yes") {
        addTo(dusthana, row?.planet);
      }
      if (isLowStrengthRow(row)) addTo(lowStrength, row?.planet);
      rememberStrength(row?.planet, strengthPercentFromRow(row));
      rememberMeta(row?.planet, {
        strengthPercent: strengthPercentFromRow(row),
        status: row?.status?.rashi || row?.planet_status_in_rashi || ""
      });
    }
    for (const planet of kundaliPayload?.planets || []) {
      if (normalizeText(planet?.planet_dignity) === "debilitated") {
        addTo(debilitated, planet?.name);
      }
      if (normalizeText(planet?.is_planet_in_6_8_12_house) === "yes") {
        addTo(dusthana, planet?.name);
      }
      const pct =
        typeof planet?.planet_strength === "number" ? planet.planet_strength : null;
      rememberStrength(planet?.name, pct);
      rememberMeta(planet?.name, {
        strengthPercent: pct,
        status: planet?.planet_status_in_rashi || planet?.planet_dignity || ""
      });
    }
    addFromSummaryList("debilitated planet", debilitated);

    const order = C.PLANET_DISPLAY_ORDER || C.VIMSHOTTARI_PLANET_ORDER || [];
    const planetRank = (key) => {
      const i = order.indexOf(key);
      return i < 0 ? 99 : i;
    };

    /**
     * Assign P0/P1… for multi-tile groups.
     * Dusthana: also low-strength → P0, then others.
     * Low-strength: also dusthana → P0, then weaker % first.
     */
    const prioritizeKeys = (keys, group) => {
      const list = [...keys];
      const isP0 = (key) => {
        if (group === "dusthana") return lowStrength.has(key);
        if (group === "low_strength") return dusthana.has(key);
        return false;
      };
      list.sort((a, b) => {
        const a0 = isP0(a) ? 0 : 1;
        const b0 = isP0(b) ? 0 : 1;
        if (a0 !== b0) return a0 - b0;
        if (group === "low_strength") {
          const sa = strengthByPlanet.has(a) ? strengthByPlanet.get(a) : 999;
          const sb = strengthByPlanet.has(b) ? strengthByPlanet.get(b) : 999;
          if (sa !== sb) return sa - sb;
        }
        return planetRank(a) - planetRank(b);
      });
      let nextOther = 1;
      return list.map((key) => {
        if (isP0(key)) return entryFor(key, "P0");
        const priority = `P${nextOther}`;
        nextOther += 1;
        return entryFor(key, priority);
      });
    };

    const entryFor = (key, priority) => {
      const meta = metaByPlanet.get(key) || {};
      const pct = meta.strengthPercent;
      return {
        key,
        priority,
        strengthPercent: typeof pct === "number" && Number.isFinite(pct) ? pct : null,
        status: meta.status || ""
      };
    };

    const sortKeys = (keys) =>
      [...keys].sort((a, b) => planetRank(a) - planetRank(b));

    return {
      dusthana: prioritizeKeys(dusthana, "dusthana"),
      debilitated: sortKeys(debilitated).map((key) => entryFor(key, "")),
      low_strength: prioritizeKeys(lowStrength, "low_strength")
    };
  }

  function formatRemedyCellValue(value) {
    if (value == null) return "";
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return String(value).trim();
  }

  function isMantraColumn(col) {
    const key = String(col?.key || "").toLowerCase();
    return key === "mantra_to_chant" || key === "mantra";
  }

  function looksLikeQuotedMantra(quoted) {
    const inner = String(quoted || "")
      .replace(/^["“”']+|["“”']+$/g, "")
      .trim();
    return /^om\b/i.test(inner);
  }

  function appendQuotedMantraText(parent, text) {
    const parts = String(text).split(/((?:["“”])[^"“”]+(?:["“”]))/g);
    for (const part of parts) {
      if (!part) continue;
      if (looksLikeQuotedMantra(part)) {
        const strong = document.createElement("strong");
        strong.className = "remedy-mantra-value";
        strong.textContent = part;
        parent.appendChild(strong);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    }
  }

  function normalizeRemedyText(value) {
    return String(value ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
  }

  // ~4 wrapped lines in the remedy value column (~100 chars/line).
  const REMEDY_PARAGRAPH_MAX_CHARS = 400;

  function packRemedyChunks(chunks, maxChars = REMEDY_PARAGRAPH_MAX_CHARS) {
    const paras = [];
    let current = "";
    for (const chunk of chunks) {
      const piece = String(chunk || "").trim();
      if (!piece) continue;
      const next = current ? `${current} ${piece}` : piece;
      if (current && next.length > maxChars) {
        paras.push(current);
        current = piece;
      } else {
        current = next;
      }
    }
    if (current) paras.push(current);
    return paras;
  }

  function splitRemedyParagraphs(text, colKey) {
    const raw = normalizeRemedyText(text);
    if (!raw) return [];

    let chunks = [];
    if (raw.includes("\n")) {
      chunks = raw.split(/\n+/).map((part) => part.trim()).filter(Boolean);
    } else if (colKey === "how_to_do_mantra_chant") {
      chunks = raw
        .split(/(?=For personal daily)/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    if (!chunks.length) {
      if (raw.length <= REMEDY_PARAGRAPH_MAX_CHARS) return [raw];
      chunks = raw
        .split(/(?<=[.!?])\s+(?=[A-Z("])/)
        .map((part) => part.trim())
        .filter(Boolean);
    }

    if (chunks.length <= 1) return chunks.length ? chunks : [raw];
    return packRemedyChunks(chunks);
  }

  function appendRemedyParagraphBreak(parent, index) {
    if (index > 0) {
      parent.appendChild(document.createElement("br"));
      parent.appendChild(document.createElement("br"));
    }
  }

  function appendFormattedRemedyText(parent, text, { quoteMantras = false } = {}) {
    const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (!part) continue;
      if (/^\*\*[^*]+\*\*$/.test(part)) {
        const strong = document.createElement("strong");
        strong.className = "remedy-emphasis";
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
        continue;
      }
      if (quoteMantras) appendQuotedMantraText(parent, part);
      else parent.appendChild(document.createTextNode(part));
    }
  }

  function fillRemedyParagraphs(parent, paragraphs, { quoteMantras = false } = {}) {
    paragraphs.forEach((para, index) => {
      const chunk = String(para || "").trim();
      if (!chunk) return;
      appendRemedyParagraphBreak(parent, index);
      appendFormattedRemedyText(parent, chunk, { quoteMantras });
    });
  }

  function translateRemedyField(text, col) {
    if (isMantraColumn(col)) return text;
    const I18N = window.SaptarishiI18n;
    const render = (part) => (I18N && I18N.remedyText ? I18N.remedyText(part) : part);
    const raw = normalizeRemedyText(text);
    if (!raw) return "";
    const whole = render(raw);
    if (whole !== raw) return whole;
    if (!raw.includes("\n")) return raw;
    return raw
      .split(/\n+/)
      .map((part) => render(part.trim()))
      .filter(Boolean)
      .join("\n\n");
  }

  function fillRemedyValueCell(td, col, cellText, locked) {
    if (!td) return;
    const text = translateRemedyField(cellText, col);
    const colKey = String(col?.key || "");
    const isHowTo = colKey === "how_to_do_mantra_chant";
    const paragraphs = splitRemedyParagraphs(text, colKey);

    td.textContent = "";
    td.classList.toggle("remedy-how-to-chant", isHowTo);
    const isReading = colKey === "desc" || colKey === "rule";
    td.classList.toggle("remedy-reading", isReading);
    const textHost = isReading ? document.createElement("div") : td;
    if (isReading) {
      textHost.className = "remedy-reading-body";
      td.appendChild(textHost);
    }

    if (paragraphs.length) {
      fillRemedyParagraphs(textHost, paragraphs, { quoteMantras: isHowTo });
    } else if (text) {
      appendFormattedRemedyText(textHost, text, { quoteMantras: isHowTo });
    }

    if (locked) blurLockedRemedyValueCell(td);
  }

  /** Remedies unlock per paid birth (free or ₹ per birth), or a legacy unlimited plan. */
  function canViewRemedyDetails() {
    if (typeof SaptarishiAuth === "undefined") return false;
    if (typeof SaptarishiAuth.hasAdvancePlan === "function" && SaptarishiAuth.hasAdvancePlan()) {
      return true;
    }
    if (typeof SaptarishiAuth.hasUnlimitedPremium === "function" && SaptarishiAuth.hasUnlimitedPremium()) {
      return true;
    }
    const name = birthName ? String(birthName.value || "").trim() : "";
    if (typeof SaptarishiAuth.canViewBirthRemedies === "function") {
      return Boolean(SaptarishiAuth.canViewBirthRemedies(name));
    }
    const usage = SaptarishiAuth.getUsage ? SaptarishiAuth.getUsage() : null;
    if (usage && usage.remedy_unlocked === true) return true;
    if (typeof SaptarishiAuth.isBirthPaid === "function" && name) {
      return Boolean(SaptarishiAuth.isBirthPaid(name, usage));
    }
    return false;
  }

  function openRemedyUnlock() {
    const charge =
      (typeof SAPTARISHI_CONSTANTS !== "undefined" &&
        (SAPTARISHI_CONSTANTS.BIRTH_CHARGE_INR || SAPTARISHI_CONSTANTS.QUERY_CHARGE_INR)) ||
      51;
    const message = `Add money to your wallet to unlock remedy (₹${charge} per birth).`;
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.openUnlockFromBlur) {
      SaptarishiAuth.openUnlockFromBlur({ message });
      return;
    }
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.getToken && !SaptarishiAuth.getToken()) {
      if (SaptarishiAuth.ensureAuth) {
        SaptarishiAuth.ensureAuth({
          tab: "login",
          required: true,
          message: "Sign in to continue."
        });
      }
      return;
    }
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.openWalletFlow) {
      SaptarishiAuth.openWalletFlow({
        required: true,
        addMoney: true,
        message
      });
      return;
    }
    if (globalThis.SaptarishiWalletModal && SaptarishiWalletModal.open) {
      SaptarishiWalletModal.open();
    }
  }

  function blurLockedRemedyValueCell(td) {
    if (!td || td.classList.contains("remedy-text-cell--locked")) return;
    const value = (td.textContent || "").trim();
    if (!value || value === "—") return;

    // Wrap rendered paragraphs so blur keeps <br> spacing intact.
    td.classList.add("remedy-text-cell--locked");
    const span = document.createElement("span");
    span.className = "remedy-text--blurred";
    while (td.firstChild) span.appendChild(td.firstChild);
    td.appendChild(span);
    span.setAttribute("title", "Add money to unlock");
    span.setAttribute("aria-label", "Blurred remedy text. Add money to wallet to unlock.");
    span.setAttribute("role", "button");
    span.setAttribute("tabindex", "0");

    if (span.dataset.remedyUnlockBound === "1") return;
    span.dataset.remedyUnlockBound = "1";
    const open = (event) => {
      event.preventDefault();
      event.stopPropagation();
      openRemedyUnlock();
    };
    span.addEventListener("click", open);
    span.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") open(event);
    });
  }

  function blurNavataraRemedyCells(tbody) {
    if (!tbody || canViewRemedyDetails()) return;
    const table = tbody.closest("table");
    if (table) table.classList.add("nakshatra-remedy-table--locked");
    // Blur every data cell; row color styling on <tr> stays visible.
    tbody.querySelectorAll("td").forEach((td) => {
      const text = (td.textContent || "").trim();
      if (text && text !== "—") blurLockedRemedyValueCell(td);
    });
  }

  function doshPriorityRank(priority) {
    const text = String(priority || "").trim().toUpperCase();
    if (text.startsWith("P") && /^\d+$/.test(text.slice(1))) return Number(text.slice(1));
    if (/^\d+$/.test(text)) return Number(text);
    return 99;
  }

  function presentDoshEntriesFromKundali(kundaliPayload) {
    const block = kundaliPayload?.kundali_dosh;
    const items = Array.isArray(block?.dosh) ? block.dosh : [];
    return items
      .filter((item) => {
        if (!item || item.present === false) return false;
        const remedy = item.remedy;
        return Boolean(remedy && typeof remedy === "object");
      })
      .sort((a, b) => {
        const pr = doshPriorityRank(a?.priority) - doshPriorityRank(b?.priority);
        if (pr !== 0) return pr;
        const as = typeof a?.strength_percent === "number" ? a.strength_percent : -1;
        const bs = typeof b?.strength_percent === "number" ? b.strength_percent : -1;
        if (as !== bs) return bs - as;
        const an = String(a?.name || a?.key || "").toLowerCase();
        const bn = String(b?.name || b?.key || "").toLowerCase();
        return an.localeCompare(bn);
      });
  }

  function createRemedyDetailTable(remedy, columns) {
    const table = document.createElement("table");
    table.className = "navatara-data-table kundali-table planet-remedy-table remedy-planet-detail-table";
    const locked = !canViewRemedyDetails();
    if (locked) table.classList.add("remedy-planet-detail-table--locked");
    const tbody = document.createElement("tbody");
    const source = remedy && typeof remedy === "object" ? remedy : {};
    for (const col of columns || []) {
      if (!col || !col.key) continue;
      const tr = document.createElement("tr");
      if (col.key === "desc" || col.key === "rule") {
        tr.classList.add("remedy-reading-row");
      }
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = remedyHeader(col.header || col.key || "");
      const td = document.createElement("td");
      if (isMantraColumn(col)) {
        td.classList.add("remedy-mantra-value");
      }
      const cellText = formatRemedyCellValue(source[col.key]) || "—";
      fillRemedyValueCell(td, col, cellText, locked);
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
      PLANET_ONLY_REMEDY_COLUMNS
    );
  }

  function createRemedyOpenCard(label, extra) {
    const wrap = document.createElement("article");
    wrap.className = "kundali-open-card";
    const marks = extra && extra.dataset ? extra.dataset : null;
    if (marks) {
      Object.keys(marks).forEach((name) => {
        if (marks[name]) wrap.setAttribute(name, marks[name]);
      });
    }

    const head = document.createElement("div");
    head.className = "kundali-open-card__head kundali-open-card__head--bad";
    const title = document.createElement("div");
    title.className = "kundali-open-card__title";
    const nameEl = document.createElement("span");
    nameEl.className = "kundali-open-card__name";
    nameEl.textContent = label;
    title.appendChild(nameEl);
    head.appendChild(title);

    const statusText = extra && String(extra.statusText || "").trim();
    if (statusText) {
      const statusEl = document.createElement("span");
      statusEl.className = "kundali-open-card__status";
      statusEl.textContent = statusText;
      title.appendChild(statusEl);
    }

    const strength = extra && extra.strengthPercent;
    if (typeof strength === "number" && Number.isFinite(strength)) {
      const pctEl = document.createElement("span");
      pctEl.className = "kundali-open-card__pct";
      pctEl.textContent = `${Math.round(strength)}%`;
      head.appendChild(pctEl);
    }

    const panel = document.createElement("div");
    panel.className = "remedy-navatara-panel kundali-open-card__body";
    wrap.append(head, panel);
    return { wrap, panel };
  }

  function scrollRemedyCardIntoView(card) {
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderPlanetRemedyTiles(options) {
    const {
      buttonsHost,
      emptyEl,
      headingEl,
      headingKey,
      baseHeading,
      planetEntries,
      showPriorityWhenMultiple
    } = options;
    if (!buttonsHost) return;

    buttonsHost.innerHTML = "";
    buttonsHost.classList.add("kundali-open-list");

    const entries = (Array.isArray(planetEntries) ? planetEntries : [])
      .map((entry) => {
        if (typeof entry === "string") {
          return { key: entry, priority: "", strengthPercent: null, status: "" };
        }
        const pct = entry?.strengthPercent;
        return {
          key: normalizeText(entry?.key || entry?.planet || ""),
          priority: String(entry?.priority || "").trim().toUpperCase(),
          strengthPercent: typeof pct === "number" && Number.isFinite(pct) ? pct : null,
          status: String(entry?.status || "").trim()
        };
      })
      .filter((entry) => entry.key);
    const keys = entries.map((entry) => entry.key);
    if (headingEl) {
      if (headingKey) setCountedHeading(headingEl, headingKey, keys.length);
      else headingEl.textContent = keys.length ? `${baseHeading}(${keys.length})` : baseHeading;
    }

    if (!keys.length) {
      buttonsHost.hidden = true;
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    buttonsHost.hidden = false;
    if (emptyEl) emptyEl.hidden = true;

    const showPriority = Boolean(showPriorityWhenMultiple) && entries.length >= 2;

    for (const entry of entries) {
      const planetKey = entry.key;
      const priority = entry.priority;
      const name = chartText(toTitleCaseWords(planetKey));
      const tileLabel =
        showPriority && /^P\d+$/.test(priority) ? `${name} (${priority})` : name;

      const card = createRemedyOpenCard(tileLabel, {
        strengthPercent: entry.strengthPercent,
        statusText: formatPlanetStatusLabel(entry.status),
        dataset: {
          "data-planet-key": normalizeText(planetKey),
          "data-priority": priority || ""
        }
      });

      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap remedy-navatara-panel__table";
      tableWrap.appendChild(createPlanetRemedyDetailTable(planetKey));
      card.panel.appendChild(tableWrap);
      buttonsHost.appendChild(card.wrap);
    }
  }

  function renderPlanetRemedyTables(kundaliPayload) {
    const groups = remedyPlanetKeysByReason(kundaliPayload);
    renderPlanetRemedyTiles({
      buttonsHost: debilitatedRemedyButtons,
      emptyEl: debilitatedRemedyEmpty,
      headingEl: debilitatedRemedyHeading,
      headingKey: "remedy.debilitated",
      planetEntries: groups.debilitated
    });
    renderPlanetRemedyTiles({
      buttonsHost: lowStrengthRemedyButtons,
      emptyEl: lowStrengthRemedyEmpty,
      headingEl: lowStrengthRemedyHeading,
      headingKey: "remedy.low",
      planetEntries: groups.low_strength,
      showPriorityWhenMultiple: true
    });
    renderPlanetRemedyTiles({
      buttonsHost: dusthanaRemedyButtons,
      emptyEl: dusthanaRemedyEmpty,
      headingEl: dusthanaRemedyHeading,
      headingKey: "remedy.dusthana",
      planetEntries: groups.dusthana,
      showPriorityWhenMultiple: true
    });
  }

  function focusPendingRemedyPlanet() {
    const planetKey = normalizeText(pendingFocusPlanet);
    const doshKey = normalizeText(pendingFocusDosh);
    pendingFocusPlanet = "";
    pendingFocusDosh = "";

    if (doshKey && doshRemedyButtons) {
      const card = Array.from(doshRemedyButtons.querySelectorAll("[data-dosh-key]")).find(
        (el) =>
          normalizeText(el.getAttribute("data-dosh-key")) === doshKey ||
          normalizeText(el.textContent) === doshKey
      );
      if (card) {
        scrollRemedyCardIntoView(card);
        return;
      }
    }

    if (!planetKey) return;
    const hosts = [debilitatedRemedyButtons, lowStrengthRemedyButtons, dusthanaRemedyButtons];
    for (const host of hosts) {
      if (!host) continue;
      const card = Array.from(host.querySelectorAll("[data-planet-key]")).find(
        (el) => normalizeText(el.getAttribute("data-planet-key")) === planetKey
      );
      if (!card) continue;
      scrollRemedyCardIntoView(card);
      return;
    }
  }

  function readRemedyHandoffFromQuery() {
    const params = new URLSearchParams(window.location.search || "");
    const date = String(params.get("date") || "").trim();
    const time = String(params.get("time") || "").trim();
    const place = String(params.get("place") || "").trim();
    const name = String(params.get("name") || "").trim();
    const planet = String(params.get("planet") || "").trim();
    const dosh = String(params.get("dosh") || "").trim();
    const save = String(params.get("save") || "").trim() === "1";
    if (!date || !time || !place) return null;
    return { date, time, place, name, planet, dosh, save };
  }

  function applyRemedyBirthHandoff(handoff) {
    if (!handoff) return false;
    setBirthMode("new");
    if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.applyDefaultBirthToForm) {
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
        handoff
      );
    } else {
      if (birthDate) birthDate.value = handoff.date || "";
      if (birthTime) birthTime.value = handoff.time || "";
      if (birthName && handoff.name) birthName.value = handoff.name;
      syncCustomPlaceFieldVisibility();
    }
    if (saveBirth) saveBirth.checked = Boolean(handoff.save);
    pendingFocusPlanet = handoff.planet || "";
    pendingFocusDosh = handoff.dosh || "";
    return true;
  }

  function clearRemedyHandoffQuery() {
    const params = new URLSearchParams(window.location.search || "");
    if (!params.has("date") && !params.has("run") && !params.has("planet") && !params.has("dosh")) return;
    const clean = window.location.pathname + (window.location.hash || "");
    window.history.replaceState({}, "", clean);
  }

  function consumeRemedyHandoffAndRun() {
    const handoff = readRemedyHandoffFromQuery();
    if (!handoff || !form) return false;
    if (!applyRemedyBirthHandoff(handoff)) return false;
    form.dataset.remedyAutoRun = "1";
    clearRemedyHandoffQuery();
    form.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    return true;
  }

  function renderDoshRemedyTiles(kundaliPayload) {
    if (!doshRemedyButtons) return;
    doshRemedyButtons.innerHTML = "";
    doshRemedyButtons.classList.add("kundali-open-list");

    const doshas = presentDoshEntriesFromKundali(kundaliPayload);
    setCountedHeading(doshRemedyHeading, "remedy.dosh", doshas.length);

    if (!doshas.length) {
      doshRemedyButtons.hidden = true;
      if (doshRemedyEmpty) doshRemedyEmpty.hidden = false;
      return;
    }

    doshRemedyButtons.hidden = false;
    if (doshRemedyEmpty) doshRemedyEmpty.hidden = true;

    for (const dosh of doshas) {
      const rawDoshName = String(dosh.name || dosh.key || "Dosha").trim() || "Dosha";
      const label = window.SaptarishiI18n && window.SaptarishiI18n.doshName
        ? window.SaptarishiI18n.doshName(rawDoshName)
        : chartText(rawDoshName);
      const itemKey = String(dosh.key || dosh.name || label).trim();
      const remedy = dosh.remedy && typeof dosh.remedy === "object" ? dosh.remedy : {};
      const priority = String(dosh.priority || "").trim().toUpperCase();
      const showPriority = doshas.length >= 2 && /^P\d+$/.test(priority);
      const tileLabel = showPriority ? `${label} (${priority})` : label;

      const card = createRemedyOpenCard(tileLabel, {
        strengthPercent: dosh.strength_percent,
        dataset: { "data-dosh-key": normalizeText(itemKey) }
      });
      if (showPriority) card.wrap.title = tileLabel;

      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap remedy-navatara-panel__table";
      tableWrap.appendChild(createRemedyDetailTable(remedy, DOSH_REMEDY_DETAIL_COLUMNS));
      card.panel.appendChild(tableWrap);
      doshRemedyButtons.appendChild(card.wrap);
    }
  }

  function navataraResultLabel(def) {
    const result = String(def.result || "").trim();
    if (!result) return "";
    const line = /^for\s/i.test(result) ? result : `For ${result}`;
    return chartText(line);
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
      th.textContent = remedyHeader(label);
      if (normalizeText(label) === "mantra") {
        th.classList.add("nakshatra-th-mantra");
      }
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    return table;
  }

  function renderNavataraButtons(definitions) {
    if (!buttonsHost) return;
    buttonsHost.innerHTML = "";
    buttonsHost.classList.add("kundali-open-list");

    const auspicious = navataraDefinitionsForTiles(definitions, cachedNakshatraRows);
    if (!auspicious.length) {
      buttonsHost.textContent = rt("remedy.noNavatara");
      return;
    }

    for (const def of auspicious) {
      const rows = rowsForNavatara(def.name);
      if (!rows.length) continue;

      const card = createRemedyOpenCard(navataraResultLabel(def), {
        dataset: { "data-navatara-key": normalizeText(def.name) }
      });
      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap nakshatra-table-wrap remedy-navatara-panel__table";
      const table = createRemedyTableElement();
      tableWrap.appendChild(table);
      card.panel.appendChild(tableWrap);

      const tbody = table.querySelector("tbody");
      if (KV && KV.renderNakshatraTableWithColors && tbody) {
        KV.renderNakshatraTableWithColors(tbody, rows);
        blurNavataraRemedyCells(tbody);
      }
      buttonsHost.appendChild(card.wrap);
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

  function paintRemedyResults(kundaliPayload, db) {
    lastRemedyPayload = kundaliPayload;
    planetRemedyByName = buildPlanetRemedyLookup(db);
    cachedNakshatraRows = kundaliPayload.nakshatras || [];
    lastNavataraDefs = (db.nava_tara && db.nava_tara.navatara) || [];
    renderPlanetRemedyTables(kundaliPayload);
    renderDoshRemedyTiles(kundaliPayload);
    renderNavataraButtons(lastNavataraDefs);
  }

  async function handleRemedyFormSubmit(event) {
    event.preventDefault();
    const replaying = form?.dataset.activeReplay === "1";
    if (form) delete form.dataset.activeReplay;
    const place = getBirthPlaceFromRemedyForm();
    const name = birthName ? String(birthName.value || "").trim() : "";
    const saveBirthDetails = replaying ? false : shouldSaveBirthDetails();
    const validationError = validateRemedyBirthForm(place);
    if (validationError) {
      if (replaying && CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(false);
      showRemedyStatus(validationError, true);
      return;
    }

    if (!KV || !KV.fetchJson) {
      showRemedyStatus("Kundali helpers failed to load.", true);
      return;
    }

    noteActiveRemedyBirth();
    if (replaying && CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(true);
    if (CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(true);
    showRemedyLoadingStatus();
    if (resultsEl) resultsEl.hidden = true;

    try {
      const [kundaliPayload, db] = await Promise.all([
        KV.fetchJson(birthDate.value, birthTime.value, place, name, saveBirthDetails),
        loadPlanetDatabase()
      ]);

      paintRemedyResults(kundaliPayload, db);
      noteActiveRemedyBirth();
      refreshSavedBirthDropdown();
      focusPendingRemedyPlanet();

      if (resultsEl) resultsEl.hidden = false;
      showRemedyStatus("");
    } catch (err) {
      const formatted = formatLoadError(err);
      if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
        SaptarishiAuth.clearSession();
      }
      showRemedyStatus(formatted.text, true, formatted.limitReached);
      if (CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(false);
      if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
        const ready = await SaptarishiAuth.handlePremiumRequired(err);
        if (ready && SaptarishiAuth.requireAuth && SaptarishiAuth.requireAuth()) {
          if (CU && CU.setBirthEntryHidden) CU.setBirthEntryHidden(true);
          showRemedyLoadingStatus();
          try {
            const [kundaliPayload, db] = await Promise.all([
              KV.fetchJson(
                birthDate.value,
                birthTime.value,
                place,
                name,
                saveBirthDetails
              ),
              loadPlanetDatabase()
            ]);
            paintRemedyResults(kundaliPayload, db);
            noteActiveRemedyBirth();
            refreshSavedBirthDropdown();
            focusPendingRemedyPlanet();
            if (resultsEl) resultsEl.hidden = false;
            showRemedyStatus("");
            return;
          } catch (retryErr) {
            const retryFormatted = formatLoadError(retryErr);
            showRemedyStatus(retryFormatted.text, true, retryFormatted.limitReached);
          }
        }
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
  if (savedBirthSearch) {
    savedBirthSearch.addEventListener("input", () => {
      renderSavedBirthList(currentSavedBirthViews());
    });
    savedBirthSearch.addEventListener("keydown", (event) => {
      if (event.key === "Enter") event.preventDefault();
    });
  }
  form.addEventListener("submit", handleRemedyFormSubmit);
  setBirthMode("open");
  refreshRemedySavedViews();
  globalThis.addEventListener("saptarishi-auth-changed", refreshRemedySavedViews);
  globalThis.addEventListener("saptarishi-active-birth-changed", () => {
    renderSavedBirthList(currentSavedBirthViews());
  });
  if (!consumeRemedyHandoffAndRun()) openActiveRemedyBirth();

  document.addEventListener("saptarishi-lang-change", () => {
    refreshSavedBirthDropdown();
    if (!lastRemedyPayload || !resultsEl || resultsEl.hidden) return;
    renderPlanetRemedyTables(lastRemedyPayload);
    renderDoshRemedyTiles(lastRemedyPayload);
    renderNavataraButtons(lastNavataraDefs);
  });
})();

// Copyright © 2018-2026 ranjanravi.com. All rights reserved.

const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
  FLASK_PORT: 8081,
  PRODUCTION_API_ORIGIN: "https://saptarishi.ranjanravi.com",
  DEFAULT_HOUSE_SYSTEM: "W",
  API_KUNDALI_PATH: "/api/kundali",
  API_PLANET_DATABASE_PATH: "/api/planet-database",
  PLACE_CUSTOM_VALUE: "__custom__",
  MAX_PLACE_QUERY_LENGTH: 240,
  NAVATARA_INTENSITY: {
    "ati-maitri": 1,
    janma: 1,
    sadhaka: 0.85,
    sampat: 0.75,
    kshema: 0.7,
    maitri: 0.5,
    vipat: 0.75,
    pratyari: 0.65,
    vadha: 1
  }
};

/** Cached ``database/data.json`` from ``/api/planet-database``. */
let planetDatabase = null;

const form = document.getElementById("birth-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const placePreset = document.getElementById("place-preset");
const customWrap = document.getElementById("custom-place-wrap");
const placeCustom = document.getElementById("place-custom");
const birthDate = document.getElementById("birth-date");
const birthTime = document.getElementById("birth-time");

/** True when UI is opened from localhost (Docker nginx on :9999 or file://). */
function isLocalDevUi() {
  const host = window.location.hostname;
  return (
    window.location.protocol === "file:" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

/** Flask API: localhost:8081 in dev; Render URL in production. */
function getFlaskApiOrigin() {
  if (isLocalDevUi()) {
    return `http://localhost:${C.FLASK_PORT}`;
  }
  return String(C.PRODUCTION_API_ORIGIN || "https://saptarishi.ranjanravi.com").replace(
    /\/$/,
    ""
  );
}

/** Show loading or error text under the birth form; hide when empty. */
function showStatusMessage(message, isError) {
  if (!statusEl) return;
  const text = message || "";
  statusEl.textContent = text;
  statusEl.hidden = !text;
  statusEl.classList.toggle("error", Boolean(isError));
}

/** Read place string from preset dropdown or custom text field. */
function getBirthPlaceFromForm() {
  if (!placePreset) return "";
  if (placePreset.value === C.PLACE_CUSTOM_VALUE) return (placeCustom && placeCustom.value.trim()) || "";
  return placePreset.value.trim();
}

/** Title Case for UI labels and values (each word capitalized). */
function toTitleCaseWords(text) {
  return String(text ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatSummaryTimeValue(iso) {
  const raw = String(iso ?? "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/);
  if (match) return `${match[1]} ${match[2]}`;
  return raw.replace("T", " ").replace(/[+-]\d{2}:\d{2}$/, "").trim();
}

function formatSummaryCellValue(label, value) {
  const key = normalizeText(label);
  const raw = String(value ?? "");
  if (key === "time") return formatSummaryTimeValue(raw);
  if (key === "moon type") {
    const paksha = normalizeText(raw);
    if (paksha === "krishna" || raw.toLowerCase().includes("krishna")) {
      return "Krishna paksha (dark moon)";
    }
    if (paksha === "shukla" || paksha === "sukla" || raw.toLowerCase().includes("shukla")) {
      return "Shukla paksha (white moon)";
    }
  }
  return raw;
}

function summaryValueHasPlanetList(value) {
  const text = normalizeText(value);
  return text && text !== "none" && text !== "n/a" && text !== "-" && text !== "—";
}

function summaryValueClassForLabel(label, value) {
  if (!summaryValueHasPlanetList(value)) return "";
  const key = normalizeText(label);
  if (key === "exalted planet" || key === "retrograde planet") {
    return "summary-value--green";
  }
  if (key === "debilitated planet") {
    return "summary-value--red";
  }
  return "";
}

/** One label + value row for the summary facts table. */
function createSummaryLabelValueRow(label, value) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = toTitleCaseWords(label);
  const td = document.createElement("td");
  const valueClass = summaryValueClassForLabel(label, value);
  if (valueClass) td.classList.add(valueClass);
  td.textContent = formatSummaryCellValue(label, value);
  tr.appendChild(th);
  tr.appendChild(td);
  return tr;
}

/** Unique aspecting graha keys from ``planets_table`` row / ``planets[]`` (sorted). */
function collectAspectedByPlanetKeys(rowData) {
  const names = [];
  const add = (raw) => {
    const key = normalizeText(raw);
    if (key && !names.includes(key)) names.push(key);
  };
  if (Array.isArray(rowData?.aspected_by_planets)) {
    rowData.aspected_by_planets.forEach(add);
  }
  if (Array.isArray(rowData?.aspected_by)) {
    rowData.aspected_by.forEach(add);
  } else {
    const text = String(rowData?.aspected_by ?? "").trim();
    if (text) text.split(",").forEach((part) => add(part));
  }
  const order = C.VIMSHOTTARI_PLANET_ORDER || [];
  const rank = new Map(order.map((p, i) => [p, i]));
  names.sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
  return names;
}

/** Comma-separated aspecting graha names (from API string or ``aspected_by_planets`` array). */
function formatAspectedByPlanets(rowData) {
  const names = collectAspectedByPlanetKeys(rowData);
  if (!names.length) return "";
  return names.map((n) => toTitleCaseWords(n)).join(", ");
}

function dedupeCommaList(cell) {
  const parts = String(cell ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  const lower = parts.map((p) => p.toLowerCase());
  if (lower.every((p) => p === lower[0])) return parts[0];
  return parts.join(", ");
}

function formatNavataraName(cell) {
  return String(cell ?? "")
    .split("-")
    .map((part) => toTitleCaseWords(part))
    .join("-");
}

const KARAKWAQT_HARMFUL_LABELS = new Set(["marak", "badhak", "prabal marak"]);

function formatDashaAgeDisplay(ageOrText) {
  if (ageOrText == null || ageOrText === "") return "";
  if (typeof ageOrText === "string") return ageOrText.trim();
  const fromY = Number(ageOrText.from_years);
  const toY = Number(ageOrText.to_years);
  if (!Number.isFinite(fromY) || !Number.isFinite(toY)) return "";
  const start = Math.round(fromY);
  const end = Math.round(toY);
  return `${start}-${end >= start ? end : start}`;
}

function formatKarakwaqtPlainText(cell) {
  const parts = String(cell ?? "")
    .split(" | ")
    .map((p) => p.trim())
    .filter(Boolean);
  if (!parts.length) return "";
  return parts.map((p) => toTitleCaseWords(p)).join(" | ");
}

function karakwaqtLabelIsHarmful(label) {
  return KARAKWAQT_HARMFUL_LABELS.has(normalizeText(label));
}

function karakwaqtTextIsHarmful(text) {
  return String(text ?? "")
    .split(" | ")
    .map((p) => p.trim())
    .filter(Boolean)
    .some((p) => karakwaqtLabelIsHarmful(p));
}

function karakwaqtTextHasYogKarak(text) {
  return String(text ?? "")
    .split(" | ")
    .map((p) => normalizeText(p))
    .some((p) => p === "yog karak");
}

/** Karakwaqt column tint: green yog karak, red harmful labels. */
function karakwaqtCellColorKind(karakwaqtText) {
  if (karakwaqtTextIsHarmful(karakwaqtText)) return "enemy";
  if (karakwaqtTextHasYogKarak(karakwaqtText)) return "friend";
  return "";
}

/** Planets table cell text from structured ``planets_table`` rows. */
function planetsTableCellText(key, rowData) {
  const flags = rowData.flags || {};
  const status = rowData.status || {};
  if (key === "is_planet_in_6_8_12_house") {
    return flags.malefic_6_8_12 ?? rowData.malefic_6_8_12_display ?? rowData[key];
  }
  if (key === "is_planet_lagna_lord_enemy") {
    return flags.lagna_lord_enemy ?? rowData.is_planet_lagna_lord_enemy_display ?? rowData[key];
  }
  if (key === "is_planet_at_death_degree") {
    return flags.death_degree ?? rowData.is_planet_at_death_degree_display ?? rowData[key];
  }
  if (key === "planet_status_in_rashi") {
    return status.rashi ?? rowData.planet_status_in_rashi ?? rowData[key];
  }
  if (key === "planet_status_in_nakshatra") {
    return status.nakshatra ?? rowData.planet_status_in_nakshatra ?? rowData[key];
  }
  if (key === "karakwaqt") {
    return rowData.karakwaqt ?? rowData.planet_karakwaqt ?? "";
  }
  if (key === "dasha_age") {
    return rowData.dasha_age ?? formatDashaAgeDisplay(rowData.age) ?? "";
  }
  if (key === "aspected_by") {
    return formatAspectedByPlanets(rowData);
  }
  if (key === "house_strength") {
    const text = rowData.house_strength ?? rowData[key];
    if (String(text ?? "").trim()) return text;
    if (typeof rowData.house_strength_percent === "number") {
      return `${rowData.house_strength_percent}%`;
    }
    return "";
  }
  return rowData[key];
}

function formatTableCellForDisplay(key, cell) {
  if (cell == null) return "";
  const text = String(cell);
  if (
    key === "is_planet_in_6_8_12_house" ||
    key === "malefic_6_8_12" ||
    key === "is_planet_lagna_lord_enemy" ||
    key === "is_planet_at_death_degree" ||
    key === "malefic_6_8_12_display" ||
    key === "is_planet_lagna_lord_enemy_display" ||
    key === "is_planet_at_death_degree_display"
  ) {
    if (/^(yes|no)$/i.test(String(text).trim())) {
      return String(text).trim().toLowerCase() === "yes" ? "Yes" : "No";
    }
    return text;
  }
  if (key === "planet") {
    if (!String(text).trim()) return "No planet";
    return toTitleCaseWords(text);
  }
  if (key === "planet_status_in_rashi" || key === "planet_status_in_nakshatra") {
    const s = normalizeText(text);
    if (!s) return "—";
    if (s === "high") return "High";
    if (s === "low") return "Low";
    if (s === "own") return "Own";
    return toTitleCaseWords(text);
  }
  if (
    key === "strength" ||
    key === "house_strength" ||
    key === "degree" ||
    key === "nakshatra" ||
    key === "navatara" ||
    key === "karakwaqt" ||
    key === "dasha_age"
  ) {
    if (!String(text).trim()) return "—";
  }
  if (key === "nakshatra") return formatNavataraName(text.replace(/\s*\(pada\s+\d+\)\s*$/i, ""));
  if (key === "navatara") return formatNavataraName(text);
  if (key === "karakwaqt") {
    return formatKarakwaqtPlainText(text);
  }
  if (key === "aspected_by") return formatAspectedByPlanets({ aspected_by: text });
  if (key === "ruling_planet") return toTitleCaseWords(dedupeCommaList(text));
  if (key === "lucky_day") return toTitleCaseWords(text);
  if (key === "divine_god" || key === "deity") return toTitleCaseWords(dedupeCommaList(text));
  if (key === "lucky_time") return formatLuckyTime(text);
  if (key === "mantra" || key === "remedy" || key === "directions" || key === "lunar_month" || key === "tithi") {
    return text;
  }
  if (key === "symbol" || key === "animal") return toTitleCaseWords(text);
  return text;
}

/** Normalize text for CSS class / comparison (lowercase, collapsed spaces). */
function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Strength cap from ``planet_strength_rules`` (resolved API or ``strength_factors[id=strength_limits]``). */
function strengthMaxPercent(kundaliPayload) {
  const rules = kundaliPayload?.planet_strength_rules || planetDatabase?.planet_strength_rules;
  if (typeof rules?.max_percent === "number" && rules.max_percent > 0) {
    return rules.max_percent;
  }
  const factors = rules?.strength_factors;
  if (Array.isArray(factors)) {
    const limits = factors.find((f) => {
      const id = normalizeText(f?.id);
      return id === "strength_limits" || id === "clamp";
    });
    if (typeof limits?.max_percent === "number" && limits.max_percent > 0) {
      return limits.max_percent;
    }
  }
  return C.PLANET_STRENGTH_MAX_PERCENT || 200;
}

/** Fetch and cache full planet database JSON from API. */
async function ensurePlanetDatabase() {
  if (planetDatabase) return planetDatabase;
  const path = C.API_PLANET_DATABASE_PATH || "/api/planet-database";
  try {
    const response = await fetch(`${getFlaskApiOrigin()}${path}`);
    const payload = await parseApiJsonResponse(response);
    if (!response.ok) {
      console.warn("planet-database:", payload.error || response.status);
      return null;
    }
    planetDatabase = payload;
    return planetDatabase;
  } catch (err) {
    console.warn("planet-database unavailable:", err.message);
    return null;
  }
}

/** Parse API JSON; surface HTML error pages as a clear message. */
async function parseApiJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const hint =
      `API returned HTML (HTTP ${response.status}). ` +
      `Restart the Flask container on port ${C.FLASK_PORT} after code updates.`;
    throw new Error(hint);
  }
}

function strengthPercentFromRow(row) {
  if (typeof row?.strength_percent === "number") return row.strength_percent;
  const match = String(row?.strength || "").match(/(\d+)/);
  return match ? Number(match[1]) : 25;
}

/** Lagna / ascendant row from ``planets[]`` (legacy top-level ``ascendant`` supported). */
function findAscendantPlanet(payload) {
  const planets = payload?.planets || [];
  const row = planets.find((p) => normalizeText(p?.name) === "ascendant");
  if (row) return row;
  return payload?.ascendant || null;
}

/** Whole-sign houses 1–12 from lagna (replaces ``houses_whole_sign`` in API). */
function wholeSignHousesFromPayload(payload) {
  const lagnaRi = findAscendantPlanet(payload)?.rashi_index;
  if (typeof lagnaRi !== "number" || lagnaRi < 0 || lagnaRi >= 12) {
    return {};
  }
  const eng = C.RASHI_IN_ENG || [];
  const out = {};
  for (let house = 1; house <= 12; house += 1) {
    const ri = (lagnaRi + house - 1) % 12;
    out[house] = {
      house,
      rashi_index: ri,
      rashi_english: eng[ri] || ""
    };
  }
  return out;
}

function planetHouseNumber(planet) {
  const h = planet?.house;
  if (h && typeof h === "object" && typeof h.number === "number") {
    return h.number;
  }
  return planet?.whole_sign_house;
}

/** Map 0–max% strength to 0–1 intensity (100% ≠ 125% when max is 200). */
function planetStrengthVisualVars(strengthPercent, strengthMax) {
  const max = Math.max(100, strengthMax || C.PLANET_STRENGTH_MAX_PERCENT || 200);
  const pct = Math.max(0, Number(strengthPercent) || 0);
  const intensity = Math.min(1, pct / max);
  return { intensity };
}

function applyPlanetStrengthStyle(el, strengthPercent, strengthMax) {
  const { intensity } = planetStrengthVisualVars(strengthPercent, strengthMax);
  el.style.setProperty("--planet-strength", String(intensity));
}

/** Status columns use one intensity so Own/Friend/Enemy match across rashi and nakshatra. */
function applyPlanetStatusCellColorIntensity(el) {
  const intensity = C.PLANET_STATUS_COLOR_INTENSITY ?? 0.72;
  el.style.setProperty("--planet-strength", String(intensity));
}

function strengthToOpacity(row, strengthMax) {
  return planetStrengthVisualVars(strengthPercentFromRow(row), strengthMax).intensity;
}

/** Status kind for cell tint: high/low beat own/friend/enemy when combined. */
function planetStatusKind(status) {
  const s = normalizeText(status);
  if (!s || s === "unknown" || s === "—") return "";
  if (s === "high" || /\bhigh\b/.test(s)) return "high";
  if (s === "low" || /\blow\b/.test(s)) return "low";
  if (s === "own" || /\bown\b/.test(s)) return "own";
  if (/\bfriend\b/.test(s)) return "friend";
  if (/\benemy\b/.test(s)) return "enemy";
  return "";
}

/** Apply ``cell_styles`` color from API (kundali.py). */
function applyPlanetTableCellStyle(td, colorKind, columnKey) {
  if (!colorKind) return;
  const yesNoCol =
    columnKey === "is_planet_in_6_8_12_house" ||
    columnKey === "is_planet_lagna_lord_enemy" ||
    columnKey === "is_planet_at_death_degree" ||
    columnKey === "navatara" ||
    columnKey === "karakwaqt";
  const extra = td.className ? `${td.className} ` : "";
  td.className =
    `${extra}${yesNoCol ? "planets-td-yesno" : "planets-td-status"} planet-cell planet-cell--${colorKind}`.trim();
  applyPlanetStatusCellColorIntensity(td);
}

/** Aspected By cell: comma-separated planet names with chart abbreviations. */
function appendPlanetsAspectedByCell(tr, rowData) {
  const td = document.createElement("td");
  td.className = "planets-td-aspected-by";
  const text = formatAspectedByPlanets(rowData);
  td.textContent = text || "—";
  tr.appendChild(td);
}

/** Chart planet color class from API ``planet_status_color`` or status text. */
function planetChartStatusClass(planet) {
  const kind = planet?.planet_status_color || planetStatusKind(
    planet?.planet_status_in_rashi || planet?.planet_relation_with_rashi_lord
  );
  if (kind === "high") return "kundali-chart-planet--high";
  if (kind === "low") return "kundali-chart-planet--low";
  if (kind === "own") return "kundali-chart-planet--own";
  if (kind === "friend") return "kundali-chart-planet--friend";
  if (kind === "enemy") return "kundali-chart-planet--enemy";
  return "kundali-chart-planet--neutral";
}

function stylePlanetTspan(tspan, entry, strengthMax) {
  tspan.setAttribute("class", `kundali-chart-planet ${planetChartStatusClass(entry)}`);
  applyPlanetStrengthStyle(tspan, entry.strength_percent, strengthMax);
}

/** Per-planet colored tspans; x/dy only on line/row starts (same layout as plain text rows). */
function appendColoredPlanetsToText(textEl, planets, anchorX, options = {}) {
  const {
    rowMode = false,
    firstDy = "0",
    rowDy = "1.05em",
    gap = " ",
    leadGap = false,
    strengthMax
  } = options;
  const list = planets || [];
  if (!list.length) return;

  if (rowMode) {
    const rows = [];
    for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2));
    rows.forEach((row, ri) => {
      row.forEach((entry, pi) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        if (pi === 0 && anchorX != null) {
          tspan.setAttribute("x", String(anchorX));
          tspan.setAttribute("dy", ri === 0 ? firstDy : rowDy);
        } else if (pi === 0) {
          tspan.setAttribute("dy", ri === 0 ? firstDy : rowDy);
        }
        tspan.textContent = (pi > 0 || (leadGap && pi === 0) ? gap : "") + entry.label;
        stylePlanetTspan(tspan, entry, options.strengthMax);
        textEl.appendChild(tspan);
      });
    });
    return;
  }

  list.forEach((entry, i) => {
    const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    if (i === 0 && anchorX != null) {
      tspan.setAttribute("x", String(anchorX));
      tspan.setAttribute("dy", firstDy);
    }
    tspan.textContent = (i > 0 || (leadGap && i === 0) ? gap : "") + entry.label;
    stylePlanetTspan(tspan, entry, options.strengthMax);
    textEl.appendChild(tspan);
  });
}

function createChartLineTextEl(x, y, anchor) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", "text");
  el.setAttribute("x", String(x));
  el.setAttribute("y", String(y));
  el.setAttribute("class", "kundali-chart-label kundali-chart-label-planets");
  el.setAttribute("text-anchor", anchor);
  el.setAttribute("dominant-baseline", "middle");
  return el;
}

function createPlanetTextEl(x, y, anchor, dense) {
  const plEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  plEl.setAttribute("x", String(x));
  plEl.setAttribute("y", String(y));
  plEl.setAttribute(
    "class",
    `kundali-chart-label kundali-chart-label-planets${dense ? " kundali-chart-label-planets--dense" : ""}`
  );
  plEl.setAttribute("text-anchor", anchor);
  plEl.setAttribute("dominant-baseline", "middle");
  return plEl;
}

/** Nava-tara row shading depth from name (see NAVATARA_INTENSITY in constants.js). */
function navataraIntensity(navataraName, isHelpful) {
  const key = normalizeText(navataraName);
  const map = C.NAVATARA_INTENSITY || {};
  if (map[key] != null) return map[key];
  return isHelpful ? 0.5 : 0.5;
}

function formatHouseForList(text) {
  return String(text ?? "")
    .split(",")
    .map((part) => toTitleCaseWords(part.trim()))
    .filter(Boolean)
    .join(", ");
}

function houseFromTableRow(rowData) {
  const h = rowData?.house;
  if (h && typeof h === "object") {
    return { number: h.number, for: h.for };
  }
  return { number: rowData?.house, for: rowData?.house_for };
}

function appendPlanetsHouseCell(tr, rowData) {
  const td = document.createElement("td");
  td.className = "planets-td-house";
  const { number: num, for: forRaw } = houseFromTableRow(rowData);
  const forText = formatHouseForList(forRaw);
  if (num != null && num !== "") {
    const numEl = document.createElement("div");
    numEl.className = "planets-house-num";
    numEl.textContent = String(num);
    td.appendChild(numEl);
  }
  if (forText) {
    const forEl = document.createElement("div");
    forEl.className = "planets-house-for";
    forEl.textContent = forText;
    td.appendChild(forEl);
  }
  tr.appendChild(td);
}

function formatRashiDisplayFromHouseMeta(houseMeta) {
  const ri = houseMeta?.rashi_index;
  const eng = C.RASHI_IN_EN?.[ri] || houseMeta?.rashi_english || "";
  const sa = C.RASHI_IN_SANSKRIT?.[ri] || "";
  const enTitle = toTitleCaseWords(eng);
  if (!enTitle) return "—";
  return sa ? `${enTitle} (${toTitleCaseWords(sa)})` : enTitle;
}

/** Planets table: values and ``cell_styles`` come from API (kundali.py). */
function renderPlanetsTableWithColors(tbody, rows) {
  if (!tbody) return;
  tbody.innerHTML = "";
  const sortedRows = Array.isArray(rows) ? rows : [];
  const columnKeys = [
    "planet",
    "aspected_by",
    "strength",
    "house_strength",
    "is_planet_in_6_8_12_house",
    "is_planet_lagna_lord_enemy",
    "is_planet_at_death_degree",
    "planet_status_in_rashi",
    "rashi",
    "nakshatra",
    "karakwaqt",
    "planet_status_in_nakshatra",
    "navatara",
    "degree"
  ];
  for (const rowData of sortedRows) {
    const tr = document.createElement("tr");
    const cellStyles = rowData.cell_styles || {};
    for (const key of ["dasha_age"]) {
      const td = document.createElement("td");
      const displayValue = planetsTableCellText(key, rowData);
      td.textContent = formatTableCellForDisplay(key, displayValue);
      applyPlanetTableCellStyle(td, cellStyles[key] || "", key);
      tr.appendChild(td);
    }
    appendPlanetsHouseCell(tr, rowData);
    for (const key of columnKeys) {
      if (key === "aspected_by") {
        appendPlanetsAspectedByCell(tr, rowData);
        continue;
      }
      const td = document.createElement("td");
      const displayValue = planetsTableCellText(key, rowData);
      td.textContent = formatTableCellForDisplay(key, displayValue);
      applyPlanetTableCellStyle(td, cellStyles[key] || "", key);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

/** Normalize lucky time for display: AM/PM and hyphen ranges only. */
function formatLuckyTime(cell) {
  let text = String(cell ?? "").trim();
  if (!text) return "";
  text = text
    .replace(/\bsunrise\b/gi, "6:00 AM")
    .replace(/\bafter sunset\b/gi, "6:00 PM")
    .replace(/\bsunset\b/gi, "6:00 PM")
    .replace(/\bnoon\b/gi, "12:00 PM")
    .replace(/\btwilight\s*\([^)]*\)/gi, "6:00 AM - 7:00 AM")
    .replace(/\bto\b/gi, "-")
    .replace(/\s*;\s*/g, " / ")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
  return text;
}

function formatNavataraAbout(cell) {
  const text = cell != null ? String(cell).trim() : "";
  if (!text) return "";
  return /^for\s/i.test(text) ? text : `For ${text}`;
}

/** Nakshatra table columns (after Nakshatra name and Navatara title cells). */
const NAKSHATRA_TABLE_COLUMNS = [
  { key: "symbol", className: "nakshatra-td-symbol" },
  { key: "ruling_planet", className: "nakshatra-td-ruling_planet" },
  { key: "deity", className: "nakshatra-td-deity" },
  { key: "tree", className: "nakshatra-td-tree" },
  { key: "directions", className: "nakshatra-td-directions" },
  { key: "lunar_month", className: "nakshatra-td-lunar_month" },
  { key: "tithi", className: "nakshatra-td-tithi" },
  { key: "remedy", className: "nakshatra-td-remedy" },
  { key: "mantra", className: "nakshatra-td-mantra" },
  { key: "animal", className: "nakshatra-td-animal" },
  { key: "lucky_colors", className: "nakshatra-td-colors" },
  { key: "lucky_number", className: "nakshatra-td-lucky-number" },
  { key: "lucky_day", className: "nakshatra-td-lucky-day" },
  { key: "lucky_time", className: "nakshatra-td-lucky-time" }
];

function nakshatraCellValue(rowData, col) {
  const raw = rowData[col.key] ?? (col.fallbackKey ? rowData[col.fallbackKey] : "");
  if (col.format) return col.format(raw);
  return formatTableCellForDisplay(col.key, raw);
}

function applyNakshatraRowColors(tr, rowData) {
  const helpful = normalizeText(rowData.auspicious) === "yes";
  tr.classList.add(helpful ? "navatara-row--helpful" : "navatara-row--harmful");
  const navataraKey = normalizeText(rowData.navatara);
  tr.style.setProperty("--navatara-intensity", String(navataraIntensity(rowData.navatara, helpful)));
  if (navataraKey) {
    tr.classList.add(`navatara-row--${navataraKey.replace(/[^a-z0-9]+/g, "-")}`);
  }
}

function appendNakshatraNameCell(tr, rowData) {
  const td = document.createElement("td");
  td.className = "nakshatra-td-nakshatra";
  td.textContent = formatTableCellForDisplay("nakshatra", rowData.nakshatra);
  tr.appendChild(td);
}

/** Navatara column: tara name + result line (like planets House number + for). */
function appendNakshatraNavataraCell(tr, rowData) {
  const td = document.createElement("td");
  td.className = "nakshatra-td-navatara";
  const name = formatNavataraName(rowData.navatara);
  if (name) {
    const nameEl = document.createElement("div");
    nameEl.className = "nakshatra-navatara-name";
    nameEl.textContent = name;
    td.appendChild(nameEl);
  }
  const about = formatNavataraAbout(rowData.about);
  if (about) {
    const aboutEl = document.createElement("div");
    aboutEl.className = "nakshatra-navatara-about";
    aboutEl.textContent = about;
    td.appendChild(aboutEl);
  }
  tr.appendChild(td);
}

function appendNakshatraColumnCell(tr, rowData, col) {
  const td = document.createElement("td");
  td.className = col.className;
  td.textContent = nakshatraCellValue(rowData, col);
  tr.appendChild(td);
}

/** Nakshatra table: 27 rows in janma-wheel order; nava-tara row tint by auspicious. */
function renderNakshatraTableWithColors(tbody, rows) {
  if (!tbody) return;
  tbody.innerHTML = "";
  const ordered = [...(rows || [])].sort(
    (a, b) => (Number(a.position) || 0) - (Number(b.position) || 0)
  );
  for (const rowData of ordered) {
    const tr = document.createElement("tr");
    tr.className = "nakshatra-data-row";
    applyNakshatraRowColors(tr, rowData);
    appendNakshatraNameCell(tr, rowData);
    appendNakshatraNavataraCell(tr, rowData);
    for (const col of NAKSHATRA_TABLE_COLUMNS) {
      appendNakshatraColumnCell(tr, rowData, col);
    }
    tbody.appendChild(tr);
  }
}

/** Planet short label from output JSON ``planets[].name`` (no retrograde brackets). */
function planetShortLabelFromJson(name) {
  const key = String(name || "").toLowerCase();
  return C.PLANET_SHORT[key] || "";
}

/** Sign number 1–12 from cell or legacy ``rashi_index`` / ``rashi_english`` (no names). */
function rashiNumberFromCell(cell) {
  if (cell?.rashi_number != null) return cell.rashi_number;
  const ri = cell?.rashi_index;
  if (typeof ri === "number" && ri >= 0 && ri < 12) return ri + 1;
  const en = String(cell?.rashi_english || "").toLowerCase();
  const idx = (C.RASHI_IN_EN || []).indexOf(en);
  return idx >= 0 ? idx + 1 : null;
}

/** Build North Indian chart from ``planets`` + lagna (whole-sign houses derived in UI). */
function buildNorthIndianChartFromPayload(payload) {
  const asc = findAscendantPlanet(payload) || {};
  const lagnaRi = asc.rashi_index;
  const lagnaRashiNumber =
    typeof lagnaRi === "number" && lagnaRi >= 0 && lagnaRi < 12 ? lagnaRi + 1 : null;
  const lagnaLabel = lagnaRashiNumber != null ? String(lagnaRashiNumber) : "";

  const housesByNo = wholeSignHousesFromPayload(payload);

  const planetOrder = C.PLANET_DISPLAY_ORDER || [];
  const planetsByHouse = {};
  for (const p of payload?.planets || []) {
    if (normalizeText(p?.name) === "ascendant") continue;
    const house = planetHouseNumber(p);
    if (typeof house !== "number") continue;
    const label = planetShortLabelFromJson(p.name);
    if (!label) continue;
    const entry = {
      label,
      order: planetOrder.indexOf(String(p.name || "").toLowerCase()),
      planet_status_color: p.planet_status_color || "",
      planet_status_in_rashi:
        p.planet_status_in_rashi || p.planet_relation_with_rashi_lord,
      strength_percent:
        typeof p.planet_strength === "number"
          ? p.planet_strength
          : p.sign_degree_phase?.strength_percent
    };
    (planetsByHouse[house] ||= []).push(entry);
  }
  for (const house of Object.keys(planetsByHouse)) {
    planetsByHouse[house].sort((a, b) => {
      const ao = a.order < 0 ? 99 : a.order;
      const bo = b.order < 0 ? 99 : b.order;
      return ao - bo;
    });
  }

  const regions = C.NORTH_INDIAN_HOUSE_REGIONS || [];
  const cells = regions.map(([house, polygon, cx, cy]) => {
    const hdata = housesByNo[house] || {};
    const ri = hdata.rashi_index;
    const rashiNumber = typeof ri === "number" && ri >= 0 && ri < 12 ? ri + 1 : null;
    return {
      house,
      polygon,
      cx,
      cy,
      rashi_number: rashiNumber,
      planets: planetsByHouse[house] || [],
      is_lagna_house: house === 1
    };
  });

  return {
    layout: "north_indian",
    lagna_label: lagnaLabel,
    lagna_rashi_number: lagnaRashiNumber,
    strength_max: strengthMaxPercent(payload),
    cells
  };
}

/** Traditional North Indian chart: diagonals + diamond house regions (SVG). */
function renderKundaliChart(chartData, chartHost = "kundali-chart") {
  const host =
    typeof chartHost === "string" ? document.getElementById(chartHost) : chartHost;
  if (!host) return;
  host.innerHTML = "";
  if (!chartData || !Array.isArray(chartData.cells)) {
    return;
  }

  const strengthMax = chartData.strength_max || C.PLANET_STRENGTH_MAX_PERCENT || 200;
  const planetOpts = { strengthMax };

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("class", "kundali-chart-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "North Indian kundali chart");

  const frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  frame.setAttribute("x", "0");
  frame.setAttribute("y", "0");
  frame.setAttribute("width", "100");
  frame.setAttribute("height", "100");
  frame.setAttribute("class", "kundali-chart-frame");
  svg.appendChild(frame);

  // Outer diagonals + inner diamond (midpoints of each side), not lines to center.
  const lines = [
    [0, 0, 100, 100],
    [100, 0, 0, 100],
    [50, 0, 100, 50],
    [100, 50, 50, 100],
    [50, 100, 0, 50],
    [0, 50, 50, 0]
  ];
  const linesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  linesGroup.setAttribute("class", "kundali-chart-lines");
  for (const [x1, y1, x2, y2] of lines) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(x1));
    line.setAttribute("y1", String(y1));
    line.setAttribute("x2", String(x2));
    line.setAttribute("y2", String(y2));
    line.setAttribute("class", "kundali-chart-line");
    linesGroup.appendChild(line);
  }
  svg.appendChild(linesGroup);

  const labelsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  labelsGroup.setAttribute("class", "kundali-chart-labels");

  for (const cell of chartData.cells) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "kundali-chart-house");
    if (cell.is_lagna_house) g.classList.add("kundali-chart-house--lagna");

    const cx = cell.cx ?? 50;
    const cy = cell.cy ?? 50;
    const housePlanets = cell.planets || [];
    const rowCount = Math.ceil(housePlanets.length / 2);
    const rashiNum = rashiNumberFromCell(cell);
    const densePlanets = rowCount > 2;

    /** Houses 1, 2, 12 (top row): sign number up, planets below. */
    if (cell.house === 1 || cell.house === 2 || cell.house === 12) {
      if (rashiNum != null) {
        const signEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        signEl.setAttribute("x", String(cx));
        const signUp = cell.house === 1 ? 4 : 5;
        signEl.setAttribute("y", String(cy - signUp));
        signEl.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signEl.setAttribute("text-anchor", "middle");
        signEl.setAttribute("dominant-baseline", "middle");
        signEl.textContent = String(rashiNum);
        g.appendChild(signEl);
      }
      if (housePlanets.length) {
        const planetsDown = cell.house === 1 ? 2.5 : 2;
        const plEl = createPlanetTextEl(cx, cy + planetsDown, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true, ...planetOpts });
        g.appendChild(plEl);
      }
    } else if (cell.house === 6 || cell.house === 8) {
      /** Houses 6 & 8: sign up, planets down; 6 left, 8 right. */
      const labelX = cell.house === 6 ? cx - 3 : cx + 3;
      if (rashiNum != null) {
        const signEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        signEl.setAttribute("x", String(labelX));
        signEl.setAttribute("y", String(cy - 1));
        signEl.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signEl.setAttribute("text-anchor", "middle");
        signEl.setAttribute("dominant-baseline", "middle");
        signEl.textContent = String(rashiNum);
        g.appendChild(signEl);
      }
      if (housePlanets.length) {
        const plEl = createPlanetTextEl(labelX, cy + 5, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, labelX, { rowMode: true, ...planetOpts });
        g.appendChild(plEl);
      }
    } else if (cell.house === 3 || cell.house === 11) {
      /** Houses 3 & 11 (upper sides): sign high, planets below. */
      if (rashiNum != null) {
        const signEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        signEl.setAttribute("x", String(cx));
        signEl.setAttribute("y", String(cy - 8));
        signEl.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signEl.setAttribute("text-anchor", "middle");
        signEl.setAttribute("dominant-baseline", "middle");
        signEl.textContent = String(rashiNum);
        g.appendChild(signEl);
      }
      if (housePlanets.length) {
        const plEl = createPlanetTextEl(cx, cy + 0.5, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true, ...planetOpts });
        g.appendChild(plEl);
      }
    } else if (cell.house === 7) {
      /** House 7 (bottom center): planets above, sign number below. */
      if (housePlanets.length) {
        const plEl = createPlanetTextEl(cx, cy - 3.5, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, cx, {
          rowMode: true,
          rowDy: "-1.05em",
          ...planetOpts
        });
        g.appendChild(plEl);
      }
      if (rashiNum != null) {
        const signEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        signEl.setAttribute("x", String(cx));
        signEl.setAttribute("y", String(cy + 3));
        signEl.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signEl.setAttribute("text-anchor", "middle");
        signEl.setAttribute("dominant-baseline", "middle");
        signEl.textContent = String(rashiNum);
        g.appendChild(signEl);
      }
    } else if (cell.house === 4) {
      /** House 4 (middle left): sign leftmost, planets to the right on one line. */
      const signX = cx - 3;
      const lineEl = createChartLineTextEl(signX, cy, "start");
      let hasLine = false;
      if (rashiNum != null) {
        const signTspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        signTspan.setAttribute("x", String(signX));
        signTspan.setAttribute("dy", "0");
        signTspan.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signTspan.textContent = String(rashiNum);
        lineEl.appendChild(signTspan);
        hasLine = true;
      }
      if (housePlanets.length) {
        appendColoredPlanetsToText(lineEl, housePlanets, rashiNum != null ? null : signX, {
          firstDy: "0",
          gap: " ",
          leadGap: rashiNum != null,
          ...planetOpts
        });
        hasLine = true;
      }
      if (hasLine) g.appendChild(lineEl);
    } else if (cell.house === 10) {
      /** House 10 (middle right): planets left, sign number rightmost on one line. */
      const signX = cx + 3;
      const lineEl = createChartLineTextEl(signX, cy, "end");
      let hasLine = false;
      if (housePlanets.length) {
        appendColoredPlanetsToText(lineEl, housePlanets, null, { firstDy: "0", gap: " ", ...planetOpts });
        hasLine = true;
      }
      if (rashiNum != null) {
        const signTspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        if (!housePlanets.length) {
          signTspan.setAttribute("x", String(signX));
          signTspan.setAttribute("dy", "0");
        }
        signTspan.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signTspan.textContent = (housePlanets.length ? " " : "") + String(rashiNum);
        lineEl.appendChild(signTspan);
        hasLine = true;
      }
      if (hasLine) g.appendChild(lineEl);
    } else {
      const signYOffset = rowCount > 1 ? -4 : -2.5;
      const planetsStartY = rowCount > 1 ? cy + 1.5 : cy + 3;

      if (rashiNum != null) {
        const signEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        signEl.setAttribute("x", String(cx));
        signEl.setAttribute("y", String(cy + signYOffset));
        signEl.setAttribute("class", "kundali-chart-label kundali-chart-label-rashi");
        signEl.setAttribute("text-anchor", "middle");
        signEl.setAttribute("dominant-baseline", "middle");
        signEl.textContent = String(rashiNum);
        g.appendChild(signEl);
      }

      if (housePlanets.length) {
        const plEl = createPlanetTextEl(cx, planetsStartY, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true, ...planetOpts });
        g.appendChild(plEl);
      }
    }

    labelsGroup.appendChild(g);
  }

  svg.appendChild(labelsGroup);
  host.appendChild(svg);
}

/** Fill summary table from API ``summary_table`` rows (built in kundali.py). */
function renderSummaryTableFromApiRows(summaryBody, summaryRows) {
  if (!summaryBody) return;
  summaryBody.innerHTML = "";
  for (const row of summaryRows || []) {
    summaryBody.appendChild(createSummaryLabelValueRow(row.label, row.value));
  }
}

/** Fill summary, planets, and nakshatra tables from /api/kundali JSON. */
function renderKundaliResponseIntoPage(kundaliPayload, targets = {}) {
  const summaryBody = document.querySelector(targets.summaryTable || "#summary-table tbody");
  const planetsBody = document.querySelector(targets.planetsTable || "#planets-table tbody");
  const nakshatraBody = document.querySelector(targets.nakshatraTable || "#nakshatra-table tbody");
  const chartHost = targets.chartHost || "kundali-chart";

  renderSummaryTableFromApiRows(summaryBody, kundaliPayload.summary_table);
  renderKundaliChart(buildNorthIndianChartFromPayload(kundaliPayload), chartHost);

  renderPlanetsTableWithColors(planetsBody, kundaliPayload.planets_table || []);
  renderNakshatraTableWithColors(nakshatraBody, kundaliPayload.nakshatras || []);

  if (!targets.skipShellUpdates) {
    if (resultsEl) resultsEl.hidden = false;
    showStatusMessage(C.KUNDALI_READY_STATUS_MESSAGE);
  }
}

/** Build query string for GET /api/kundali from form fields. */
function buildKundaliApiQueryParams(date, time, place) {
  return new URLSearchParams({
    date,
    time,
    place,
    house_system: C.DEFAULT_HOUSE_SYSTEM
  });
}

/** Call Flask /api/kundali and return parsed JSON. */
async function fetchKundaliJsonFromApi(date, time, place) {
  const params = buildKundaliApiQueryParams(date, time, place);
  const response = await fetch(`${getFlaskApiOrigin()}${C.API_KUNDALI_PATH}?${params}`);
  const payload = await parseApiJsonResponse(response);
  if (!response.ok) {
    throw new Error(payload.error || `HTTP ${response.status}`);
  }
  return payload;
}

/** Validate birth form; return error message or null if OK. */
function validateBirthForm(place) {
  if (!placePreset.value) return "Select a place.";
  if (placePreset.value === C.PLACE_CUSTOM_VALUE && !place) return "Enter a custom place.";
  if (!birthDate.value || !birthTime.value) return "Date and time are required.";
  return null;
}

/** Show/hide custom place input when preset is "Other". */
function syncCustomPlaceFieldVisibility() {
  const isCustom = placePreset.value === C.PLACE_CUSTOM_VALUE;
  if (customWrap) customWrap.hidden = !isCustom;
  if (!isCustom && placeCustom) placeCustom.value = "";
}

/** Form submit: fetch kundali JSON and render all tables. */
async function handleBirthFormSubmit(event) {
  event.preventDefault();
  const place = getBirthPlaceFromForm();
  const validationError = validateBirthForm(place);
  if (validationError) {
    showStatusMessage(validationError, true);
    return;
  }

  showStatusMessage("Loading…");
  if (resultsEl) resultsEl.hidden = true;

  try {
    await ensurePlanetDatabase();
    const kundaliPayload = await fetchKundaliJsonFromApi(
      birthDate.value,
      birthTime.value,
      place
    );
    renderKundaliResponseIntoPage(kundaliPayload);
  } catch (err) {
    const apiHint = isLocalDevUi()
      ? `Is Flask running on http://localhost:${C.FLASK_PORT}?`
      : `Is the API reachable at ${getFlaskApiOrigin()}?`;
    showStatusMessage(`Failed: ${err.message}. ${apiHint}`, true);
  }
}

if (document.getElementById("birth-form")) {
  if (placePreset) {
    placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }
  if (form) {
    form.addEventListener("submit", handleBirthFormSubmit);
    ensurePlanetDatabase().catch(() => {});
  }
}

/** Shared kundali view helpers (auspicious page row drill-down). */
window.SaptarishiKundaliView = {
  ensurePlanetDatabase,
  fetchJson: fetchKundaliJsonFromApi,
  renderIntoPage: renderKundaliResponseIntoPage
};

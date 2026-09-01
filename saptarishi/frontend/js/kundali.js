// Copyright © 2018-2026 ranjanravi.com. All rights reserved.

const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : null;
const CU = window.SaptarishiCommonUtils || null;
if (!C) {
  throw new Error("SAPTARISHI_CONSTANTS is required");
}

/** Cached planet database from ``/api/planet-database`` (``backend/database/data.json``). */
let planetDatabase = null;
/** ``column_key`` → ``{ color_id: hex }`` from ``planet_rules.color_codes.column_name``. */
let planetColorCodesByColumnKey = null;

const form = document.getElementById("birth-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const placePreset = document.getElementById("place-preset");
const customWrap = document.getElementById("custom-place-wrap");
const placeCustom = document.getElementById("place-custom");
const birthDate = document.getElementById("birth-date");
const birthTime = document.getElementById("birth-time");
const birthName = document.getElementById("birth-name");
const birthNameWrap = document.getElementById("birth-name-wrap");
const saveBirth = document.getElementById("save-birth");
const saveBirthWrap = document.getElementById("save-birth-wrap");
const openKundaliWrap = document.getElementById("open-kundali-wrap");
const savedKundaliSelect = document.getElementById("saved-kundali-select");
const tabOpenKundali = document.getElementById("tab-open-kundali");
const tabNewKundali = document.getElementById("tab-new-kundali");

let kundaliMode = "new";

/** True when UI is opened from localhost (Docker nginx on :9999 or file://). */
function isLocalDevUi() {
  if (CU && CU.isLocalDevUiHost) return CU.isLocalDevUiHost();
  if (
    document.documentElement.classList.contains("saptarishi-native-app") ||
    /SaptarishiNativeApp/i.test(navigator.userAgent || "")
  ) {
    return false;
  }
  const host = window.location.hostname;
  return window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1";
}

/** Flask API: localhost:8081 in dev; Render URL in production. */
function getFlaskApiOrigin() {
  if (CU && CU.getApiOrigin) return CU.getApiOrigin(C);
  return isLocalDevUi() ? `http://localhost:${C.FLASK_PORT}` : String(C.PRODUCTION_API_ORIGIN).replace(/\/$/, "");
}

/** Show loading or error text under the birth form; hide when empty. */
function showStatusMessage(message, isError, isLimitError) {
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

function showKundaliLoadingStatus() {
  if (CU && CU.startStatusLoading) {
    CU.startStatusLoading(statusEl, showStatusMessage);
    return;
  }
  showStatusMessage("Loading…");
}

function removePerIpTextFromMessage(message) {
  if (CU && CU.removePerIpText) return CU.removePerIpText(message);
  return String(message || "").replace(/\s*\(\d+\s+per\s+IP\s+address\)/gi, "");
}

function formatKundaliApiError(err) {
  if (CU && CU.formatApiLoadError) {
    return CU.formatApiLoadError(err, {
      failurePrefix: "Failed to load kundali",
      limitReachedFallback: "Free kundali limit reached."
    });
  }
  const msg = removePerIpTextFromMessage(err?.message || "Request failed");
  return { text: `Failed to load kundali: ${msg}`, limitReached: false };
}

/** Read place string from preset dropdown or custom text field. */
function getBirthPlaceFromKundaliForm() {
  if (CU && CU.getPlaceFromPresetOrCustom) {
    return CU.getPlaceFromPresetOrCustom(placePreset, placeCustom, C.PLACE_CUSTOM_VALUE);
  }
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

const KUNDALI_SUMMARY_QA_KEYS = {
  "combust planet": "combust_planet",
  "exalted planet": "exalted_planet",
  "debilitated planet": "debilitated_planet",
  "retrograde planet": "retrograde_planet"
};

/** One label + value row for the summary facts table. */
function createSummaryLabelValueRow(label, value) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  const qaKey = KUNDALI_SUMMARY_QA_KEYS[normalizeText(label)] || "";
  if (qaKey) {
    const wrap = document.createElement("span");
    wrap.className = "kundali-table-header-with-info";
    wrap.appendChild(document.createTextNode(toTitleCaseWords(label)));
    wrap.appendChild(createKundaliQaInfoButton(qaKey));
    th.appendChild(wrap);
  } else {
    th.textContent = toTitleCaseWords(label);
  }
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

/** Degree-phase / default starting strength for one planet row. */
function getPlanetStrengthBase(rowData) {
  const base = rowData?.strength_adjustments?.base;
  return typeof base === "number" && Number.isFinite(base) ? base : null;
}

/** Tooltip listing every rule line: ``100 (base) +50 (friend) ... = -190``. */
function formatPlanetStrengthVerificationTitle(rowData) {
  const adj = rowData?.strength_adjustments;
  if (!adj) return "";
  const base = typeof adj.base === "number" ? adj.base : null;
  const total =
    typeof adj.total === "number"
      ? adj.total
      : typeof rowData.strength_percent === "number"
        ? rowData.strength_percent
        : null;
  if (base == null || total == null) return "";
  const baseLabel = adj.base_rule === "degree_in_sign_bands" ? "Degree Phase" : "base";
  const lines = [`${base} (${baseLabel})`];
  for (const items of Object.values(adj.by_column || {})) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (typeof item?.value !== "number" || item.value === 0) continue;
      const sign = item.value > 0 ? "+" : "";
      lines.push(`${sign}${item.value} (${formatStrengthRuleDisplayLabel(item)})`);
    }
  }
  const limit = adj.limit_clamp;
  if (limit && typeof limit.value === "number" && limit.value !== 0) {
    const sign = limit.value > 0 ? "+" : "";
    lines.push(`${sign}${limit.value} (${limit.label || "Strength Limit"})`);
  }
  lines.push(`= ${total}`);
  return lines.join("\n");
}

/** Format a strength % change for display in brackets, e.g. ``(+100)`` or ``(-50)``. */
function formatStrengthPercentChangeInBrackets(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value === 0) return "";
  if (value > 0) return ` (+${value})`;
  return ` (${value})`;
}

/** Rules whose +/- is shown on the status text (Friend, Enemy, Own, etc.). */
const STRENGTH_RULE_PRIMARY_FOR_STATUS_COLUMN = {
  planet_status_in_rashi: new Set([
    "exalted",
    "debilitated",
    "own_rashi",
    "friend_rashi",
    "enemy_rashi"
  ]),
  planet_status_in_nakshatra: new Set([
    "own_nakshatra",
    "friend_nakshatra",
    "enemy_nakshatra"
  ])
};

const STRENGTH_RULE_FALLBACK_LABELS = {
  moon_under_gandmool_nakshatra: "gandmool",
  moon_under_precious_nakshatra: "Precious Nakshatra",
  dusthana_house: "Dusthana House",
  mangal_dosha: "mangaldosh",
  trikona_house: "Trikona House",
  retrograde: "Retrograde",
  combustion: "Combustion",
  death_degree: "Death Degree",
  degree_in_sign_bands: "Degree Phase",
  incoming_aspect: "Aspect",
  good_karakwaqt: "Good Karakwaqt",
  bad_karakwaqt: "Bad Karakwaqt"
};

/** All non-zero strength rules for one planets-table column. */
function getStrengthRulesForTableColumn(rowData, columnKey) {
  const items = rowData?.strength_adjustments?.by_column?.[columnKey];
  if (!Array.isArray(items)) return [];
  return items.filter((item) => typeof item?.value === "number" && item.value !== 0);
}

function formatStrengthRuleDisplayLabel(rule) {
  if (rule?.label) return String(rule.label);
  const ruleId = String(rule?.rule || "");
  if (STRENGTH_RULE_FALLBACK_LABELS[ruleId]) return STRENGTH_RULE_FALLBACK_LABELS[ruleId];
  return toTitleCaseWords(ruleId.replace(/_/g, " "));
}

/** Render cell text plus one bracket per rule (never sum unlike rules into one bracket). */
function appendPlanetsTableCellWithStrengthRules(td, rowData, columnKey, mainText) {
  const rules = getStrengthRulesForTableColumn(rowData, columnKey);
  const primarySet = STRENGTH_RULE_PRIMARY_FOR_STATUS_COLUMN[columnKey];
  const mainEl = document.createElement("div");
  mainEl.className = "planets-strength-main";
  mainEl.textContent = mainText;

  if (primarySet) {
    const primary = rules.find((rule) => primarySet.has(rule.rule));
    if (primary) appendStrengthPercentChangeLabel(mainEl, primary.value);
    td.appendChild(mainEl);
    for (const rule of rules) {
      if (primary && rule.rule === primary.rule) continue;
      const line = document.createElement("div");
      line.className = "planets-strength-rule-line";
      line.textContent = formatStrengthRuleDisplayLabel(rule);
      appendStrengthPercentChangeLabel(line, rule.value);
      td.appendChild(line);
    }
    return;
  }

  td.appendChild(mainEl);
  // Always show named rules on their own line, e.g. gandmool (-400), mangaldosh (-300).
  for (const rule of rules) {
    const line = document.createElement("div");
    line.className = "planets-strength-rule-line";
    line.textContent = formatStrengthRuleDisplayLabel(rule);
    appendStrengthPercentChangeLabel(line, rule.value);
    td.appendChild(line);
  }
}

/** Strength % change from one incoming aspect (e.g. Mars aspect on this planet). */
function getIncomingAspectStrengthChangeForPlanet(rowData, planetKey) {
  const items = rowData?.strength_adjustments?.by_column?.aspected_by;
  if (!Array.isArray(items)) return null;
  const key = normalizeText(planetKey);
  const row = items.find((item) => normalizeText(item?.planet) === key);
  const value = Number(row?.value);
  return Number.isFinite(value) && value !== 0 ? value : null;
}

/** Append a bracketed strength % change label next to existing cell text. */
function appendStrengthPercentChangeLabel(el, delta) {
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return;
  const span = document.createElement("span");
  span.className = "planets-strength-delta";
  span.textContent = formatStrengthPercentChangeInBrackets(delta);
  el.appendChild(span);
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
  if (key === "house_lord") {
    return rowData.house_lord ?? rowData[key] ?? "";
  }
  if (key === "house_rashi") {
    const flat = rowData.house_rashi ?? rowData.rashi;
    if (flat != null && String(flat).trim()) {
      return String(flat).trim();
    }
    const hr = rowData.house?.rashi;
    if (hr && typeof hr === "object") {
      return formatRashiDisplayFromHouseMeta({
        rashi_index: hr.index,
        rashi_english: hr.english,
        rashi_sanskrit: hr.sanskrit
      });
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
  if (key === "planet" || key === "house_lord") {
    if (!String(text).trim()) return key === "planet" ? "No planet" : "—";
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
    key === "house_lord" ||
    key === "house_rashi" ||
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

/** Chart shading cap from API ``strength_max`` (from data.json ``strength_limits.max_percent``). */
function strengthMaxFromPayload(kundaliPayload) {
  const max = kundaliPayload?.strength_max;
  return typeof max === "number" && max > 0 ? max : null;
}

/** Fetch and cache full planet database JSON from API. */
async function ensurePlanetDatabase() {
  if (planetDatabase) return planetDatabase;
  const path = C.API_PLANET_DATABASE_PATH;
  try {
    const payload =
      typeof SaptarishiAuth !== "undefined"
        ? await SaptarishiAuth.apiFetch(path)
        : await (async () => {
            const response = await fetch(`${getFlaskApiOrigin()}${path}`);
            const data = await parseApiJsonResponse(response);
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            return data;
          })();
    planetDatabase = payload;
    applyPlanetColorCodesFromDatabase(payload);
    return planetDatabase;
  } catch (err) {
    console.warn("planet-database unavailable:", err.message);
    return null;
  }
}

/** Parse ``#RRGGBB`` / ``#RGB`` into ``r, g, b`` for CSS ``rgba(var(--x), a)``. */
function hexColorToRgbChannels(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const r = parseInt(raw[0] + raw[0], 16);
    const g = parseInt(raw[1] + raw[1], 16);
    const b = parseInt(raw[2] + raw[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    const r = parseInt(raw.slice(0, 2), 16);
    const g = parseInt(raw.slice(2, 4), 16);
    const b = parseInt(raw.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return "";
}

/**
 * Apply ``planet_rules.color_codes`` from data.json as CSS variables
 * (``--planet-color-<color>`` hex from palette ``color`` field)
 * and index by ``column_name`` for per-column gating.
 */
function applyPlanetColorCodesFromDatabase(db) {
  const rows = db?.planet_rules?.color_codes;
  if (!Array.isArray(rows) || !rows.length || typeof document === "undefined") {
    planetColorCodesByColumnKey = null;
    return;
  }
  const root = document.documentElement;
  const byColumn = {};
  for (const row of rows) {
    const palette = String(row?.color || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
    const code = String(row?.color_code || "").trim();
    const apply = String(row?.apply_rule || "yes").trim().toLowerCase();
    if (!palette || !code || apply === "no") continue;
    root.style.setProperty(`--planet-color-${palette}`, code);
    const rgb = hexColorToRgbChannels(code);
    if (rgb) root.style.setProperty(`--planet-color-${palette}-rgb`, rgb);

    const columnName = String(row?.column_name || "").trim().toLowerCase();
    if (!columnName) continue;
    const columnKey = C.COLOR_CODE_COLUMN_NAME_TO_KEY[columnName];
    if (!columnKey) continue;
    if (!byColumn[columnKey]) byColumn[columnKey] = {};
    byColumn[columnKey][palette] = code;
  }
  planetColorCodesByColumnKey = byColumn;
}

/** Map CSS cell kind → palette ``color`` (green / red / neutral). */
function cellKindToColorCodeId(kind) {
  const k = String(kind || "")
    .trim()
    .toLowerCase();
  if (k === "high" || k === "own" || k === "friend") return "green";
  if (k === "low" || k === "enemy") return "red";
  if (k === "neutral") return "neutral";
  return "";
}

/**
 * True when ``color_codes.column_name`` allows this palette for the column.
 * If color_codes not loaded yet, allow (Python ``cell_styles`` already gated).
 */
function isPlanetCellColorAllowedForColumn(columnKey, colorKind) {
  if (!colorKind) return false;
  if (!planetColorCodesByColumnKey) return true;
  const allowed = planetColorCodesByColumnKey[columnKey];
  if (!allowed || !Object.keys(allowed).length) return false;
  const palette = cellKindToColorCodeId(colorKind);
  if (!palette) return false;
  if (allowed[palette]) return true;
  if (palette === "green" && allowed.green_text) return true;
  if (palette === "red" && allowed.red_text) return true;
  if (palette === "neutral" && (allowed.lord_neutral || allowed.black)) return true;
  return false;
}

/** Whether helpful/harmful navatara row tint is allowed for Nakshatra navatara column. */
function isNavataraRowColorAllowed(helpful) {
  return isPlanetCellColorAllowedForColumn("navatara", helpful ? "friend" : "enemy");
}

/** Lord Comparison tones gated by color_codes column_name ``Lord Comparison``. */
function isLordComparisonToneAllowed(tone) {
  if (!planetColorCodesByColumnKey) return true;
  const allowed = planetColorCodesByColumnKey.lord_comparison;
  if (!allowed || !Object.keys(allowed).length) return false;
  const t = String(tone || "")
    .trim()
    .toLowerCase();
  if (t === "plus") return Boolean(allowed.lord_plus || allowed.green);
  if (t === "minus") return Boolean(allowed.lord_minus || allowed.red);
  if (t === "neutral") return Boolean(allowed.lord_neutral || allowed.neutral);
  return true;
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
  return null;
}

/** Map strength % to 0–1 chart shading using API ``strength_max`` only. */
function planetStrengthVisualVars(strengthPercent, strengthMax) {
  if (!(strengthMax > 0) || typeof strengthPercent !== "number") {
    return { intensity: 0 };
  }
  const pct = Math.max(0, strengthPercent);
  const intensity = Math.min(1, pct / strengthMax);
  return { intensity };
}

function applyPlanetStrengthStyle(el, strengthPercent, strengthMax) {
  if (!(strengthMax > 0) || typeof strengthPercent !== "number") {
    return;
  }
  const { intensity } = planetStrengthVisualVars(strengthPercent, strengthMax);
  el.style.setProperty("--planet-strength", String(intensity));
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

/** Apply ``cell_styles`` color from API (kundali.py), gated by ``color_codes.column_name``. */
function applyPlanetTableCellStyle(td, colorKind, columnKey) {
  if (!colorKind) return;
  if (!isPlanetCellColorAllowedForColumn(columnKey, colorKind)) return;
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
  const names = collectAspectedByPlanetKeys(rowData);
  if (!names.length) {
    td.textContent = "—";
    tr.appendChild(td);
    return;
  }
  const parts = names.map((name) => {
    const label = toTitleCaseWords(name);
    const delta = getIncomingAspectStrengthChangeForPlanet(rowData, name);
    return `${label}${formatStrengthPercentChangeInBrackets(delta)}`;
  });
  td.textContent = parts.join(", ");
  tr.appendChild(td);
}

/** True when API dumped a CSS hex (``#rgb`` / ``#rrggbb``). */
function isCssHexColor(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(value || "").trim());
}

/**
 * Chart planet color from API ``planet_status_color``.
 * Prefer dumped hex (``#2e7d32``); legacy kinds (high/friend/enemy) still map to classes.
 */
function planetChartStatusClass(planet) {
  const raw = String(planet?.planet_status_color || "").trim();
  if (isCssHexColor(raw)) return "";
  const kind = raw.toLowerCase();
  if (!kind) return "kundali-chart-planet--neutral";
  // Same allow-list as the Planet Strength column in planets_table.
  if (!isPlanetCellColorAllowedForColumn("strength", kind)) {
    return "kundali-chart-planet--neutral";
  }
  if (kind === "high") return "kundali-chart-planet--high";
  if (kind === "low") return "kundali-chart-planet--low";
  if (kind === "own") return "kundali-chart-planet--own";
  if (kind === "friend") return "kundali-chart-planet--friend";
  if (kind === "enemy") return "kundali-chart-planet--enemy";
  return "kundali-chart-planet--neutral";
}

/** Apply dumped hex fill or status class onto a chart planet ``tspan``. */
function applyPlanetChartColor(tspan, entry) {
  const raw = String(entry?.planet_status_color || "").trim();
  if (isCssHexColor(raw)) {
    tspan.setAttribute("class", "kundali-chart-planet");
    tspan.style.fill = raw;
    return;
  }
  const statusClass = planetChartStatusClass(entry);
  tspan.setAttribute(
    "class",
    statusClass ? `kundali-chart-planet ${statusClass}` : "kundali-chart-planet kundali-chart-planet--neutral"
  );
}

function stylePlanetTspan(tspan, entry, strengthMax) {
  applyPlanetChartColor(tspan, entry);
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

/** Nava-tara row shading depth from API ``auspicious`` (yes/no in data.json). */
function navataraIntensity(_navataraName, isHelpful) {
  return isHelpful ? 0.72 : 0.72;
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

function appendPlanetsPlanetCell(tr, rowData, cellStyles) {
  const td = document.createElement("td");
  td.className = "planets-td-planet";
  const nameEl = document.createElement("div");
  nameEl.className = "planets-planet-name";
  nameEl.textContent = formatTableCellForDisplay("planet", rowData.planet);
  const base = getPlanetStrengthBase(rowData);
  if (base != null) appendStrengthPercentChangeLabel(nameEl, base);
  td.appendChild(nameEl);
  applyPlanetTableCellStyle(td, cellStyles?.planet || "", "planet");
  tr.appendChild(td);
}

/** Degree column: degree text + retrograde / combustion only (base stays on Planet). */
function appendPlanetsDegreeCell(tr, rowData, cellStyles) {
  const td = document.createElement("td");
  const mainEl = document.createElement("div");
  mainEl.className = "planets-strength-main";
  mainEl.textContent = formatTableCellForDisplay("degree", rowData.degree) || "—";
  td.appendChild(mainEl);
  for (const rule of getStrengthRulesForTableColumn(rowData, "degree")) {
    const line = document.createElement("div");
    line.className = "planets-strength-rule-line";
    line.textContent = formatStrengthRuleDisplayLabel(rule);
    appendStrengthPercentChangeLabel(line, rule.value);
    td.appendChild(line);
  }
  applyPlanetTableCellStyle(td, cellStyles?.degree || "", "degree");
  tr.appendChild(td);
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
    const houseRule = getStrengthRulesForTableColumn(rowData, "house")[0];
    if (houseRule) appendStrengthPercentChangeLabel(numEl, houseRule.value);
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

/** Planets-table columns that show rule +/- (excluding base on Planet and total on Planet Strength). */
const KUNDALI_PLANETS_TABLE_COLUMNS_WITH_STRENGTH_BREAKDOWN = {
  planet_status_in_rashi: "planet_status_in_rashi",
  is_planet_lagna_lord_enemy: null,
  nakshatra: "nakshatra",
  planet_status_in_nakshatra: "planet_status_in_nakshatra",
  karakwaqt: "karakwaqt",
  is_planet_in_6_8_12_house: "is_planet_in_6_8_12_house",
  is_planet_at_death_degree: "is_planet_at_death_degree"
};

/** Planets table columns (keep in sync with kundali.html thead). */
const KUNDALI_PLANETS_TABLE_COLUMNS = [
  { key: "dasha_age", header: "Mahadasha on Age" },
  { key: "planet", header: "Planet" },
  { key: "strength", header: "Planet Strength" },
  { type: "house", header: "In House" },
  { type: "aspected_by", header: "Aspected By" },
  { key: "house_rashi", header: "House Rashi" },
  { key: "house_lord", header: "House Lord" },
  { key: "planet_status_in_rashi", header: "Rashi Status" },
  { key: "is_planet_lagna_lord_enemy", header: "Lagna Lord Enemy" },
  { key: "nakshatra", header: "Nakshatra", qaKey: "nakshatra" },
  { key: "planet_status_in_nakshatra", header: "Nakshatra Status" },
  { key: "karakwaqt", header: "Karakwaqt", qaKey: "karakwaqt" },
  { key: "is_planet_in_6_8_12_house", header: "Malefic 6/8/12", qaKey: "malefic_6_8_12" },
  { key: "navatara", header: "Nakshatra navatara", qaKey: "nakshatra_navatara" },
  { key: "degree", header: "Degree" },
  { key: "is_planet_at_death_degree", header: "Death Degree", qaKey: "death_degree" }
];

const KUNDALI_PLANETS_HEADER_QA_KEYS = Object.fromEntries(
  KUNDALI_PLANETS_TABLE_COLUMNS.filter((col) => col.qaKey).map((col) => [col.header, col.qaKey])
);

const KUNDALI_PLANETS_TABLE_HEADERS = KUNDALI_PLANETS_TABLE_COLUMNS.map((col) => col.header);
const KUNDALI_PLANETS_TABLE_COLUMNS_WITHOUT_HOUSE = KUNDALI_PLANETS_TABLE_COLUMNS.filter(
  (col) => col.type !== "house"
);
const KUNDALI_PLANETS_GRID_TABLE_HEADERS = KUNDALI_PLANETS_TABLE_COLUMNS_WITHOUT_HOUSE.map(
  (col) => col.header
);

const KUNDALI_PLANETS_TABLE_HEADING = "Planet/Houses Status";
const KUNDALI_PLANETS_VIEW_GRID = "grid";
const KUNDALI_PLANETS_VIEW_FULL = "full";
let kundaliPlanetsViewMode = KUNDALI_PLANETS_VIEW_GRID;

/** Grid-house → linked divisional chart keys (D1 stays in Full-view strip only). */
const HOUSE_DIVISIONAL_CHART_KEYS = {
  6: ["D30"],
  8: ["D30"],
  9: ["D9"],
  10: ["D10"],
  12: ["D60"]
};

/** Group ``planets_table`` rows by whole-sign house number (1–12). */
function groupPlanetsTableRowsByHouse(rows) {
  const byHouse = {};
  for (let house = 1; house <= 12; house += 1) byHouse[house] = [];
  for (const rowData of rows || []) {
    const houseNum = Number(houseFromTableRow(rowData).number);
    if (houseNum >= 1 && houseNum <= 12) byHouse[houseNum].push(rowData);
  }
  return byHouse;
}

/** Rows in this house that have a planet (same rows the full table shows). */
function housePlanetTableRows(houseRows) {
  return (houseRows || []).filter((row) => String(row?.planet || "").trim());
}

/** Same Planet Strength cell text as the full table view. */
function planetsTableStrengthCellText(rowData) {
  const direct = formatTableCellForDisplay(
    "strength",
    planetsTableCellText("strength", rowData)
  );
  if (direct && direct !== "—") return direct;
  const total = rowData?.strength_adjustments?.total;
  if (typeof total === "number" && Number.isFinite(total)) return `${total}%`;
  if (typeof rowData?.strength_percent === "number") return `${rowData.strength_percent}%`;
  return "—";
}

/** Row that drives tile tint: first planet in this house, else the empty-house table row. */
function pickHouseTileRepresentativeRow(houseRows) {
  if (!Array.isArray(houseRows) || !houseRows.length) return null;
  const planetRows = housePlanetTableRows(houseRows);
  return planetRows[0] || houseRows[0] || null;
}

/** Display text for one ``planets_table`` column on a single row. */
function planetsTableRowDisplayForColumn(rowData, col) {
  if (col.key === "planet") {
    const text = formatTableCellForDisplay("planet", rowData.planet);
    return text === "No planet" ? "" : text;
  }
  if (col.type === "house") {
    const { number: num, for: forRaw } = houseFromTableRow(rowData);
    const forText = formatHouseForList(forRaw);
    if (num != null && num !== "" && forText) return `${num} — ${forText}`;
    if (num != null && num !== "") return String(num);
    return forText;
  }
  if (col.type === "aspected_by") {
    const text = formatAspectedByPlanets(rowData);
    return text || "—";
  }
  if (col.key === "degree") {
    return formatTableCellForDisplay("degree", rowData.degree) || "—";
  }
  if (col.key === "strength") {
    return planetsTableStrengthCellText(rowData);
  }
  const key = col.key;
  const displayValue = planetsTableCellText(key, rowData);
  return formatTableCellForDisplay(key, displayValue);
}

/** Combine column values for all planets sitting in one house. */
function houseColumnDisplayForRows(houseRows, col) {
  const rows = Array.isArray(houseRows) ? houseRows : [];
  const planetRows = housePlanetTableRows(rows);
  const sourceRows = planetRows.length ? planetRows : rows.slice(0, 1);
  if (col.key === "planet") {
    const names = planetRows
      .map((row) => planetsTableRowDisplayForColumn(row, col))
      .filter(Boolean);
    return names.length ? names.join(", ") : "—";
  }
  if (col.key === "strength") {
    if (!planetRows.length) return "—";
    if (planetRows.length === 1) return planetsTableStrengthCellText(planetRows[0]);
    return planetRows
      .map((row) => {
        const name = formatTableCellForDisplay("planet", row.planet);
        return `${name}: ${planetsTableStrengthCellText(row)}`;
      })
      .join("\n");
  }
  const values = sourceRows
    .map((row) => planetsTableRowDisplayForColumn(row, col))
    .filter((value) => value && value !== "—");
  if (!values.length) return "—";
  return [...new Set(values)].join(", ");
}

function formatHouseTileStrengthPercent(houseRows) {
  const planetRows = housePlanetTableRows(houseRows);
  if (!planetRows.length) return "—";
  if (planetRows.length === 1) return planetsTableStrengthCellText(planetRows[0]);
  return planetRows
    .map((row) => {
      const name = formatTableCellForDisplay("planet", row.planet);
      return `${name} ${planetsTableStrengthCellText(row)}`;
    })
    .join(" · ");
}

/** Apply planet-table tint classes onto a house tile button. */
function applyHousePlanetsTileStyle(btn, representativeRow) {
  if (!btn || !representativeRow) return;
  const colorKind = representativeRow?.cell_styles?.strength || "";
  applyPlanetTableCellStyle(btn, colorKind, "strength");
}

function normalizeKundaliPlanetsViewMode(mode) {
  return mode === KUNDALI_PLANETS_VIEW_FULL ? KUNDALI_PLANETS_VIEW_FULL : KUNDALI_PLANETS_VIEW_GRID;
}

/** Show grid tiles or the full planets table inside one status section. */
function applyKundaliPlanetsView(fromEl) {
  const view = normalizeKundaliPlanetsViewMode(kundaliPlanetsViewMode);
  const sections = fromEl
    ? [fromEl.closest?.(".planets-status-section") || fromEl].filter(Boolean)
    : Array.from(document.querySelectorAll(".planets-status-section"));
  for (const section of sections) {
    if (!section?.querySelector) continue;
    section.setAttribute("data-planets-view", view);
    section.classList.toggle("planets-status-section--grid", view === KUNDALI_PLANETS_VIEW_GRID);
    section.classList.toggle("planets-status-section--full", view === KUNDALI_PLANETS_VIEW_FULL);
    const tiles = section.querySelector(".house-planets-tiles");
    const tableWrap = section.querySelector(".planets-table-wrap");
    const hasData = Boolean(
      (tiles && tiles.childElementCount) || tableWrap?.querySelector("tbody tr")
    );
    if (tiles) {
      tiles.hidden = !(hasData && view === KUNDALI_PLANETS_VIEW_GRID);
      if (tiles.hidden) {
        tiles.querySelectorAll(".house-planets-tile-btn").forEach((btn) => {
          btn.classList.remove("house-planets-tile-btn--active");
          btn.setAttribute("aria-pressed", "false");
          btn.setAttribute("aria-expanded", "false");
        });
        tiles.querySelectorAll(".house-planets-tile-panel").forEach((panel) => {
          panel.hidden = true;
        });
      }
    }
    if (tableWrap) tableWrap.hidden = !(hasData && view === KUNDALI_PLANETS_VIEW_FULL);
    const divisional = section.querySelector(".planets-status-divisional, #divisional-charts-section");
    if (divisional && divisional.dataset.hasCharts === "1") {
      divisional.hidden = view !== KUNDALI_PLANETS_VIEW_FULL;
      if (view !== KUNDALI_PLANETS_VIEW_FULL) collapseDivisionalChartsPanel();
    }
    section.querySelectorAll(".planets-view-switch__btn[data-planets-view]").forEach((btn) => {
      const active = btn.getAttribute("data-planets-view") === view;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }
}

function setKundaliPlanetsViewMode(mode, fromEl) {
  kundaliPlanetsViewMode = normalizeKundaliPlanetsViewMode(mode);
  applyKundaliPlanetsView(fromEl);
}

function createPlanetsViewSwitchElement(idPrefix) {
  const switchEl = document.createElement("div");
  switchEl.className = "planets-view-switch";
  switchEl.setAttribute("role", "group");
  switchEl.setAttribute("aria-label", "Planets status view");
  const current = normalizeKundaliPlanetsViewMode(kundaliPlanetsViewMode);
  for (const [mode, label] of [
    [KUNDALI_PLANETS_VIEW_GRID, "Grid view"],
    [KUNDALI_PLANETS_VIEW_FULL, "Table view"]
  ]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `planets-view-switch__btn${mode === current ? " is-active" : ""}`;
    btn.dataset.planetsView = mode;
    btn.id = kundaliElementId(idPrefix, `planets-view-${mode}`);
    btn.textContent = label;
    btn.setAttribute("aria-pressed", mode === current ? "true" : "false");
    switchEl.appendChild(btn);
  }
  return switchEl;
}

function houseGridDescriptionEntry(descriptions, houseNum) {
  const block = descriptions && typeof descriptions === "object" ? descriptions : null;
  if (!block) return null;
  return block[String(houseNum)] || block[houseNum] || null;
}

function houseGridDescriptionParagraphs(descriptions, houseNum) {
  const entry = houseGridDescriptionEntry(descriptions, houseNum);
  if (!entry) return [];
  if (Array.isArray(entry.paragraphs)) {
    return entry.paragraphs.map((part) => String(part || "").trim()).filter(Boolean);
  }
  const text = String(entry.text || "").trim();
  return text ? [text] : [];
}

function appendHouseDescriptionLabeledList(parent, label, items) {
  if (!Array.isArray(items) || !items.length) return;
  const wrap = document.createElement("div");
  wrap.className = "house-planets-sheet__pc";
  const heading = document.createElement("strong");
  heading.className = "house-planets-sheet__pc-label";
  heading.textContent = label;
  const list = document.createElement("ol");
  list.className = "house-planets-sheet__pc-list";
  for (const item of items) {
    const li = document.createElement("li");
    li.textContent = String(item || "").trim();
    if (li.textContent) list.appendChild(li);
  }
  if (!list.children.length) return;
  wrap.append(heading, list);
  parent.appendChild(wrap);
}

function renderHouseGridDescription(descEl, descriptions, houseNum) {
  const entry = houseGridDescriptionEntry(descriptions, houseNum);
  if (!entry) return false;
  const sections = Array.isArray(entry.sections) ? entry.sections : [];
  if (sections.length) {
    for (const section of sections) {
      if (!section || typeof section !== "object") continue;
      if (section.kind === "planet") {
        const wrap = document.createElement("div");
        wrap.className = "house-planets-sheet__planet-read";
        const title = document.createElement("p");
        title.className = "house-planets-sheet__planet-read-title";
        title.textContent = String(section.title || "").trim();
        if (title.textContent) wrap.appendChild(title);
        appendHouseDescriptionLabeledList(wrap, "Pros:", section.pros);
        appendHouseDescriptionLabeledList(wrap, "Cons:", section.cons);
        if (wrap.children.length) descEl.appendChild(wrap);
        continue;
      }
      const text = String(section.text || "").trim();
      if (!text) continue;
      const p = document.createElement("p");
      p.textContent = text;
      descEl.appendChild(p);
    }
    return descEl.children.length > 0;
  }
  const paragraphs = houseGridDescriptionParagraphs({ [String(houseNum)]: entry }, houseNum);
  for (const text of paragraphs) {
    const p = document.createElement("p");
    p.textContent = text;
    descEl.appendChild(p);
  }
  return paragraphs.length > 0;
}

function findDivisionalChartByKey(charts, key) {
  const want = String(key || "").trim().toUpperCase();
  if (!want) return null;
  return (Array.isArray(charts) ? charts : []).find(
    (chart) => String(chart?.key || "").trim().toUpperCase() === want
  ) || null;
}

function appendHouseDivisionalChartControls(sheet, houseNum, options = {}) {
  const keys = HOUSE_DIVISIONAL_CHART_KEYS[Number(houseNum)] || [];
  if (!keys.length) return;
  const charts = Array.isArray(options.divisionalCharts) ? options.divisionalCharts : [];
  const strengthMax =
    typeof options.strengthMax === "number" ? options.strengthMax : undefined;
  const matched = keys
    .map((key) => findDivisionalChartByKey(charts, key))
    .filter(Boolean);
  if (!matched.length) return;

  const wrap = document.createElement("div");
  wrap.className = "house-planets-sheet__divisional";

  for (const chart of matched) {
    const key = String(chart.key || "Dx").toUpperCase();
    const title = chart.title || key;
    const block = document.createElement("div");
    block.className = "house-planets-sheet__divisional-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "house-planets-sheet__divisional-btn";
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = `Show ${key} chart`;

    const host = document.createElement("div");
    host.className = "kundali-chart-host house-planets-sheet__divisional-host";
    host.hidden = true;
    host.setAttribute("aria-label", title);

    let rendered = false;
    btn.addEventListener("click", () => {
      const open = host.hidden;
      host.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? `Hide ${key} chart` : `Show ${key} chart`;
      if (open && !rendered) {
        const chartPayload = {
          planets: chart.planets,
          strength_max:
            typeof chart.strength_max === "number" ? chart.strength_max : strengthMax
        };
        renderKundaliChart(buildNorthIndianChartFromPayload(chartPayload), host);
        bindKundaliChartZoom(host, chartPayload, title);
        rendered = true;
      }
    });

    block.append(btn, host);
    wrap.appendChild(block);
  }

  sheet.appendChild(wrap);
}

function createHousePlanetsSheetElement(houseNum, forText, strengthText, planetNames, houseRows, descriptions, options = {}) {
  const sheet = document.createElement("div");
  sheet.className = "house-planets-sheet";

  const head = document.createElement("div");
  head.className = "house-planets-sheet__head";

  const title = document.createElement("div");
  title.className = "house-planets-sheet__title";
  const houseLabel = document.createElement("strong");
  houseLabel.textContent = `House ${houseNum}`;
  title.appendChild(houseLabel);
  if (forText) {
    const forEl = document.createElement("span");
    forEl.className = "house-planets-sheet__for";
    forEl.textContent = forText;
    title.appendChild(forEl);
  }
  if (planetNames) {
    const planetsEl = document.createElement("span");
    planetsEl.className = "house-planets-sheet__planets";
    planetsEl.textContent = planetNames;
    title.appendChild(planetsEl);
  }
  head.appendChild(title);

  if (strengthText && strengthText !== "—") {
    const pct = document.createElement("span");
    pct.className = "house-planets-sheet__pct";
    pct.textContent = strengthText;
    head.appendChild(pct);
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap house-planets-sheet__table-wrap";
  const table = document.createElement("table");
  table.className = "navatara-data-table kundali-table house-planets-sheet__table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of KUNDALI_PLANETS_GRID_TABLE_HEADERS) {
    headerRow.appendChild(createPlanetsTableHeaderCell(label));
  }
  thead.appendChild(headerRow);
  const tbody = document.createElement("tbody");
  renderPlanetsTableWithColors(tbody, houseRows, { hideHouseColumn: true });
  table.append(thead, tbody);
  tableWrap.appendChild(table);

  sheet.append(head, tableWrap);

  const desc = document.createElement("div");
  desc.className = "house-planets-sheet__desc";
  desc.setAttribute("aria-label", `House ${houseNum} reading`);
  if (renderHouseGridDescription(desc, descriptions, houseNum)) {
    sheet.appendChild(desc);
  }

  appendHouseDivisionalChartControls(sheet, houseNum, options);

  return sheet;
}

/** Render 12 house tiles (heading from In House; tint/% from Planet Strength). */
function renderHousePlanetsTiles(container, rows, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  const allRows = Array.isArray(rows) ? rows : [];
  if (!allRows.length) return;

  const byHouse = groupPlanetsTableRowsByHouse(allRows);
  const descriptions = options.descriptions || null;
  const divisionalCharts = Array.isArray(options.divisionalCharts) ? options.divisionalCharts : [];
  const strengthMax = typeof options.strengthMax === "number" ? options.strengthMax : undefined;
  let selectedHouse = "";

  const closeAllPanels = () => {
    container.querySelectorAll(".house-planets-tile-btn").forEach((btn) => {
      btn.classList.remove("house-planets-tile-btn--active");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");
    });
    container.querySelectorAll(".house-planets-tile-panel").forEach((panel) => {
      panel.hidden = true;
    });
  };

  for (let houseNum = 1; houseNum <= 12; houseNum += 1) {
    const houseRows = byHouse[houseNum];
    const sampleRow = houseRows[0];
    if (!sampleRow) continue;

    const { number: num, for: forRaw } = houseFromTableRow(sampleRow);
    const forText = formatHouseForList(forRaw);
    const representativeRow = pickHouseTileRepresentativeRow(houseRows);
    const strengthText = formatHouseTileStrengthPercent(houseRows);
    const planetNames = houseColumnDisplayForRows(houseRows, { key: "planet" });
    const displayPlanetNames = planetNames && planetNames !== "—" ? planetNames : "";
    const houseLabel = num != null && num !== "" ? String(num) : String(houseNum);

    const wrap = document.createElement("div");
    wrap.className = "house-planets-tile-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "house-planets-tile-btn";
    btn.dataset.house = String(houseNum);
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-expanded", "false");
    btn.title = [houseLabel, forText, strengthText].filter(Boolean).join(" · ");
    applyHousePlanetsTileStyle(btn, representativeRow);

    const numEl = document.createElement("span");
    numEl.className = "house-planets-tile-btn__num";
    numEl.textContent = houseLabel;
    btn.appendChild(numEl);

    if (forText) {
      const forEl = document.createElement("span");
      forEl.className = "house-planets-tile-btn__for";
      forEl.textContent = forText;
      btn.appendChild(forEl);
    }

    if (strengthText) {
      const pctEl = document.createElement("span");
      pctEl.className = "house-planets-tile-btn__pct";
      pctEl.textContent = strengthText;
      btn.appendChild(pctEl);
    }

    const panel = document.createElement("div");
    panel.className = "house-planets-tile-panel";
    panel.hidden = true;
    panel.appendChild(
      createHousePlanetsSheetElement(
        houseLabel,
        forText,
        strengthText,
        displayPlanetNames,
        houseRows,
        descriptions,
        { divisionalCharts, strengthMax }
      )
    );

    if (housePlanetsTileIsAdverse(houseRows, representativeRow)) {
      applyAdverseHouseTileContentLock(btn, panel);
    }

    btn.addEventListener("click", () => {
      const houseKey = String(houseNum);
      if (selectedHouse === houseKey && !panel.hidden) {
        closeAllPanels();
        selectedHouse = "";
        return;
      }
      closeAllPanels();
      selectedHouse = houseKey;
      btn.classList.add("house-planets-tile-btn--active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-expanded", "true");
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    wrap.append(btn, panel);
    container.appendChild(wrap);
  }
}

/** Planets table: values and ``cell_styles`` come from API (kundali.py). */
function renderPlanetsTableWithColors(tbody, rows, options = {}) {
  if (!tbody) return;
  tbody.innerHTML = "";
  const columns = options.hideHouseColumn
    ? KUNDALI_PLANETS_TABLE_COLUMNS_WITHOUT_HOUSE
    : KUNDALI_PLANETS_TABLE_COLUMNS;
  const sortedRows = Array.isArray(rows) ? rows : [];
  for (const rowData of sortedRows) {
    const tr = document.createElement("tr");
    const cellStyles = rowData.cell_styles || {};
    for (const col of columns) {
      if (col.key === "planet") {
        appendPlanetsPlanetCell(tr, rowData, cellStyles);
        continue;
      }
      if (col.key === "degree") {
        appendPlanetsDegreeCell(tr, rowData, cellStyles);
        continue;
      }
      if (col.type === "house") {
        appendPlanetsHouseCell(tr, rowData);
        continue;
      }
      if (col.type === "aspected_by") {
        appendPlanetsAspectedByCell(tr, rowData);
        continue;
      }
      const key = col.key;
      const td = document.createElement("td");
      const displayValue = planetsTableCellText(key, rowData);
      const deltaKey = KUNDALI_PLANETS_TABLE_COLUMNS_WITH_STRENGTH_BREAKDOWN[key];
      const formatted = formatTableCellForDisplay(key, displayValue);
      if (deltaKey) {
        appendPlanetsTableCellWithStrengthRules(td, rowData, deltaKey, formatted);
      } else {
        td.textContent = formatted;
      }
      if (key === "strength") {
        const verifyTitle = formatPlanetStrengthVerificationTitle(rowData);
        if (verifyTitle) td.title = verifyTitle;
      }
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
  if (!isNavataraRowColorAllowed(helpful)) return;
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

/** Chart entry for a graha (sitting or aspecting). */
function chartPlanetEntryFromPayloadPlanet(p, planetOrder) {
  const key = normalizeText(p?.name);
  const label = planetShortLabelFromJson(key);
  if (!key || !label) return null;
  return {
    name: key,
    label,
    order: planetOrder.indexOf(key),
    planet_status_color: p.planet_status_color || "",
    planet_status_in_rashi:
      p.planet_status_in_rashi || p.planet_relation_with_rashi_lord,
    strength_percent:
      typeof p.planet_strength === "number"
        ? p.planet_strength
        : p.sign_degree_phase?.strength_percent
  };
}

function sortChartPlanetEntries(entries) {
  return [...(entries || [])].sort((a, b) => {
    const ao = a.order < 0 ? 99 : a.order;
    const bo = b.order < 0 ? 99 : b.order;
    return ao - bo;
  });
}

/** House numbers (1–12) from ``planets[].aspect.houses``. */
function aspectHouseNumbersFromPlanet(planet) {
  const raw = planet?.aspect?.houses;
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    const n = Number(item);
    if (Number.isInteger(n) && n >= 1 && n <= 12) out.push(n);
  }
  return out;
}

/**
 * Grahas whose drishti hits each whole-sign house (from API ``aspect.houses``).
 * Excludes planets already sitting in that house.
 */
function aspectingPlanetsByHouseFromPayload(payload, planetsByHouse) {
  const planetOrder = C.PLANET_DISPLAY_ORDER || [];
  const byHouse = {};
  for (let h = 1; h <= 12; h += 1) byHouse[h] = [];

  for (const p of payload?.planets || []) {
    if (normalizeText(p?.name) === "ascendant") continue;
    const entry = chartPlanetEntryFromPayloadPlanet(p, planetOrder);
    if (!entry) continue;
    for (const house of aspectHouseNumbersFromPlanet(p)) {
      const sitting = planetsByHouse[house] || [];
      if (sitting.some((s) => s.name === entry.name)) continue;
      if (byHouse[house].some((s) => s.name === entry.name)) continue;
      byHouse[house].push(entry);
    }
  }
  for (const house of Object.keys(byHouse)) {
    byHouse[house] = sortChartPlanetEntries(byHouse[house]);
  }
  return byHouse;
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
    const entry = chartPlanetEntryFromPayloadPlanet(p, planetOrder);
    if (!entry) continue;
    (planetsByHouse[house] ||= []).push(entry);
  }
  for (const house of Object.keys(planetsByHouse)) {
    planetsByHouse[house] = sortChartPlanetEntries(planetsByHouse[house]);
  }

  const aspectingByHouse = aspectingPlanetsByHouseFromPayload(payload, planetsByHouse);

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
      aspecting_planets: aspectingByHouse[house] || [],
      is_lagna_house: house === 1
    };
  });

  return {
    layout: "north_indian",
    lagna_label: lagnaLabel,
    lagna_rashi_number: lagnaRashiNumber,
    strength_max: strengthMaxFromPayload(payload),
    cells
  };
}

/**
 * Eye outline scale by planet count. Labels are sized separately so they stay inside
 * (uniform group scale would grow text with the eye and keep overflowing).
 */
function aspectEyeShapeScale(aspectCount, crowded) {
  const n = Math.max(1, Number(aspectCount) || 1);
  const table = {
    1: [0.5, 0.5],
    2: [0.82, 0.64],
    3: [1.42, 0.92],
    4: [1.72, 1.02],
    5: [1.58, 1.22],
    6: [1.78, 1.32]
  };
  let pair = table[n];
  if (!pair) {
    pair = [Math.min(1.95, 1.42 + (n - 3) * 0.12), Math.min(1.4, 0.92 + (n - 3) * 0.08)];
  }
  let [sx, sy] = pair;
  if (crowded) {
    sx *= 0.92;
    sy *= 0.92;
  }
  return { sx, sy };
}

/** Label font inside the eye — slightly smaller as count grows so text fits the lid. */
function aspectEyeLabelFontPx(aspectCount) {
  const n = Math.max(1, Number(aspectCount) || 1);
  if (n <= 1) return 2.85;
  if (n === 2) return 2.65;
  if (n === 3) return 2.35;
  if (n === 4) return 2.15;
  return 2.0;
}

/** Approx half-size of the aspect eye (viewBox units) for placement clearance. */
function estimateAspectEyeHalfSize(aspectCount, crowded) {
  const { sx, sy } = aspectEyeShapeScale(aspectCount, crowded);
  return { halfW: 6.2 * sx, halfH: 5.9 * sy, sx, sy };
}

/**
 * Place the aspect eye clear of sitting planets / rashi labels (toward chart center / free corner).
 */
function aspectClusterOriginForHouse(cell, sittingCount, aspectCount) {
  const cx = cell.cx ?? 50;
  const cy = cell.cy ?? 50;
  const crowded = sittingCount > 0;
  const sitRows = Math.max(1, Math.ceil(sittingCount / 2));

  let x = cx;
  let y = cy;
  switch (cell.house) {
    case 1:
      // Sitting near cy+2.5; park eye deeper toward diamond center.
      x = cx;
      y = crowded ? cy + 10.5 + (sitRows - 1) * 1.4 : cy + 5.5;
      break;
    case 2:
      // Top-leftmost so a multi-planet eye clears the chart diagonal.
      x = crowded ? cx - 14 : cx - 12;
      y = crowded ? cy - 5.5 + (sitRows - 1) * 0.3 : cy - 5.2;
      break;
    case 12:
      // Full up, then right — nudge left from extreme edge.
      x = crowded ? cx + 10 : cx + 8;
      y = crowded ? cy - 5.5 : cy - 5.2;
      break;
    case 3:
      // Keep eye on the outer-left so it does not sit on the chart diagonal.
      x = crowded ? cx - 1.5 : cx - 0.5;
      y = crowded ? cy + 7.5 : cy + 4;
      break;
    case 11:
      // Mirror of 3rd: outer-right, clear of the chart diagonal.
      x = crowded ? cx + 1.5 : cx + 0.5;
      y = crowded ? cy + 6 : cy + 2.8;
      break;
    case 4:
      // Sitting on mid horizontal line; keep eye below-right toward center.
      x = crowded ? cx + 7.5 : cx + 4.5;
      y = crowded ? cy + 6.2 : cy + 3.8;
      break;
    case 10:
      x = crowded ? cx - 7.5 : cx - 4.5;
      y = crowded ? cy + 6.2 : cy + 3.8;
      break;
    case 5:
      // Outer-left (clear of chart line) and further below sitting planets.
      x = crowded ? cx - 1.5 : cx - 0.5;
      y = crowded ? cy + 8.2 + (sitRows - 1) * 1.3 : cy + 4.5;
      break;
    case 9:
      // Outer-right (clear of chart line) and further below sitting planets.
      x = crowded ? cx + 1.5 : cx + 0.5;
      y = crowded ? cy + 8.2 + (sitRows - 1) * 1.3 : cy + 4.5;
      break;
    case 6:
      // Bottom-left: keep eye left of the 6–7 dividing line (toward chart center).
      x = crowded ? cx - 5.5 : cx - 4.5;
      y = crowded ? cy - 6.5 : cy + 3;
      break;
    case 8:
      // Shift right so a multi-planet eye clears the chart line.
      x = crowded ? cx + 5.8 : cx + 4.8;
      y = crowded ? cy - 6.5 : cy + 4;
      break;
    case 7:
      // Sitting above sign; park eye further up toward center.
      x = cx;
      y = crowded ? cy - 11 - (sitRows - 1) * 1.4 : cy - 6;
      break;
    default:
      y = cy + (crowded ? 8 : 5);
      break;
  }

  x = Math.min(96, Math.max(4, x));
  y = Math.min(96, Math.max(4, y));
  return { x, y, crowded };
}

/**
 * One eye per house (with eyebrow). All aspecting planet abbreviations sit inside it.
 * Eye outline grows wider for 3+ planets; label font is sized separately so symbols stay inside.
 */
function appendAspectEyeWithPlanets(parentG, aspectPlanets, originX, originY, options = {}) {
  const list = aspectPlanets || [];
  if (!list.length) return;

  const n = list.length;
  const crowded = Boolean(options.crowded);
  const { sx, sy } = aspectEyeShapeScale(n, crowded);
  const fontPx = aspectEyeLabelFontPx(n);
  // One comma-separated row up to 4; wrap after that.
  const cols = n <= 4 ? n : Math.min(3, n);
  const rows = Math.ceil(n / cols);
  const cellH = Math.max(fontPx + 0.6, rows === 1 ? 2.4 : 2.2);
  const gapY = 0.25;
  const contentH = rows * cellH + Math.max(0, rows - 1) * gapY;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("class", "kundali-chart-aspect-eye");
  g.setAttribute("transform", "translate(" + originX + "," + originY + ")");
  g.setAttribute("role", "img");
  g.setAttribute(
    "aria-label",
    "Aspected by " + list.map((e) => e.label).join(", ")
  );

  // Eye shape only — widen for more planets (does not enlarge the text).
  const eyeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
  eyeG.setAttribute("class", "kundali-chart-aspect-eye__shape");
  eyeG.setAttribute("transform", "scale(" + sx + "," + sy + ")");

  const brow = document.createElementNS("http://www.w3.org/2000/svg", "path");
  brow.setAttribute("d", "M -5.4,-4.05 Q 0,-5.85 5.4,-4.05");
  brow.setAttribute("class", "kundali-chart-aspect-eye__brow");
  eyeG.appendChild(brow);

  const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
  outline.setAttribute(
    "d",
    "M -6.1,0 " +
      "C -4.2,-3.35 -2.1,-3.9 0,-3.9 " +
      "C 2.1,-3.9 4.2,-3.35 6.1,0 " +
      "C 4.2,3.35 2.1,3.9 0,3.9 " +
      "C -2.1,3.9 -4.2,3.35 -6.1,0 Z"
  );
  outline.setAttribute("class", "kundali-chart-aspect-eye__outline");
  eyeG.appendChild(outline);

  if (n === 1) {
    const iris = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    iris.setAttribute("cx", "0");
    iris.setAttribute("cy", "0.15");
    iris.setAttribute("rx", "2.35");
    iris.setAttribute("ry", "2.2");
    iris.setAttribute("class", "kundali-chart-aspect-eye__iris");
    eyeG.appendChild(iris);

    const pupil = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pupil.setAttribute("cx", "0");
    pupil.setAttribute("cy", "0.15");
    pupil.setAttribute("r", "0.85");
    pupil.setAttribute("class", "kundali-chart-aspect-eye__pupil");
    eyeG.appendChild(pupil);
  }
  g.appendChild(eyeG);

  for (let row = 0; row < rows; row += 1) {
    const rowEntries = list.slice(row * cols, row * cols + cols);
    if (!rowEntries.length) continue;
    const y = -contentH / 2 + cellH / 2 + row * (cellH + gapY);
    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textEl.setAttribute("x", "0");
    textEl.setAttribute("y", String(y));
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("dominant-baseline", "central");
    textEl.setAttribute("class", "kundali-chart-aspect-eye__labels");

    rowEntries.forEach((entry, i) => {
      if (i > 0) {
        const comma = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        comma.setAttribute("class", "kundali-chart-aspect-eye__comma");
        comma.setAttribute("style", "font-size:" + fontPx + "px");
        comma.textContent = ",";
        textEl.appendChild(comma);
      }
      const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      applyPlanetChartColor(tspan, entry);
      tspan.classList.add("kundali-chart-aspect-eye__label");
      tspan.style.fontSize = fontPx + "px";
      applyPlanetStrengthStyle(tspan, entry.strength_percent, options.strengthMax);
      tspan.textContent = entry.label;
      textEl.appendChild(tspan);
    });
    g.appendChild(textEl);
  }

  parentG.appendChild(g);
}

function appendHouseAspectEyes(houseGroup, cell, planetOpts) {
  const aspects = cell.aspecting_planets || [];
  if (!aspects.length) return;
  const sittingCount = (cell.planets || []).length;
  const origin = aspectClusterOriginForHouse(cell, sittingCount, aspects.length);
  appendAspectEyeWithPlanets(houseGroup, aspects, origin.x, origin.y, {
    ...planetOpts,
    crowded: Boolean(origin.crowded)
  });
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

  const strengthMax = chartData.strength_max;
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

    // Draw aspect eye first (behind), then sitting planets on top.
    appendHouseAspectEyes(g, cell, planetOpts);

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

function kundaliElementId(idPrefix, base) {
  return idPrefix ? `${idPrefix}-${base}` : base;
}

/** DOM selectors for the standard kundali view (summary + chart + planets). */
function buildKundaliViewTargets(options = {}) {
  const idPrefix = String(options.idPrefix || "").trim();
  const dash = idPrefix ? `${idPrefix}-` : "";
  return {
    summaryTable: `#${dash}summary-table tbody`,
    chartHost: kundaliElementId(idPrefix, "kundali-chart"),
    chartHeading: kundaliElementId(idPrefix, "kundali-chart-heading"),
    planetsTable: `#${dash}planets-table tbody`,
    housePlanetsTiles: kundaliElementId(idPrefix, "house-planets-tiles"),
    skipShellUpdates: Boolean(options.skipShellUpdates)
  };
}

function createKundaliSummaryTableElement(idPrefix) {
  const table = document.createElement("table");
  table.id = kundaliElementId(idPrefix, "summary-table");
  table.className = "navatara-data-table kundali-table";
  table.appendChild(document.createElement("tbody"));
  return table;
}

function createKundaliPlanetsTableElement(idPrefix) {
  const table = document.createElement("table");
  table.id = kundaliElementId(idPrefix, "planets-table");
  table.className = "navatara-data-table kundali-table";
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const col of KUNDALI_PLANETS_TABLE_COLUMNS) {
    headerRow.appendChild(createPlanetsTableHeaderCell(col.header, col.qaKey));
  }
  thead.appendChild(headerRow);
  table.append(thead, document.createElement("tbody"));
  return table;
}

/**
 * Standard kundali panel: Summary (table + chart) and Planets table — same as kundali.html.
 * Use on auspicious and other pages that drill down into a birth chart.
 */
function createStandardKundaliPanelElement(options = {}) {
  const idPrefix = String(options.idPrefix || "slot").trim() || "slot";
  const panel = document.createElement("div");
  if (options.wrapperId) panel.id = options.wrapperId;
  if (options.wrapperClass) panel.className = options.wrapperClass;
  if (options.hidden) panel.hidden = true;

  if (options.headingText) {
    const title = document.createElement("h2");
    title.className = "result-heading";
    if (options.headingId) title.id = options.headingId;
    title.textContent = options.headingText;
    panel.appendChild(title);
  }

  const summaryRow = document.createElement("div");
  summaryRow.className = "summary-chart-row";

  const summaryWrap = document.createElement("div");
  summaryWrap.className = "summary-chart-row__summary table-wrap";
  summaryWrap.appendChild(Object.assign(document.createElement("h3"), {
    className: "result-heading kundali-chart-heading",
    textContent: "Summary"
  }));
  const summaryBodyWrap = document.createElement("div");
  summaryBodyWrap.className = "summary-chart-row__summary-body";
  summaryBodyWrap.appendChild(createKundaliSummaryTableElement(idPrefix));
  summaryWrap.appendChild(summaryBodyWrap);

  const chartWrap = document.createElement("div");
  chartWrap.className = "summary-chart-row__chart";
  chartWrap.appendChild(Object.assign(document.createElement("h3"), {
    id: kundaliElementId(idPrefix, "kundali-chart-heading"),
    className: "result-heading kundali-chart-heading",
    textContent: "Birth Chart"
  }));
  const chartHost = document.createElement("div");
  chartHost.id = kundaliElementId(idPrefix, "kundali-chart");
  chartHost.className = "kundali-chart-host";
  chartWrap.appendChild(chartHost);

  summaryRow.append(summaryWrap, chartWrap);
  panel.appendChild(summaryRow);

  const planetsSection = document.createElement("section");
  planetsSection.className = "planets-status-section planets-status-section--grid";
  planetsSection.setAttribute("data-planets-view", KUNDALI_PLANETS_VIEW_GRID);
  planetsSection.setAttribute("aria-label", KUNDALI_PLANETS_TABLE_HEADING);

  const toolbar = document.createElement("div");
  toolbar.className = "planets-status-toolbar";
  toolbar.appendChild(Object.assign(document.createElement("h2"), {
    className: "result-heading",
    textContent: KUNDALI_PLANETS_TABLE_HEADING
  }));
  toolbar.appendChild(createPlanetsViewSwitchElement(idPrefix));
  planetsSection.appendChild(toolbar);

  const houseTiles = document.createElement("div");
  houseTiles.id = kundaliElementId(idPrefix, "house-planets-tiles");
  houseTiles.className = "house-planets-tiles";
  houseTiles.setAttribute("role", "group");
  houseTiles.setAttribute("aria-label", "Birth time planets by house");
  houseTiles.hidden = true;
  planetsSection.appendChild(houseTiles);

  const planetsWrap = document.createElement("div");
  planetsWrap.className = "table-wrap planets-table-wrap";
  planetsWrap.hidden = true;
  planetsWrap.appendChild(createKundaliPlanetsTableElement(idPrefix));
  planetsSection.appendChild(planetsWrap);

  panel.appendChild(planetsSection);
  return panel;
}

/** Format ``Birth Chart : TIME  DOB  city`` from kundali API payload. */
function formatBirthChartHeading(payload) {
  const iso = String(payload?.datetime_local_iso || "").trim();
  let timePart = "";
  let dobPart = "";
  if (iso) {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (m) {
      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];
      const monthName = months[Number(m[2]) - 1] || m[2];
      dobPart = `${Number(m[3])} ${monthName} ${m[1]}`;
      timePart = `${m[4]}:${m[5]}`;
    }
  }
  const place =
    payload?.place_resolved?.name ||
    payload?.kundali_summary?.resolved_place ||
    payload?.place_query ||
    "";
  const cityPart = String(place).split(",")[0].trim();
  const details = [timePart, dobPart, cityPart].filter(Boolean).join("  ");
  return details ? `Birth Chart : ${details}` : "Birth Chart";
}

function updateBirthChartHeading(payload, chartHeadingId) {
  const el = document.getElementById(chartHeadingId || "kundali-chart-heading");
  if (!el) return;
  el.textContent = formatBirthChartHeading(payload);
}

/** Fill summary table from API ``summary_table`` rows (built in kundali.py). */
function renderSummaryTableFromApiRows(summaryBody, summaryRows) {
  if (!summaryBody) return;
  summaryBody.innerHTML = "";
  for (const row of summaryRows || []) {
    summaryBody.appendChild(createSummaryLabelValueRow(row.label, row.value));
  }
}

/** Fill summary, chart, planets (and optional nakshatra when requested) from /api/kundali JSON. */
function renderKundaliResponseIntoPage(kundaliPayload, targets = {}) {
  const viewTargets = targets.summaryTable ? targets : buildKundaliViewTargets(targets);
  const summaryBody = document.querySelector(viewTargets.summaryTable || "#summary-table tbody");
  const planetsBody = document.querySelector(viewTargets.planetsTable || "#planets-table tbody");
  const chartHostId = viewTargets.chartHost || "kundali-chart";
  const chartHostEl = document.getElementById(chartHostId);

  renderSummaryTableFromApiRows(summaryBody, kundaliPayload.summary_table);
  updateBirthChartHeading(kundaliPayload, viewTargets.chartHeading || "kundali-chart-heading");
  if (chartHostEl) {
    renderKundaliChart(buildNorthIndianChartFromPayload(kundaliPayload), chartHostId);
  }
  const planetsRows = kundaliPayload.planets_table || [];
  renderPlanetsTableWithColors(planetsBody, planetsRows);
  const houseTilesEl = viewTargets.housePlanetsTiles
    ? document.getElementById(viewTargets.housePlanetsTiles)
    : document.getElementById("house-planets-tiles");
  renderHousePlanetsTiles(houseTilesEl, planetsRows, {
    descriptions: kundaliPayload.house_grid_descriptions,
    divisionalCharts: kundaliPayload.divisional_charts,
    strengthMax:
      typeof kundaliPayload.strength_max === "number" ? kundaliPayload.strength_max : undefined
  });
  applyKundaliPlanetsView(houseTilesEl || planetsBody);

  if (viewTargets.nakshatraTable) {
    const nakshatraBody = document.querySelector(viewTargets.nakshatraTable);
    if (nakshatraBody) {
      renderNakshatraTableWithColors(nakshatraBody, kundaliPayload.nakshatras || []);
    }
  }

  if (!viewTargets.skipShellUpdates) {
    renderDivisionalChartsFromPayload(kundaliPayload);
    renderCurrentDashaFromPayload(kundaliPayload);
    renderKundaliYogasFromPayload(kundaliPayload);
    renderKundaliDoshasFromPayload(kundaliPayload);
    if (resultsEl) resultsEl.hidden = false;
    showStatusMessage(C.KUNDALI_READY_STATUS_MESSAGE);
  }
}

/** Collapse divisional charts expand panel (keeps last-rendered SVGs). */
function collapseDivisionalChartsPanel() {
  const panel = document.getElementById("divisional-charts-panel");
  const toggle = document.getElementById("divisional-charts-toggle");
  if (panel) panel.hidden = true;
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

const VIMSHOTTARI_TOTAL_YEARS = 120;

function parseBirthDateFromKundaliPayload(payload) {
  const iso = String(payload?.datetime_local_iso || "").trim();
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const datePart = String(payload?.date || "").trim();
  const timePart = String(payload?.time || "00:00:00").trim() || "00:00:00";
  if (!datePart) return null;
  const parsed = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function ageYearsBetween(birthDate, asOfDate = new Date()) {
  if (!birthDate || Number.isNaN(birthDate.getTime())) return null;
  const ms = asOfDate.getTime() - birthDate.getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms / (365.2425 * 24 * 60 * 60 * 1000);
}

function dateFromBirthAgeYears(birthDate, ageYears) {
  if (!birthDate || !Number.isFinite(ageYears)) return null;
  return new Date(birthDate.getTime() + ageYears * 365.2425 * 24 * 60 * 60 * 1000);
}

function formatDashaCalendarDate(date) {
  if (!date || Number.isNaN(date.getTime())) return "—";
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function dashaMonthShort(date) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return months[date.getMonth()];
}

function formatDashaYearRange(fromDate, toDate) {
  if (!fromDate || !toDate || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return "";
  }
  return `${fromDate.getFullYear()} – ${toDate.getFullYear()}`;
}

function formatDashaMonthYearRange(fromDate, toDate) {
  if (!fromDate || !toDate || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return "";
  }
  return `${dashaMonthShort(fromDate)} ${fromDate.getFullYear()} – ${dashaMonthShort(toDate)} ${toDate.getFullYear()}`;
}

function formatDashaDayMonthYearRange(fromDate, toDate) {
  if (!fromDate || !toDate || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return "";
  }
  const from = `${pad2(fromDate.getDate())} ${dashaMonthShort(fromDate)}`;
  const to = `${pad2(toDate.getDate())} ${dashaMonthShort(toDate)}`;
  if (fromDate.getFullYear() === toDate.getFullYear()) {
    return `${from} – ${to} ${toDate.getFullYear()}`;
  }
  return `${from} ${fromDate.getFullYear()} – ${to} ${toDate.getFullYear()}`;
}

function dashaSpanProgress(ageYears, fromYears, toYears) {
  if (!Number.isFinite(ageYears) || !Number.isFinite(fromYears) || !Number.isFinite(toYears)) {
    return 0;
  }
  const span = toYears - fromYears;
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (ageYears - fromYears) / span));
}

function formatDashaEta(days) {
  if (!Number.isFinite(days)) return "";
  if (days <= 0) return "today";
  if (days === 1) return "in 1 day";
  return `in ${days} days`;
}

function dashaChangeLevel(current, next) {
  if (!current || !next) return null;
  if (current.mahadashaKey !== next.mahadashaKey) {
    return {
      level: "Mahadasha",
      key: next.mahadashaKey,
      name: next.mahadashaName,
      range: next.mahadashaRange
    };
  }
  if (current.antardashaKey !== next.antardashaKey) {
    return {
      level: "Antardasha",
      key: next.antardashaKey,
      name: next.antardashaName,
      range: next.antardashaRange
    };
  }
  return {
    level: "Pratyantar dasha",
    key: next.pratyantardashaKey,
    name: next.pratyantardashaName,
    range: next.pratyantardashaRange
  };
}

function formatDashaPlanetWithRange(planetName, rangeText) {
  const name = String(planetName || "").trim() || "—";
  const range = String(rangeText || "").trim();
  return range ? `${name} (${range})` : name;
}

function vimshottariSequence() {
  const order = C.VIMSHOTTARI_PLANET_ORDER || [];
  return order.map((name) => normalizeText(name)).filter(Boolean);
}

function planetMahadashaYearsMap(planets) {
  const out = {};
  for (const planet of planets || []) {
    if (!planet || typeof planet !== "object") continue;
    const key = normalizeText(planet.name);
    if (!key || key === "ascendant") continue;
    const years = Number(planet.mahadasha_years);
    if (Number.isFinite(years) && years > 0) out[key] = years;
  }
  return out;
}

function findMahadashaPeriodAtAge(planets, ageYears) {
  let current = null;
  for (const planet of planets || []) {
    if (!planet || typeof planet !== "object") continue;
    const key = normalizeText(planet.name);
    if (!key || key === "ascendant") continue;
    const age = planet.age && typeof planet.age === "object" ? planet.age : null;
    if (!age) continue;
    const fromYears = Number(age.from_years);
    const toYears = Number(age.to_years);
    if (!Number.isFinite(fromYears) || !Number.isFinite(toYears)) continue;
    if (ageYears < fromYears || ageYears >= toYears) continue;
    current = {
      planet: key,
      fromYears,
      toYears,
      mahadashaYears: Number(planet.mahadasha_years) || toYears - fromYears
    };
    break;
  }
  return current;
}

function listMahadashaPeriods(planets) {
  const periods = [];
  for (const planet of planets || []) {
    if (!planet || typeof planet !== "object") continue;
    const key = normalizeText(planet.name);
    if (!key || key === "ascendant") continue;
    const age = planet.age && typeof planet.age === "object" ? planet.age : null;
    if (!age) continue;
    const fromYears = Number(age.from_years);
    const toYears = Number(age.to_years);
    if (!Number.isFinite(fromYears) || !Number.isFinite(toYears)) continue;
    periods.push({
      planet: key,
      fromYears,
      toYears,
      mahadashaYears: Number(planet.mahadasha_years) || toYears - fromYears
    });
  }
  periods.sort((a, b) => a.fromYears - b.fromYears);
  return periods;
}

function findNextMahadashaPeriod(planets, currentMahadasha) {
  if (!currentMahadasha) return null;
  const periods = listMahadashaPeriods(planets);
  const currentIdx = periods.findIndex(
    (period) =>
      period.planet === currentMahadasha.planet &&
      Math.abs(period.fromYears - currentMahadasha.fromYears) < 1e-6
  );
  if (currentIdx < 0 || currentIdx + 1 >= periods.length) return null;
  return periods[currentIdx + 1];
}

function buildSubPeriodAtOffset(options) {
  const {
    startLord,
    parentDurationYears,
    ageOffsetYears,
    durations,
    sequence
  } = options;
  if (!startLord || !sequence.length || !(parentDurationYears > 0)) return null;
  const startIdx = sequence.indexOf(startLord);
  if (startIdx < 0) return null;

  let cursor = 0;
  for (let i = 0; i < sequence.length; i += 1) {
    const lord = sequence[(startIdx + i) % sequence.length];
    const lordYears = Number(durations[lord] || 0);
    if (!(lordYears > 0)) continue;
    const duration = (lordYears / VIMSHOTTARI_TOTAL_YEARS) * parentDurationYears;
    const next = cursor + duration;
    if (ageOffsetYears >= cursor && ageOffsetYears < next) {
      return {
        planet: lord,
        fromOffset: cursor,
        toOffset: next,
        durationYears: duration
      };
    }
    cursor = next;
  }
  return null;
}

/**
 * Next dasha moment: advance pratyantardasha first; if that was the last
 * pratyantar in the antardasha, advance antardasha; if that was the last
 * antar in the mahadasha, advance mahadasha.
 */
function findNextDashaMoment(mahadasha, ageYears, planets) {
  if (!mahadasha) return null;
  const sequence = vimshottariSequence();
  const durations = planetMahadashaYearsMap(planets);
  const mdDuration = mahadasha.toYears - mahadasha.fromYears;
  const mdOffset = Math.max(0, ageYears - mahadasha.fromYears);
  const eps = 1e-8;

  const antardasha = buildSubPeriodAtOffset({
    startLord: mahadasha.planet,
    parentDurationYears: mdDuration,
    ageOffsetYears: mdOffset,
    durations,
    sequence
  });

  if (antardasha) {
    const pratyantardasha = buildSubPeriodAtOffset({
      startLord: antardasha.planet,
      parentDurationYears: antardasha.durationYears,
      ageOffsetYears: Math.max(0, mdOffset - antardasha.fromOffset),
      durations,
      sequence
    });
    const adEndAge = mahadasha.fromYears + antardasha.toOffset;

    if (pratyantardasha) {
      const pdEndAge =
        mahadasha.fromYears + antardasha.fromOffset + pratyantardasha.toOffset;
      // Next pratyantardasha within the same antardasha.
      if (pdEndAge < adEndAge - eps) {
        return { ageYears: pdEndAge + eps, mahadasha };
      }
    }

    // Last pratyantardasha (or none) → next antardasha in this mahadasha.
    if (adEndAge < mahadasha.toYears - eps) {
      return { ageYears: adEndAge + eps, mahadasha };
    }
  }

  // Last antardasha → next mahadasha.
  const nextMahadasha = findNextMahadashaPeriod(planets, mahadasha);
  if (!nextMahadasha) return null;
  return { ageYears: nextMahadasha.fromYears, mahadasha: nextMahadasha };
}

function buildDashaLevelSnapshot(birthDate, mahadasha, ageYears, planets) {
  if (!birthDate || !mahadasha) return null;
  const sequence = vimshottariSequence();
  const durations = planetMahadashaYearsMap(planets);
  const mdDuration = mahadasha.toYears - mahadasha.fromYears;
  const mdOffset = Math.max(0, ageYears - mahadasha.fromYears);
  const antardasha = buildSubPeriodAtOffset({
    startLord: mahadasha.planet,
    parentDurationYears: mdDuration,
    ageOffsetYears: mdOffset,
    durations,
    sequence
  });

  let pratyantardasha = null;
  if (antardasha) {
    pratyantardasha = buildSubPeriodAtOffset({
      startLord: antardasha.planet,
      parentDurationYears: antardasha.durationYears,
      ageOffsetYears: Math.max(0, mdOffset - antardasha.fromOffset),
      durations,
      sequence
    });
  }

  const adFromYears = antardasha ? mahadasha.fromYears + antardasha.fromOffset : null;
  const adToYears = antardasha ? mahadasha.fromYears + antardasha.toOffset : null;
  const pdFromYears =
    antardasha && pratyantardasha
      ? mahadasha.fromYears + antardasha.fromOffset + pratyantardasha.fromOffset
      : null;
  const pdToYears =
    antardasha && pratyantardasha
      ? mahadasha.fromYears + antardasha.fromOffset + pratyantardasha.toOffset
      : null;

  const mdFromDate = dateFromBirthAgeYears(birthDate, mahadasha.fromYears);
  const mdToDate = dateFromBirthAgeYears(birthDate, mahadasha.toYears);
  const adFromDate = Number.isFinite(adFromYears)
    ? dateFromBirthAgeYears(birthDate, adFromYears)
    : null;
  const adToDate = Number.isFinite(adToYears)
    ? dateFromBirthAgeYears(birthDate, adToYears)
    : null;
  const pdFromDate = Number.isFinite(pdFromYears)
    ? dateFromBirthAgeYears(birthDate, pdFromYears)
    : null;
  const pdToDate = Number.isFinite(pdToYears)
    ? dateFromBirthAgeYears(birthDate, pdToYears)
    : null;

  return {
    mahadashaName: toTitleCaseWords(mahadasha.planet),
    mahadashaRange: formatDashaYearRange(mdFromDate, mdToDate),
    antardashaName: antardasha ? toTitleCaseWords(antardasha.planet) : "—",
    antardashaRange: antardasha
      ? formatDashaMonthYearRange(adFromDate, adToDate)
      : "",
    pratyantardashaName: pratyantardasha
      ? toTitleCaseWords(pratyantardasha.planet)
      : "—",
    pratyantardashaRange: pratyantardasha
      ? formatDashaDayMonthYearRange(pdFromDate, pdToDate)
      : "",
    mahadashaKey: mahadasha.planet,
    antardashaKey: antardasha?.planet || "",
    pratyantardashaKey: pratyantardasha?.planet || "",
    mahadashaYears: mdDuration,
    antardashaYears: antardasha?.durationYears || 0,
    pratyantardashaYears: pratyantardasha?.durationYears || 0,
    mahadashaProgress: dashaSpanProgress(ageYears, mahadasha.fromYears, mahadasha.toYears),
    antardashaProgress: dashaSpanProgress(ageYears, adFromYears, adToYears),
    pratyantardashaProgress: dashaSpanProgress(ageYears, pdFromYears, pdToYears)
  };
}

function computeCurrentDashaSnapshot(payload, asOfDate = new Date()) {
  const birthDate = parseBirthDateFromKundaliPayload(payload);
  if (!birthDate) return null;
  const ageYears = ageYearsBetween(birthDate, asOfDate);
  if (ageYears == null) return null;

  const planets = Array.isArray(payload?.planets) ? payload.planets : [];
  const mahadasha = findMahadashaPeriodAtAge(planets, ageYears);
  if (!mahadasha) return null;

  const current = buildDashaLevelSnapshot(birthDate, mahadasha, ageYears, planets);
  if (!current) return null;

  const nextMoment = findNextDashaMoment(mahadasha, ageYears, planets);
  const next = nextMoment
    ? buildDashaLevelSnapshot(
        birthDate,
        nextMoment.mahadasha,
        nextMoment.ageYears,
        planets
      )
    : null;

  const nextChangeDate = nextMoment
    ? dateFromBirthAgeYears(birthDate, nextMoment.ageYears)
    : null;
  const dayMs = 24 * 60 * 60 * 1000;
  const daysUntilNext =
    nextChangeDate && !Number.isNaN(nextChangeDate.getTime())
      ? Math.ceil((nextChangeDate.getTime() - asOfDate.getTime()) / dayMs)
      : null;

  return { current, next, asOfDate, nextChangeDate, daysUntilNext };
}

function dashaPlanetTableRow(payload, planetKey) {
  const key = normalizeText(planetKey);
  if (!key) return null;
  return (
    (payload?.planets_table || []).find((row) => normalizeText(row?.planet) === key) ||
    null
  );
}

/**
 * Same tint kind as Mahadasha on Age (``cell_styles.dasha_age``).
 * Untinted / black → cream (no green/red).
 */
function dashaPlanetColorKind(payload, planetKey) {
  const row = dashaPlanetTableRow(payload, planetKey);
  if (!row) return "";
  const kind = String(
    row.cell_styles?.dasha_age || row.cell_styles?.strength || ""
  )
    .trim()
    .toLowerCase();
  if (!kind || kind === "neutral" || kind === "black") return "";
  return kind;
}

function dashaFillClass(kind) {
  return kind
    ? `dasha-dial__fill dasha-dial__fill--${kind}`
    : "dasha-dial__fill dasha-dial__fill--cream";
}

function dashaDurationWeight(years) {
  return Math.pow(Math.max(Number(years) || 0, 0.03), 0.38);
}

/** Ring thickness + type scale from Maha / Antar / Pratyantar duration. */
function dashaDurationLayout(snapshot) {
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const outer = 208;
  const discMin = 78;
  const gap = 4;
  const budget = outer - discMin - gap * 2;
  const mw = dashaDurationWeight(snapshot.mahadashaYears);
  const aw = dashaDurationWeight(snapshot.antardashaYears);
  const pw = dashaDurationWeight(snapshot.pratyantardashaYears);
  const sum = mw + aw + pw || 1;
  const fracM = mw / sum;
  const fracA = aw / sum;
  const fracP = pw / sum;
  let maha = fracM * budget;
  let antar = fracA * budget;
  let pd = fracP * budget;
  maha = Math.max(36, maha);
  antar = Math.max(18, antar);
  pd = Math.max(11, pd);
  const total = maha + antar + pd;
  if (total > budget) {
    const scale = budget / total;
    maha *= scale;
    antar *= scale;
    pd *= scale;
  }
  maha = Math.round(maha);
  antar = Math.round(antar);
  pd = Math.round(pd);
  const mahaOuter = outer;
  const mahaInner = mahaOuter - maha;
  const antarOuter = mahaInner - gap;
  const antarInner = antarOuter - antar;
  const pdOuter = antarInner - gap;
  const pdInner = pdOuter - pd;
  const discR = Math.max(70, pdInner - 3);
  const antarMid = (antarOuter + antarInner) / 2;
  return {
    size,
    cx,
    cy,
    maha,
    antar,
    pratyantar: pd,
    mahaOuter,
    mahaInner,
    antarOuter,
    antarInner,
    pdOuter,
    pdInner,
    discR,
    antarLabelTop: ((cy - antarMid) / size) * 100 - 2.2,
    centerInset: ((cy - discR) / size) * 100,
    fonts: {
      mahaTitle: `${(0.92 + fracM * 0.42).toFixed(3)}rem`,
      mahaRange: `${(0.72 + fracM * 0.22).toFixed(3)}rem`,
      antarTitle: `${(0.68 + fracA * 0.38).toFixed(3)}rem`,
      antarRange: `${(0.6 + fracA * 0.22).toFixed(3)}rem`,
      pdLevel: `${(0.66 + fracP * 0.22).toFixed(3)}rem`,
      pdPlanet: `${(0.92 + fracP * 0.55).toFixed(3)}rem`,
      pdRange: `${(0.62 + fracP * 0.22).toFixed(3)}rem`
    }
  };
}

function dashaAnnularRingPath(cx, cy, innerR, outerR) {
  return (
    `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR} ` +
    `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR} Z ` +
    `M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR} ` +
    `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR} Z`
  );
}

function dashaAnnularSectorPath(cx, cy, innerR, outerR, startRad, endRad) {
  const sweep = endRad - startRad;
  if (sweep <= 0) return "";
  if (sweep >= Math.PI * 2 - 1e-6) return dashaAnnularRingPath(cx, cy, innerR, outerR);
  const x0o = cx + outerR * Math.cos(startRad);
  const y0o = cy + outerR * Math.sin(startRad);
  const x1o = cx + outerR * Math.cos(endRad);
  const y1o = cy + outerR * Math.sin(endRad);
  const x0i = cx + innerR * Math.cos(startRad);
  const y0i = cy + innerR * Math.sin(startRad);
  const x1i = cx + innerR * Math.cos(endRad);
  const y1i = cy + innerR * Math.sin(endRad);
  const large = sweep > Math.PI ? 1 : 0;
  return (
    `M ${x0o} ${y0o} A ${outerR} ${outerR} 0 ${large} 1 ${x1o} ${y1o} ` +
    `L ${x1i} ${y1i} A ${innerR} ${innerR} 0 ${large} 0 ${x0i} ${y0i} Z`
  );
}

function appendDashaBand(svg, svgNS, options) {
  const { cx, cy, innerR, outerR, progress, trackClass, progressClass } = options;
  const track = document.createElementNS(svgNS, "path");
  track.setAttribute("d", dashaAnnularRingPath(cx, cy, innerR, outerR));
  track.setAttribute("class", trackClass);
  track.setAttribute("fill-rule", "evenodd");
  svg.appendChild(track);

  const frac = Math.min(1, Math.max(0, Number(progress) || 0));
  if (frac <= 0.004) return;
  const start = -Math.PI / 2;
  const end = start + frac * Math.PI * 2;
  const sector = document.createElementNS(svgNS, "path");
  sector.setAttribute("d", dashaAnnularSectorPath(cx, cy, innerR, outerR, start, end));
  sector.setAttribute("class", progressClass);
  svg.appendChild(sector);
}

function appendDashaStartMark(svg, svgNS, cx, cy, outerR, innerR) {
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", String(cx));
  line.setAttribute("y1", String(cy - outerR));
  line.setAttribute("x2", String(cx));
  line.setAttribute("y2", String(cy - innerR));
  line.setAttribute("class", "dasha-dial__tick");
  svg.appendChild(line);
  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", String(cx));
  dot.setAttribute("cy", String(cy - outerR));
  dot.setAttribute("r", "3.2");
  dot.setAttribute("class", "dasha-dial__tick-dot");
  svg.appendChild(dot);
}

function createDashaDialSvg(snapshot, payload, layout) {
  const svgNS = "http://www.w3.org/2000/svg";
  const { size, cx, cy } = layout;
  const mahaColor = dashaPlanetColorKind(payload, snapshot.mahadashaKey);
  const antarColor = dashaPlanetColorKind(payload, snapshot.antardashaKey);
  const pdColor = dashaPlanetColorKind(payload, snapshot.pratyantardashaKey);

  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
  svg.setAttribute("class", "dasha-dial__svg");
  svg.setAttribute("role", "img");
  svg.setAttribute(
    "aria-label",
    `Mahadasha ${snapshot.mahadashaName}, Antardasha ${snapshot.antardashaName}, Pratyantar ${snapshot.pratyantardashaName}`
  );
  applyPlanetStatusCellColorIntensity(svg);

  const defs = document.createElementNS(svgNS, "defs");
  const filter = document.createElementNS(svgNS, "filter");
  filter.setAttribute("id", "dasha-disc-shadow");
  filter.setAttribute("x", "-25%");
  filter.setAttribute("y", "-25%");
  filter.setAttribute("width", "150%");
  filter.setAttribute("height", "150%");
  const shadow = document.createElementNS(svgNS, "feDropShadow");
  shadow.setAttribute("dx", "0");
  shadow.setAttribute("dy", "3");
  shadow.setAttribute("stdDeviation", "5");
  shadow.setAttribute("flood-color", "#5c4f1a");
  shadow.setAttribute("flood-opacity", "0.14");
  filter.appendChild(shadow);
  defs.appendChild(filter);
  svg.appendChild(defs);

  const rim = document.createElementNS(svgNS, "circle");
  rim.setAttribute("cx", String(cx));
  rim.setAttribute("cy", String(cy));
  rim.setAttribute("r", String(layout.mahaOuter + 6));
  rim.setAttribute("class", "dasha-dial__rim");
  svg.appendChild(rim);

  appendDashaBand(svg, svgNS, {
    cx,
    cy,
    innerR: layout.mahaInner,
    outerR: layout.mahaOuter,
    progress: snapshot.mahadashaProgress,
    trackClass: "dasha-dial__track",
    progressClass: dashaFillClass(mahaColor)
  });
  appendDashaBand(svg, svgNS, {
    cx,
    cy,
    innerR: layout.antarInner,
    outerR: layout.antarOuter,
    progress: snapshot.antardashaProgress,
    trackClass: "dasha-dial__track",
    progressClass: dashaFillClass(antarColor)
  });
  appendDashaBand(svg, svgNS, {
    cx,
    cy,
    innerR: layout.pdInner,
    outerR: layout.pdOuter,
    progress: snapshot.pratyantardashaProgress,
    trackClass: "dasha-dial__track",
    progressClass: dashaFillClass(pdColor)
  });
  appendDashaStartMark(svg, svgNS, cx, cy, layout.mahaOuter, layout.pdInner);

  const disc = document.createElementNS(svgNS, "circle");
  disc.setAttribute("cx", String(cx));
  disc.setAttribute("cy", String(cy));
  disc.setAttribute("r", String(layout.discR));
  disc.setAttribute("class", "dasha-dial__disc");
  disc.setAttribute("filter", "url(#dasha-disc-shadow)");
  svg.appendChild(disc);
  return svg;
}

function appendDashaRingLabel(host, extraClass, title, range, styleVars) {
  const label = document.createElement("div");
  label.className = extraClass;
  if (styleVars) {
    Object.entries(styleVars).forEach(([key, value]) => {
      if (value != null && value !== "") label.style.setProperty(key, String(value));
    });
  }
  const strong = document.createElement("strong");
  strong.textContent = title;
  label.appendChild(strong);
  if (range) {
    const span = document.createElement("span");
    span.textContent = range;
    label.appendChild(span);
  }
  host.appendChild(label);
  return label;
}

function createDashaDial(snapshot, payload) {
  const layout = dashaDurationLayout(snapshot);
  const wrap = document.createElement("div");
  wrap.className = "dasha-dial-wrap";
  wrap.style.setProperty("--dasha-maha-title", layout.fonts.mahaTitle);
  wrap.style.setProperty("--dasha-maha-range", layout.fonts.mahaRange);
  wrap.style.setProperty("--dasha-antar-title", layout.fonts.antarTitle);
  wrap.style.setProperty("--dasha-antar-range", layout.fonts.antarRange);
  wrap.style.setProperty("--dasha-pd-level", layout.fonts.pdLevel);
  wrap.style.setProperty("--dasha-pd-planet", layout.fonts.pdPlanet);
  wrap.style.setProperty("--dasha-pd-range", layout.fonts.pdRange);

  appendDashaRingLabel(
    wrap,
    "dasha-dial__maha-out",
    `Maha · ${snapshot.mahadashaName || "—"}`,
    snapshot.mahadashaRange
  );

  const dial = document.createElement("div");
  dial.className = "dasha-dial";
  dial.appendChild(createDashaDialSvg(snapshot, payload, layout));
  const antarLabel = appendDashaRingLabel(
    dial,
    "dasha-dial__ring-label dasha-dial__ring-label--antar",
    `Antar · ${snapshot.antardashaName || "—"}`,
    snapshot.antardashaRange
  );
  antarLabel.style.top = `${layout.antarLabelTop}%`;

  const center = document.createElement("div");
  center.className = "dasha-dial__center";
  center.style.inset = `${layout.centerInset}%`;

  const level = document.createElement("span");
  level.className = "dasha-dial__level";
  level.textContent = "Pratyantar";
  center.appendChild(level);

  const planet = document.createElement("strong");
  planet.className = "dasha-dial__planet";
  planet.textContent = snapshot.pratyantardashaName || "—";
  center.appendChild(planet);

  if (snapshot.pratyantardashaRange) {
    const rule = document.createElement("span");
    rule.className = "dasha-dial__rule";
    rule.setAttribute("aria-hidden", "true");
    center.appendChild(rule);

    const range = document.createElement("span");
    range.className = "dasha-dial__range";
    range.textContent = snapshot.pratyantardashaRange;
    center.appendChild(range);
  }
  dial.appendChild(center);
  wrap.appendChild(dial);
  return wrap;
}

function createDashaChip(label, name, running, toneClass) {
  const chip = document.createElement("div");
  chip.className = "dasha-chip";

  const mark = document.createElement("span");
  mark.className = toneClass ? `dasha-chip__mark ${toneClass}` : "dasha-chip__mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = String(name || "?").trim().charAt(0).toUpperCase() || "•";
  chip.appendChild(mark);

  const body = document.createElement("div");
  body.className = "dasha-chip__body";

  const title = document.createElement("strong");
  title.className = "dasha-chip__title";
  title.textContent = `${label} ${name || "—"}`;
  body.appendChild(title);

  const status = document.createElement("span");
  status.className = "dasha-chip__status";
  status.textContent = running ? "still running" : "changes next";
  body.appendChild(status);

  chip.appendChild(body);
  return chip;
}

function createDashaNextCard(snapshot, payload) {
  const change = dashaChangeLevel(snapshot.current, snapshot.next);
  if (!change) return null;

  const side = document.createElement("div");
  side.className = "dasha-side";

  const card = document.createElement("div");
  const nextKind = dashaPlanetColorKind(payload, change.key);
  card.className = nextKind ? `dasha-next dasha-next--${nextKind}` : "dasha-next";
  if (nextKind) applyPlanetStatusCellColorIntensity(card);

  const kicker = document.createElement("p");
  kicker.className = "dasha-next__kicker";
  kicker.textContent = "Next change";
  card.appendChild(kicker);

  const planet = document.createElement("p");
  planet.className = "dasha-next__planet";
  planet.textContent = change.name || "—";
  card.appendChild(planet);

  const level = document.createElement("p");
  level.className = "dasha-next__level";
  level.textContent = change.level;
  card.appendChild(level);

  if (change.range) {
    const range = document.createElement("p");
    range.className = "dasha-next__range";
    range.textContent = change.range;
    card.appendChild(range);
  }

  const etaText = formatDashaEta(snapshot.daysUntilNext);
  if (etaText) {
    const eta = document.createElement("p");
    eta.className = "dasha-next__eta";
    eta.textContent = etaText;
    card.appendChild(eta);
  }
  side.appendChild(card);

  const chips = document.createElement("div");
  chips.className = "dasha-chips";
  const mahaRunning = snapshot.current.mahadashaKey === snapshot.next.mahadashaKey;
  const antarRunning = snapshot.current.antardashaKey === snapshot.next.antardashaKey;
  const mahaKind = dashaPlanetColorKind(payload, snapshot.current.mahadashaKey);
  const antarKind = dashaPlanetColorKind(payload, snapshot.current.antardashaKey);
  chips.appendChild(
    createDashaChip(
      "Maha",
      snapshot.current.mahadashaName,
      mahaRunning,
      mahaKind ? `dasha-chip__mark--${mahaKind}` : "dasha-chip__mark--cream"
    )
  );
  chips.appendChild(
    createDashaChip(
      "Antar",
      snapshot.current.antardashaName,
      antarRunning,
      antarKind ? `dasha-chip__mark--${antarKind}` : "dasha-chip__mark--cream"
    )
  );
  side.appendChild(chips);
  return side;
}

const KUNDALI_QA_POPOVER_ID = "kundali-qa-popover";

const kundaliQaPopoverState = {
  el: null,
  openKey: "",
  trigger: null,
  bound: false
};

/** Read ``data.json`` → ``Q&A.<key>`` (question + answer paragraphs). */
function qaEntryFromDatabase(db, qaKey) {
  const key = String(qaKey || "").trim();
  if (!key) return null;
  const qaRoot = db?.["Q&A"];
  if (!qaRoot || typeof qaRoot !== "object") return null;
  const entry = qaRoot[key];
  if (!entry || typeof entry !== "object") return null;
  const question = String(entry.question || "").trim();
  let answerParts = entry.answer;
  if (typeof answerParts === "string") {
    answerParts = answerParts
      .split(/\n\n+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (!Array.isArray(answerParts)) answerParts = [];
  answerParts = answerParts.map((part) => String(part || "").trim()).filter(Boolean);
  if (!question || !answerParts.length) return null;
  return { question, answerParts };
}

function formatKundaliQaAnswerParagraph(text, paragraphIndex, totalParagraphs) {
  const p = document.createElement("p");
  const isColorParagraph =
    paragraphIndex === totalParagraphs - 1 && /\bgreen\b/i.test(text) && /\bred\b/i.test(text);
  if (!isColorParagraph) {
    p.textContent = text;
    return p;
  }
  const frag = document.createDocumentFragment();
  const re = /\b(green|red)\b/gi;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      frag.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const span = document.createElement("span");
    span.className =
      match[1].toLowerCase() === "green" ? "kundali-qa-popover__good" : "kundali-qa-popover__care";
    span.textContent = match[1];
    frag.appendChild(span);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    frag.appendChild(document.createTextNode(text.slice(last)));
  }
  p.appendChild(frag);
  return p;
}

function ensureKundaliQaPopoverElement() {
  if (kundaliQaPopoverState.el) return kundaliQaPopoverState.el;
  const pop = document.createElement("div");
  pop.id = KUNDALI_QA_POPOVER_ID;
  pop.className = "kundali-qa-popover";
  pop.hidden = true;
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-modal", "false");
  const questionEl = document.createElement("p");
  questionEl.className = "kundali-qa-popover__question";
  questionEl.id = `${KUNDALI_QA_POPOVER_ID}-question`;
  const answerEl = document.createElement("div");
  answerEl.className = "kundali-qa-popover__answer";
  answerEl.id = `${KUNDALI_QA_POPOVER_ID}-answer`;
  pop.append(questionEl, answerEl);
  document.body.appendChild(pop);
  kundaliQaPopoverState.el = pop;
  return pop;
}

function positionKundaliQaPopover(trigger) {
  const pop = kundaliQaPopoverState.el;
  if (!pop || !trigger || typeof trigger.getBoundingClientRect !== "function") return;
  pop.hidden = false;
  pop.style.visibility = "hidden";
  pop.style.left = "0";
  pop.style.top = "0";
  const triggerRect = trigger.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  const margin = 8;
  let left = triggerRect.left;
  let top = triggerRect.bottom + margin;
  if (left + popRect.width > window.innerWidth - margin) {
    left = Math.max(margin, window.innerWidth - popRect.width - margin);
  }
  if (top + popRect.height > window.innerHeight - margin) {
    top = Math.max(margin, triggerRect.top - popRect.height - margin);
  }
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
  pop.style.visibility = "";
}

function closeKundaliQaPopover() {
  const pop = kundaliQaPopoverState.el;
  if (!pop || pop.hidden) return;
  pop.hidden = true;
  kundaliQaPopoverState.openKey = "";
  if (kundaliQaPopoverState.trigger) {
    kundaliQaPopoverState.trigger.setAttribute("aria-expanded", "false");
    kundaliQaPopoverState.trigger = null;
  }
}

function renderKundaliQaPopover(db, qaKey) {
  const pop = ensureKundaliQaPopoverElement();
  const questionEl = pop.querySelector(".kundali-qa-popover__question");
  const answerEl = pop.querySelector(".kundali-qa-popover__answer");
  if (!questionEl || !answerEl) return false;

  const entry = qaEntryFromDatabase(db, qaKey);
  if (!entry) {
    closeKundaliQaPopover();
    return false;
  }

  questionEl.textContent = entry.question;
  answerEl.replaceChildren();
  entry.answerParts.forEach((text, index) => {
    answerEl.appendChild(formatKundaliQaAnswerParagraph(text, index, entry.answerParts.length));
  });
  pop.setAttribute("aria-labelledby", questionEl.id);
  return true;
}

function openKundaliQaPopover(qaKey, trigger) {
  const key = String(qaKey || "").trim();
  if (!key) return;

  if (kundaliQaPopoverState.openKey === key && kundaliQaPopoverState.trigger === trigger) {
    closeKundaliQaPopover();
    return;
  }

  ensurePlanetDatabase()
    .then((db) => {
      if (!renderKundaliQaPopover(db, key)) return;
      kundaliQaPopoverState.openKey = key;
      if (kundaliQaPopoverState.trigger && kundaliQaPopoverState.trigger !== trigger) {
        kundaliQaPopoverState.trigger.setAttribute("aria-expanded", "false");
      }
      kundaliQaPopoverState.trigger = trigger || null;
      if (trigger) {
        trigger.setAttribute("aria-expanded", "true");
        const entry = qaEntryFromDatabase(db, key);
        if (entry?.question) {
          trigger.setAttribute("aria-label", entry.question);
          trigger.title = entry.question;
        }
      }
      positionKundaliQaPopover(trigger);
    })
    .catch(() => {});
}

function createKundaliQaInfoButton(qaKey) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "kundali-info-btn";
  btn.dataset.qaKey = String(qaKey || "").trim();
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", KUNDALI_QA_POPOVER_ID);
  btn.title = "More info";
  btn.setAttribute("aria-label", "More info");
  btn.innerHTML = '<span class="kundali-info-btn__glyph" aria-hidden="true">i</span>';
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openKundaliQaPopover(btn.dataset.qaKey, btn);
  });
  return btn;
}

function createPlanetsTableHeaderCell(label, qaKey) {
  const th = document.createElement("th");
  const resolvedKey = qaKey || KUNDALI_PLANETS_HEADER_QA_KEYS[label] || "";
  if (!resolvedKey) {
    th.textContent = label;
    return th;
  }
  const wrap = document.createElement("span");
  wrap.className = "kundali-table-header-with-info";
  wrap.appendChild(document.createTextNode(label));
  wrap.appendChild(createKundaliQaInfoButton(resolvedKey));
  th.appendChild(wrap);
  return th;
}

function enhancePlanetsTableStaticHeaders() {
  const table = document.getElementById("planets-table");
  if (!table) return;
  table.querySelectorAll("thead th").forEach((th) => {
    if (th.querySelector(".kundali-info-btn")) return;
    const label = String(th.textContent || "").trim();
    const qaKey = KUNDALI_PLANETS_HEADER_QA_KEYS[label];
    if (!qaKey) return;
    const fresh = createPlanetsTableHeaderCell(label, qaKey);
    th.replaceWith(fresh);
  });
}

function bindKundaliQaGlobalInteractions() {
  if (kundaliQaPopoverState.bound) return;
  kundaliQaPopoverState.bound = true;

  document.addEventListener("click", (event) => {
    const pop = kundaliQaPopoverState.el;
    if (!pop || pop.hidden) return;
    const trigger = kundaliQaPopoverState.trigger;
    if (pop.contains(event.target) || (trigger && trigger.contains(event.target))) return;
    closeKundaliQaPopover();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const pop = kundaliQaPopoverState.el;
    if (!pop || pop.hidden) return;
    closeKundaliQaPopover();
    kundaliQaPopoverState.trigger?.focus();
  });

  window.addEventListener(
    "resize",
    () => {
      const pop = kundaliQaPopoverState.el;
      if (!pop || pop.hidden || !kundaliQaPopoverState.trigger) return;
      positionKundaliQaPopover(kundaliQaPopoverState.trigger);
    },
    { passive: true }
  );
}

function initKundaliQaFromDatabase(db) {
  bindKundaliQaGlobalInteractions();
  enhancePlanetsTableStaticHeaders();

  const dashaBtn = document.getElementById("planet-active-dasha-info-btn");
  if (dashaBtn && qaEntryFromDatabase(db, "your_dasha")) {
    dashaBtn.hidden = false;
    const entry = qaEntryFromDatabase(db, "your_dasha");
    dashaBtn.setAttribute("aria-label", entry.question);
    dashaBtn.title = entry.question;
    if (!dashaBtn.dataset.qaKey) dashaBtn.dataset.qaKey = "your_dasha";
    if (!dashaBtn.dataset.qaBound) {
      dashaBtn.dataset.qaBound = "1";
      dashaBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openKundaliQaPopover(dashaBtn.dataset.qaKey || "your_dasha", dashaBtn);
      });
    }
  } else if (dashaBtn) {
    dashaBtn.hidden = true;
  }
}

async function ensureKundaliQaUi() {
  bindKundaliQaGlobalInteractions();
  const db = await ensurePlanetDatabase();
  initKundaliQaFromDatabase(db);
  return db;
}

function renderCurrentDashaFromPayload(payload, hosts = {}) {
  const section = hosts.section || document.getElementById("planet-active-dasha-section");
  const summaryHost = hosts.summaryHost || document.getElementById("current-dasha-summary");
  if (!summaryHost) return;

  summaryHost.replaceChildren();
  summaryHost.className = "current-dasha-summary";

  const snapshot = computeCurrentDashaSnapshot(payload);
  if (!snapshot?.current) {
    if (section) section.hidden = true;
    return;
  }

  if (section) section.hidden = false;
  ensureKundaliQaUi().catch(() => {});

  const layout = document.createElement("div");
  layout.className = "dasha-stage";
  layout.appendChild(createDashaDial(snapshot.current, payload));
  const nextCard = createDashaNextCard(snapshot, payload);
  if (nextCard) layout.appendChild(nextCard);
  summaryHost.appendChild(layout);
}

/** Progressive zoom sizes for the chart lightbox (CSS rem). */
const KUNDALI_CHART_ZOOM_SIZES = [22, 32, 44];

let kundaliChartZoomState = {
  overlay: null,
  step: 0,
  payload: null,
  title: "",
  onKeyDown: null
};

function ensureKundaliChartZoomOverlay() {
  if (kundaliChartZoomState.overlay) return kundaliChartZoomState.overlay;

  const overlay = document.createElement("div");
  overlay.id = "kundali-chart-zoom-overlay";
  overlay.className = "kundali-chart-zoom-overlay";
  overlay.hidden = true;
  overlay.innerHTML =
    '<div class="kundali-chart-zoom" role="dialog" aria-modal="true" aria-labelledby="kundali-chart-zoom-title">' +
    '<button type="button" class="kundali-chart-zoom__close" aria-label="Close enlarged chart">×</button>' +
    '<h3 id="kundali-chart-zoom-title" class="kundali-chart-zoom__title"></h3>' +
    '<p class="kundali-chart-zoom__hint">Click the chart to enlarge · Esc to close</p>' +
    '<div class="kundali-chart-zoom__frame">' +
    '<div class="kundali-chart-zoom__host kundali-chart-host"></div>' +
    "</div></div>";
  document.body.appendChild(overlay);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeKundaliChartZoom();
  });
  overlay.querySelector(".kundali-chart-zoom__close")?.addEventListener("click", closeKundaliChartZoom);
  overlay.querySelector(".kundali-chart-zoom__host")?.addEventListener("click", (event) => {
    event.stopPropagation();
    bumpKundaliChartZoomSize();
  });

  kundaliChartZoomState.overlay = overlay;
  return overlay;
}

function applyKundaliChartZoomSize() {
  const overlay = kundaliChartZoomState.overlay;
  if (!overlay) return;
  const frame = overlay.querySelector(".kundali-chart-zoom__frame");
  const hint = overlay.querySelector(".kundali-chart-zoom__hint");
  if (!frame) return;
  const step = kundaliChartZoomState.step % KUNDALI_CHART_ZOOM_SIZES.length;
  const sizeRem = KUNDALI_CHART_ZOOM_SIZES[step];
  frame.style.setProperty("--kundali-chart-zoom-size", `${sizeRem}rem`);
  frame.dataset.zoomStep = String(step);
  if (hint) {
    const next = step + 1 < KUNDALI_CHART_ZOOM_SIZES.length;
    hint.textContent = next
      ? "Click the chart to enlarge further · Esc to close"
      : "Largest size · click again to reset · Esc to close";
  }
}

function bumpKundaliChartZoomSize() {
  kundaliChartZoomState.step =
    (kundaliChartZoomState.step + 1) % KUNDALI_CHART_ZOOM_SIZES.length;
  applyKundaliChartZoomSize();
}

function closeKundaliChartZoom() {
  const overlay = kundaliChartZoomState.overlay;
  if (!overlay || overlay.hidden) return;
  overlay.hidden = true;
  document.body.classList.remove("kundali-chart-zoom-open");
  if (kundaliChartZoomState.onKeyDown) {
    document.removeEventListener("keydown", kundaliChartZoomState.onKeyDown);
    kundaliChartZoomState.onKeyDown = null;
  }
  const host = overlay.querySelector(".kundali-chart-zoom__host");
  if (host) host.innerHTML = "";
  kundaliChartZoomState.payload = null;
  kundaliChartZoomState.title = "";
  kundaliChartZoomState.step = 0;
}

/** Open a readable lightbox for a chart; click chart again to step size up. */
function openKundaliChartZoom(chartPayload, title) {
  if (!chartPayload || !Array.isArray(chartPayload.planets)) return;
  const overlay = ensureKundaliChartZoomOverlay();
  const host = overlay.querySelector(".kundali-chart-zoom__host");
  const titleEl = overlay.querySelector("#kundali-chart-zoom-title");
  if (!host) return;

  kundaliChartZoomState.payload = chartPayload;
  kundaliChartZoomState.title = title || "Chart";
  kundaliChartZoomState.step = 0;
  if (titleEl) titleEl.textContent = kundaliChartZoomState.title;

  renderKundaliChart(buildNorthIndianChartFromPayload(chartPayload), host);
  applyKundaliChartZoomSize();
  overlay.hidden = false;
  document.body.classList.add("kundali-chart-zoom-open");

  if (kundaliChartZoomState.onKeyDown) {
    document.removeEventListener("keydown", kundaliChartZoomState.onKeyDown);
  }
  kundaliChartZoomState.onKeyDown = (event) => {
    if (event.key === "Escape") closeKundaliChartZoom();
  };
  document.addEventListener("keydown", kundaliChartZoomState.onKeyDown);
  overlay.querySelector(".kundali-chart-zoom__close")?.focus();
}

/** Make a rendered chart host open the zoom lightbox on click. */
function bindKundaliChartZoom(host, chartPayload, title) {
  if (!host || !chartPayload || !Array.isArray(chartPayload.planets)) return;
  host.classList.add("kundali-chart-host--zoomable");
  host.tabIndex = 0;
  host.setAttribute("role", "button");
  host.setAttribute("aria-label", `Enlarge ${title || "chart"}`);
  host.title = "Click to enlarge";
  const open = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openKundaliChartZoom(chartPayload, title);
  };
  host.addEventListener("click", open);
  host.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") open(event);
  });
}

/** Render D1/D9/D10/D30/D60 North Indian charts from ``divisional_charts`` JSON. */
function renderDivisionalChartsFromPayload(payload) {
  const grid = document.getElementById("divisional-charts-grid");
  const section = document.getElementById("divisional-charts-section");
  if (!grid) return;

  collapseDivisionalChartsPanel();
  grid.innerHTML = "";

  const charts = Array.isArray(payload?.divisional_charts) ? payload.divisional_charts : [];
  const divisionalToggle = document.getElementById("divisional-charts-toggle");
  if (divisionalToggle) divisionalToggle.hidden = charts.length === 0;
  if (section) {
    section.dataset.hasCharts = charts.length ? "1" : "0";
    const view = normalizeKundaliPlanetsViewMode(kundaliPlanetsViewMode);
    // Table view: strip under planets table. Grid view: charts open from house panels.
    section.hidden = charts.length === 0 || view !== KUNDALI_PLANETS_VIEW_FULL;
  }
  if (!charts.length) return;

  const strengthMax =
    typeof payload?.strength_max === "number"
      ? payload.strength_max
      : strengthMaxFromPayload(payload);

  for (const chart of charts) {
    if (!chart || !Array.isArray(chart.planets)) continue;
    const key = String(chart.key || "Dx").toLowerCase();
    const hostId = `divisional-chart-${key}`;

    const card = document.createElement("article");
    card.className = "divisional-chart-card";
    card.dataset.chartKey = chart.key || "";

    const heading = document.createElement("h3");
    heading.className = "result-heading kundali-chart-heading divisional-chart-card__title";
    heading.textContent = chart.title || chart.key || "Chart";
    card.appendChild(heading);

    if (chart.focus) {
      const focus = document.createElement("p");
      focus.className = "divisional-chart-card__focus";
      focus.textContent = chart.focus;
      card.appendChild(focus);
    }

    const host = document.createElement("div");
    host.id = hostId;
    host.className = "kundali-chart-host divisional-chart-card__host";
    card.appendChild(host);

    grid.appendChild(card);

    const chartPayload = {
      planets: chart.planets,
      strength_max: typeof chart.strength_max === "number" ? chart.strength_max : strengthMax
    };
    renderKundaliChart(buildNorthIndianChartFromPayload(chartPayload), host);
    bindKundaliChartZoom(host, chartPayload, chart.title || chart.key || "Chart");
  }
}

/**
 * Render yoga/dosha tiles from a kundali match block
 * (same click-to-expand pattern as Remedy navatara).
 */
function canViewLockedPremiumContent() {
  if (typeof SaptarishiAuth === "undefined") return false;
  const usage = SaptarishiAuth.getUsage ? SaptarishiAuth.getUsage() : null;
  if (usage && usage.remedy_unlocked === true) return true;
  if (usage && usage.remedy_unlocked === false) return false;
  if (typeof SaptarishiAuth.isPremiumActive === "function") {
    return Boolean(SaptarishiAuth.isPremiumActive());
  }
  return false;
}

function openUnlockWalletFromBlur() {
  if (typeof SaptarishiAuth !== "undefined" && SaptarishiAuth.openWalletFlow) {
    SaptarishiAuth.openWalletFlow({
      required: true,
      message: "Add money to your wallet to unlock full details."
    });
    return;
  }
  if (globalThis.SaptarishiWalletModal && SaptarishiWalletModal.open) {
    SaptarishiWalletModal.open();
  }
}

function blurLockedTextElement(el) {
  if (!el) return;
  const value = String(el.textContent || "").trim();
  if (!value || value === "—") return;
  el.textContent = "";
  const span = document.createElement("span");
  span.className = "remedy-text--blurred";
  span.textContent = value;
  span.setAttribute("title", "Add money to unlock");
  span.setAttribute("aria-label", "Blurred text. Add money to wallet to unlock.");
  span.setAttribute("role", "button");
  span.setAttribute("tabindex", "0");
  el.appendChild(span);
  el.classList.add("remedy-text-cell--locked");
  if (span.dataset.remedyUnlockBound === "1") return;
  span.dataset.remedyUnlockBound = "1";
  const open = (event) => {
    event.preventDefault();
    event.stopPropagation();
    openUnlockWalletFromBlur();
  };
  span.addEventListener("click", open);
  span.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") open(event);
  });
}

/** Red strength tints on Planet/Houses Status tiles. */
function isAdversePlanetColorKind(kind) {
  const k = String(kind || "").trim().toLowerCase();
  return k === "low" || k === "enemy";
}

function rowHasNegativePlanetStrength(row) {
  if (!row) return false;
  if (typeof row.strength_percent === "number" && row.strength_percent < 0) return true;
  const total = row?.strength_adjustments?.total;
  if (typeof total === "number" && total < 0) return true;
  const pct = strengthPercentFromRow(row);
  return typeof pct === "number" && pct < 0;
}

/** True when a house tile is red or any planet in it has negative strength. */
function housePlanetsTileIsAdverse(houseRows, representativeRow) {
  const planetRows = housePlanetTableRows(houseRows);
  const rows = planetRows.length ? planetRows : [representativeRow].filter(Boolean);
  for (const row of rows) {
    if (isAdversePlanetColorKind(row?.cell_styles?.strength)) return true;
    if (rowHasNegativePlanetStrength(row)) return true;
  }
  return isAdversePlanetColorKind(representativeRow?.cell_styles?.strength);
}

function applyAdverseHouseTileContentLock(btn, panel) {
  if (!btn || canViewLockedPremiumContent()) return;
  btn.classList.add("house-planets-tile-btn--content-locked");
  btn
    .querySelectorAll(".house-planets-tile-btn__for, .house-planets-tile-btn__pct")
    .forEach((el) => blurLockedTextElement(el));
  if (!panel) return;
  panel.classList.add("house-planets-tile-panel--locked");
  panel
    .querySelectorAll(
      ".house-planets-sheet__for, .house-planets-sheet__planets, .house-planets-sheet__pct, .house-planets-sheet__desc, .house-planets-sheet__table tbody td"
    )
    .forEach((el) => blurLockedTextElement(el));
}

function blurMatchTileButtonLabel(btn) {
  if (!btn) return;
  const label = String(btn.textContent || "").trim();
  if (!label) return;
  btn.textContent = "";
  const hold = document.createElement("span");
  hold.className = "remedy-navatara-btn__label";
  hold.textContent = label;
  btn.appendChild(hold);
  blurLockedTextElement(hold);
}

function renderKundaliMatchTilesFromPayload(payload, options) {
  const {
    sectionId,
    headingId,
    summaryId,
    listId,
    blockKey,
    itemsKey,
    headingLabel,
    emptyDetail,
    ariaItemKind,
    buttonClassName,
    isBadItem,
    blurPanelText,
    blurAdverseTiles
  } = options;
  const section = document.getElementById(sectionId);
  const headingEl = document.getElementById(headingId);
  const summaryEl = document.getElementById(summaryId);
  const listEl = document.getElementById(listId);
  if (!section || !listEl) return;

  const block = payload?.[blockKey];
  const items = (Array.isArray(block?.[itemsKey]) ? block[itemsKey] : []).filter(
    (item) => item && item.present
  );
  listEl.innerHTML = "";

  if (!items.length) {
    section.hidden = true;
    if (headingEl) headingEl.textContent = headingLabel;
    if (summaryEl) {
      summaryEl.textContent = "";
      summaryEl.hidden = true;
    }
    return;
  }

  section.hidden = false;
  if (headingEl) headingEl.textContent = `${headingLabel}(${items.length})`;
  if (summaryEl) {
    summaryEl.textContent = "";
    summaryEl.hidden = true;
  }

  let selectedKey = "";
  const contentLocked = !canViewLockedPremiumContent();
  const lockAllPanels = Boolean(blurPanelText) && contentLocked;

  const closeAllPanels = () => {
    listEl.querySelectorAll(".remedy-navatara-panel").forEach((panel) => {
      panel.hidden = true;
    });
    listEl.querySelectorAll(".remedy-navatara-btn").forEach((btn) => {
      btn.classList.remove("remedy-navatara-btn--active");
      btn.setAttribute("aria-pressed", "false");
      btn.setAttribute("aria-expanded", "false");
    });
  };

  const showItemDetail = (item, itemEl) => {
    const panel = itemEl && itemEl.querySelector(".remedy-navatara-panel");
    const btn = itemEl && itemEl.querySelector(".remedy-navatara-btn");
    const itemKey = String(item.key || item.name || "").trim();

    if (selectedKey === itemKey && panel && !panel.hidden) {
      closeAllPanels();
      selectedKey = "";
      return;
    }

    closeAllPanels();
    selectedKey = itemKey;

    if (btn) {
      btn.classList.add("remedy-navatara-btn--active");
      btn.setAttribute("aria-pressed", "true");
      btn.setAttribute("aria-expanded", "true");
    }
    if (panel) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  for (const item of items) {
    const wrap = document.createElement("div");
    wrap.className = "remedy-navatara-item";

    const btn = document.createElement("button");
    btn.type = "button";
    const itemIsBad =
      typeof isBadItem === "function"
        ? Boolean(isBadItem(item))
        : Boolean(buttonClassName && /dosh/i.test(buttonClassName));
    const extraBtnClass = itemIsBad
      ? "remedy-navatara-btn--dosh"
      : buttonClassName;
    btn.className = ["remedy-navatara-btn", extraBtnClass].filter(Boolean).join(" ");
    btn.dataset.matchKey = String(item.key || "");
    btn.textContent = String(item.name || item.key || ariaItemKind || headingLabel);
    btn.setAttribute("aria-pressed", "false");
    btn.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "remedy-navatara-panel kundali-yog-panel";
    panel.hidden = true;

    if (item.desc || item.summary) {
      const desc = document.createElement("p");
      desc.className = "kundali-yog-panel__summary";
      desc.textContent = String(item.desc || item.summary);
      panel.appendChild(desc);
    }

    if (item.rule) {
      const rule = document.createElement("p");
      rule.className = "kundali-yog-panel__summary";
      rule.textContent = String(item.rule);
      panel.appendChild(rule);
    }

    if (item.chart) {
      const chart = document.createElement("p");
      chart.className = "kundali-yog-panel__meta";
      chart.textContent = String(item.chart);
      panel.appendChild(chart);
    }

    if (item.detail) {
      const detail = document.createElement("p");
      detail.className = "kundali-yog-panel__detail";
      detail.textContent = String(item.detail);
      panel.appendChild(detail);
    }

    if (!panel.childNodes.length) {
      const empty = document.createElement("p");
      empty.className = "kundali-yog-panel__detail";
      empty.textContent = emptyDetail || `No extra detail for this ${ariaItemKind || "item"}.`;
      panel.appendChild(empty);
    }

    const lockAdverse =
      Boolean(blurAdverseTiles) && contentLocked && itemIsBad;
    if (lockAllPanels || lockAdverse) {
      panel.classList.add("kundali-yog-panel--locked");
      panel.querySelectorAll("p").forEach((el) => blurLockedTextElement(el));
    }
    if (lockAdverse || (lockAllPanels && itemIsBad)) {
      blurMatchTileButtonLabel(btn);
    }

    btn.addEventListener("click", () => showItemDetail(item, wrap));
    wrap.appendChild(btn);
    wrap.appendChild(panel);
    listEl.appendChild(wrap);
  }
}

/** Render yoga tiles from ``kundali_yog``. */
function renderKundaliYogasFromPayload(payload) {
  renderKundaliMatchTilesFromPayload(payload, {
    sectionId: "kundali-yog-section",
    headingId: "kundali-yog-heading",
    summaryId: "kundali-yog-summary",
    listId: "kundali-yog-list",
    blockKey: "kundali_yog",
    itemsKey: "yogas",
    headingLabel: "Yogas",
    emptyDetail: "No extra detail for this yoga.",
    ariaItemKind: "Yoga",
    isBadItem: (item) => String(item?.nature || "good").toLowerCase() === "bad",
    blurAdverseTiles: true
  });
}

/** Render dosha tiles from ``kundali_dosh`` (same design as yogas; names in red). */
function renderKundaliDoshasFromPayload(payload) {
  renderKundaliMatchTilesFromPayload(payload, {
    sectionId: "kundali-dosh-section",
    headingId: "kundali-dosh-heading",
    summaryId: "kundali-dosh-summary",
    listId: "kundali-dosh-list",
    blockKey: "kundali_dosh",
    itemsKey: "dosh",
    headingLabel: "Doshas",
    emptyDetail: "No extra detail for this dosha.",
    ariaItemKind: "Dosha",
    buttonClassName: "remedy-navatara-btn--dosh",
    blurPanelText: true,
    blurAdverseTiles: true
  });
}

/** Toggle expand/collapse for the divisional charts block. */
function toggleDivisionalChartsPanel() {
  const panel = document.getElementById("divisional-charts-panel");
  const toggle = document.getElementById("divisional-charts-toggle");
  if (!panel || !toggle) return;
  const show = panel.hidden;
  panel.hidden = !show;
  toggle.setAttribute("aria-expanded", show ? "true" : "false");
  if (show) {
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function shouldSaveBirthDetails() {
  if (kundaliMode === "open") return false;
  return !saveBirth || saveBirth.checked;
}

/** Build query string for GET /api/kundali from form fields. */
function buildKundaliApiQueryParams(date, time, place, name, saveBirthDetails) {
  const params = {
    date,
    time,
    place,
    house_system: C.DEFAULT_HOUSE_SYSTEM,
    save: saveBirthDetails === false ? "0" : "1"
  };
  if (name) params.name = name;
  return new URLSearchParams(params);
}

/** Call Flask /api/kundali and return parsed JSON. */
async function fetchKundaliJsonFromApi(date, time, place, name, saveBirthDetails) {
  const params = buildKundaliApiQueryParams(date, time, place, name, saveBirthDetails);
  const path = `${C.API_KUNDALI_PATH}?${params}`;
  if (typeof SaptarishiAuth !== "undefined") {
    if (SaptarishiAuth.fetchKundali) {
      return SaptarishiAuth.fetchKundali(path, date, time, place, name);
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

/** Validate birth form; return error message or null if OK. */
function validateBirthForm(place) {
  if (kundaliMode === "new" && shouldSaveBirthDetails() && birthName && !String(birthName.value || "").trim()) {
    return "Enter a name to save these birth details.";
  }
  if (kundaliMode === "open" && savedKundaliSelect && !savedKundaliSelect.value) {
    return "Select saved birth details.";
  }
  if (!placePreset.value) return "Select a place.";
  if (placePreset.value === C.PLACE_CUSTOM_VALUE && !place) return "Enter a custom place.";
  if (!birthDate.value || !birthTime.value) return "Date and time are required.";
  return null;
}

/** Show/hide custom place input when preset is "Other". */
function syncCustomPlaceFieldVisibility() {
  if (CU && CU.syncCustomPlaceVisibility) {
    CU.syncCustomPlaceVisibility(placePreset, customWrap, placeCustom, C.PLACE_CUSTOM_VALUE);
    return;
  }
  const isCustom = placePreset.value === C.PLACE_CUSTOM_VALUE;
  if (customWrap) customWrap.hidden = !isCustom;
  if (!isCustom && placeCustom) placeCustom.value = "";
}

/** Form submit: fetch kundali JSON and render all tables. */
async function handleBirthFormSubmit(event) {
  event.preventDefault();
  const place = getBirthPlaceFromKundaliForm();
  const name = birthName ? String(birthName.value || "").trim() : "";
  const validationError = validateBirthForm(place);
  if (validationError) {
    showStatusMessage(validationError, true);
    return;
  }

  showKundaliLoadingStatus();
  if (resultsEl) resultsEl.hidden = true;
  const lordSection = document.getElementById("lord-comparison-section");
  if (lordSection) lordSection.hidden = true;
  const singleResults = document.getElementById("kundali-single-results");
  if (singleResults) singleResults.hidden = false;

  try {
    await ensurePlanetDatabase();
    const kundaliPayload = await fetchKundaliJsonFromApi(
      birthDate.value,
      birthTime.value,
      place,
      name,
      shouldSaveBirthDetails()
    );
    renderKundaliResponseIntoPage(kundaliPayload);
    refreshSavedKundaliDropdown();
  } catch (err) {
    const formatted = formatKundaliApiError(err);
    if (typeof SaptarishiAuth !== "undefined" && err.status === 401) {
      SaptarishiAuth.clearSession();
    }
    showStatusMessage(formatted.text, true, formatted.limitReached);
    if (formatted.limitReached && typeof SaptarishiAuth !== "undefined") {
      await SaptarishiAuth.handlePremiumRequired(err);
    }
  }
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

function refreshSavedKundaliDropdown() {
  if (!savedKundaliSelect || typeof SaptarishiAuth === "undefined") return;
  const views = SaptarishiAuth.getBirthViews ? SaptarishiAuth.getBirthViews() : [];
  const previous = savedKundaliSelect.value;
  savedKundaliSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = views.length ? "Select saved name…" : "No saved birth details yet";
  savedKundaliSelect.appendChild(placeholder);
  views.forEach((view) => {
    const key = birthViewSelectKey(view);
    if (!key) return;
    const opt = document.createElement("option");
    opt.value = key;
    const detail = [view.date, view.place].filter(Boolean).join(" · ");
    opt.textContent = detail
      ? `${birthViewOptionLabel(view)} (${detail})`
      : birthViewOptionLabel(view);
    savedKundaliSelect.appendChild(opt);
  });
  if (previous && [...savedKundaliSelect.options].some((o) => o.value === previous)) {
    savedKundaliSelect.value = previous;
  }
}

function applySavedKundaliSelection() {
  if (!savedKundaliSelect || typeof SaptarishiAuth === "undefined") return;
  const views = SaptarishiAuth.getBirthViews ? SaptarishiAuth.getBirthViews() : [];
  const key = String(savedKundaliSelect.value || "").trim();
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

function setKundaliMode(mode) {
  kundaliMode = mode === "open" ? "open" : "new";
  const isOpen = kundaliMode === "open";
  if (tabOpenKundali) {
    tabOpenKundali.classList.toggle("kundali-tabs__item--active", isOpen);
    tabOpenKundali.setAttribute("aria-selected", isOpen ? "true" : "false");
  }
  if (tabNewKundali) {
    tabNewKundali.classList.toggle("kundali-tabs__item--active", !isOpen);
    tabNewKundali.setAttribute("aria-selected", !isOpen ? "true" : "false");
  }
  if (openKundaliWrap) openKundaliWrap.hidden = !isOpen;
  if (birthNameWrap) birthNameWrap.hidden = isOpen;
  if (saveBirthWrap) saveBirthWrap.hidden = isOpen;
  if (saveBirth && !isOpen) saveBirth.checked = true;
  if (isOpen) {
    refreshSavedKundaliDropdown();
    applySavedKundaliSelection();
  }
}

function refreshKundaliSavedViews() {
  refreshSavedKundaliDropdown();
  if (kundaliMode === "open") applySavedKundaliSelection();
  if (window.SaptarishiKundaliCompare?.refreshSavedDropdowns) {
    window.SaptarishiKundaliCompare.refreshSavedDropdowns();
  }
}

if (document.getElementById("birth-form")) {
  if (placePreset) {
    placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
  }
  if (form) {
    form.addEventListener("submit", handleBirthFormSubmit);
    ensureKundaliQaUi().catch(() => {});
  }
  const divisionalToggle = document.getElementById("divisional-charts-toggle");
  if (divisionalToggle) {
    divisionalToggle.addEventListener("click", toggleDivisionalChartsPanel);
  }
  if (tabOpenKundali) {
    tabOpenKundali.addEventListener("click", () => setKundaliMode("open"));
  }
  if (tabNewKundali) {
    tabNewKundali.addEventListener("click", () => setKundaliMode("new"));
  }
  if (savedKundaliSelect) {
    savedKundaliSelect.addEventListener("change", applySavedKundaliSelection);
  }
  setKundaliMode("new");
  refreshKundaliSavedViews();
  globalThis.addEventListener("saptarishi-auth-changed", () => {
    refreshKundaliSavedViews();
  });
}

document.addEventListener("click", (event) => {
  const btn = event.target.closest?.(".planets-view-switch__btn[data-planets-view]");
  if (!btn || !btn.closest(".planets-status-section")) return;
  const mode = btn.getAttribute("data-planets-view");
  if (mode !== KUNDALI_PLANETS_VIEW_GRID && mode !== KUNDALI_PLANETS_VIEW_FULL) return;
  setKundaliPlanetsViewMode(mode, btn);
});

/** Shared kundali view helpers (auspicious page row drill-down). */
window.SaptarishiKundaliView = {
  ensurePlanetDatabase,
  fetchJson: fetchKundaliJsonFromApi,
  renderIntoPage: renderKundaliResponseIntoPage,
  renderSummaryTable: renderSummaryTableFromApiRows,
  buildViewTargets: buildKundaliViewTargets,
  createStandardPanel: createStandardKundaliPanelElement,
  buildNorthIndianChartFromPayload,
  renderKundaliChart,
  renderDivisionalChartsFromPayload,
  computeCurrentDashaSnapshot,
  renderCurrentDashaFromPayload,
  renderKundaliYogasFromPayload,
  renderKundaliDoshasFromPayload,
  renderHousePlanetsTiles,
  applyKundaliPlanetsView,
  bindKundaliChartZoom,
  openKundaliChartZoom,
  closeKundaliChartZoom,
  MAIN_TARGETS: buildKundaliViewTargets(),
  SLOT_TARGETS: buildKundaliViewTargets({ idPrefix: "slot", skipShellUpdates: true }),
  renderNakshatraTableWithColors,
  formatNavataraName,
  normalizeText,
  isLordComparisonToneAllowed,
  isPlanetCellColorAllowedForColumn,
  formatBirthChartHeading
};

window.SaptarishiKundaliPage = {
  showStatus: showStatusMessage,
  showLoading: showKundaliLoadingStatus,
  formatError: formatKundaliApiError,
  getApiOrigin: getFlaskApiOrigin,
  getMainBirthInput() {
    return {
      name: birthName?.value?.trim() || "",
      date: birthDate?.value?.trim() || "",
      time: birthTime?.value?.trim() || "",
      place: getBirthPlaceFromKundaliForm(),
      save: shouldSaveBirthDetails()
    };
  },
  validateMainBirthForm() {
    return validateBirthForm(getBirthPlaceFromKundaliForm());
  },
  refreshSavedViews: refreshKundaliSavedViews
};

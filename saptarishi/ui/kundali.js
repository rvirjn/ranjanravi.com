const C = typeof SAPTARISHI_CONSTANTS !== "undefined" ? SAPTARISHI_CONSTANTS : {
  FLASK_PORT: 8081,
  DEFAULT_HOUSE_SYSTEM: "W",
  API_KUNDALI_PATH: "/api/kundali",
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

const form = document.getElementById("birth-form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const placePreset = document.getElementById("place-preset");
const customWrap = document.getElementById("custom-place-wrap");
const placeCustom = document.getElementById("place-custom");
const birthDate = document.getElementById("birth-date");
const birthTime = document.getElementById("birth-time");

/** Flask API origin (port 8081); file:// pages default to localhost. */
function getFlaskApiOrigin() {
  const u = new URL(window.location.href);
  if (window.location.protocol === "file:") return `http://localhost:${C.FLASK_PORT}`;
  u.port = String(C.FLASK_PORT);
  u.pathname = "";
  u.search = "";
  u.hash = "";
  return u.origin;
}

/** Show loading, success, or error text under the birth form. */
function showStatusMessage(message, isError) {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.classList.toggle("error", Boolean(isError));
}

/** Read place string from preset dropdown or custom text field. */
function getBirthPlaceFromForm() {
  if (!placePreset) return "";
  if (placePreset.value === C.PLACE_CUSTOM_VALUE) return (placeCustom && placeCustom.value.trim()) || "";
  return placePreset.value.trim();
}

/** One label + value row for the summary facts table. */
function createSummaryLabelValueRow(label, value) {
  const tr = document.createElement("tr");
  const th = document.createElement("th");
  th.scope = "row";
  th.textContent = label;
  const td = document.createElement("td");
  td.textContent = value ?? "";
  tr.appendChild(th);
  tr.appendChild(td);
  return tr;
}

/** Normalize text for CSS class / comparison (lowercase, collapsed spaces). */
function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Strength 0–1 from API percent or "25%" string. */
function strengthToOpacity(row) {
  if (typeof row.strength_percent === "number") {
    return Math.min(1, Math.max(0, row.strength_percent / 100));
  }
  const match = String(row.strength || "").match(/(\d+)/);
  return match ? Number(match[1]) / 100 : 0.2;
}

/** CSS classes for a planets table row from status in rashi (own uses friend green). */
function planetRowClasses(statusInRashi) {
  const status = normalizeText(statusInRashi);
  const classes = ["planet-row"];
  if (status === "own" || status === "friend") {
    classes.push("planet-row--friend");
  } else if (status === "enemy" || status === "neutral") {
    classes.push(`planet-row--${status}`);
  }
  return classes.join(" ");
}

/** Chart planet color class (same status rules as planets table). */
function planetChartStatusClass(statusInRashi) {
  const status = normalizeText(statusInRashi);
  if (status === "own" || status === "friend") return "kundali-chart-planet--friend";
  if (status === "enemy") return "kundali-chart-planet--enemy";
  return "kundali-chart-planet--neutral";
}

function planetStrengthFromEntry(entry) {
  if (typeof entry?.strength_percent === "number") {
    return Math.min(1, Math.max(0, entry.strength_percent / 100));
  }
  return strengthToOpacity(entry);
}

function stylePlanetTspan(tspan, entry) {
  tspan.setAttribute("class", `kundali-chart-planet ${planetChartStatusClass(entry.status)}`);
  tspan.style.setProperty("--planet-strength", String(planetStrengthFromEntry(entry)));
}

/** Per-planet colored tspans; x/dy only on line/row starts (same layout as plain text rows). */
function appendColoredPlanetsToText(textEl, planets, anchorX, options = {}) {
  const { rowMode = false, firstDy = "0", rowDy = "1.05em", gap = " ", leadGap = false } = options;
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
        stylePlanetTspan(tspan, entry);
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
    stylePlanetTspan(tspan, entry);
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

/** Planets table: row color by status in rashi, intensity by strength. */
function renderPlanetsTableWithColors(tbody, rows) {
  if (!tbody) return;
  tbody.innerHTML = "";
  const columnKeys = [
    "house",
    "planet",
    "rashi",
    "strength",
    "planet_status_in_rashi",
    "retrograde"
  ];
  for (const rowData of rows || []) {
    const tr = document.createElement("tr");
    tr.className = planetRowClasses(rowData.planet_status_in_rashi);
    tr.style.setProperty("--planet-strength", String(strengthToOpacity(rowData)));
    for (const key of columnKeys) {
      const td = document.createElement("td");
      const cell = rowData[key];
      td.textContent = cell != null ? String(cell) : "";
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
}

/** Navatara table: helpful yes first; within each group, strongest tara shading first. */
function sortNavataraRowsForDisplay(rows) {
  const helpful = [];
  const notHelpful = [];
  for (const row of rows || []) {
    if (normalizeText(row.auspicious) === "yes") helpful.push(row);
    else notHelpful.push(row);
  }
  const byIntensity = (a, b) =>
    navataraIntensity(b.navatara, true) - navataraIntensity(a.navatara, true) ||
    normalizeText(a.navatara).localeCompare(normalizeText(b.navatara));
  const byHarm = (a, b) =>
    navataraIntensity(b.navatara, false) - navataraIntensity(a.navatara, false);
  helpful.sort(byIntensity);
  notHelpful.sort(byHarm);
  return [...helpful, ...notHelpful];
}

function renderNavataraTableWithColors(tbody, rows) {
  if (!tbody) return;
  tbody.innerHTML = "";
  const columnKeys = [
    "about",
    "auspicious",
    "navatara",
    "nakshatra",
    "ruling_planet",
    "deity",
    "tree",
    "lucky_colors"
  ];
  const sorted = sortNavataraRowsForDisplay(rows);
  let lastNavatara = null;
  for (const rowData of sorted) {
    const tr = document.createElement("tr");
    const helpful = normalizeText(rowData.auspicious) === "yes";
    tr.className = helpful ? "navatara-row--helpful" : "navatara-row--harmful";
    const navataraKey = normalizeText(rowData.navatara);
    tr.style.setProperty("--navatara-intensity", String(navataraIntensity(rowData.navatara, helpful)));
    if (navataraKey) {
      tr.classList.add(`navatara-row--${navataraKey.replace(/[^a-z0-9]+/g, "-")}`);
    }
    if (lastNavatara !== null && lastNavatara !== navataraKey) {
      tr.classList.add("navatara-row--group-start");
    }
    lastNavatara = navataraKey;
    for (const key of columnKeys) {
      const td = document.createElement("td");
      const cell = rowData[key];
      td.textContent = cell != null ? String(cell) : "";
      tr.appendChild(td);
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

/** Build North Indian chart from ``planets`` + ``houses_whole_sign`` (same fields as output/*.json). */
function buildNorthIndianChartFromPayload(payload) {
  const asc = payload?.ascendant || {};
  const lagnaRi = asc.rashi_index;
  const lagnaRashiNumber =
    typeof lagnaRi === "number" && lagnaRi >= 0 && lagnaRi < 12 ? lagnaRi + 1 : null;
  const lagnaLabel = lagnaRashiNumber != null ? String(lagnaRashiNumber) : "";

  const housesByNo = {};
  for (const h of payload?.houses_whole_sign || []) {
    if (h && typeof h.house === "number") housesByNo[h.house] = h;
  }

  const planetOrder = C.PLANET_DISPLAY_ORDER || [];
  const planetsByHouse = {};
  for (const p of payload?.planets || []) {
    const house = p.whole_sign_house;
    if (typeof house !== "number") continue;
    const label = planetShortLabelFromJson(p.name);
    if (!label) continue;
    const entry = {
      label,
      order: planetOrder.indexOf(String(p.name || "").toLowerCase()),
      status: p.planet_relation_with_rashi_lord,
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
    cells
  };
}

/** Traditional North Indian chart: diagonals + diamond house regions (SVG). */
function renderKundaliChart(chartData) {
  const host = document.getElementById("kundali-chart");
  const lagnaEl = document.getElementById("kundali-chart-lagna");
  if (!host) return;
  host.innerHTML = "";
  if (!chartData || !Array.isArray(chartData.cells)) {
    if (lagnaEl) lagnaEl.hidden = true;
    return;
  }
  if (lagnaEl) {
    const lagnaNum =
      chartData.lagna_rashi_number != null
        ? String(chartData.lagna_rashi_number)
        : chartData.lagna_label || "";
    lagnaEl.textContent = lagnaNum ? `Lagna: ${lagnaNum}` : "";
    lagnaEl.hidden = !lagnaNum;
  }

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
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true });
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
        appendColoredPlanetsToText(plEl, housePlanets, labelX, { rowMode: true });
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
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true });
        g.appendChild(plEl);
      }
    } else if (cell.house === 7) {
      /** House 7 (bottom center): planets above, sign number below. */
      if (housePlanets.length) {
        const plEl = createPlanetTextEl(cx, cy - 3.5, "middle", densePlanets);
        appendColoredPlanetsToText(plEl, housePlanets, cx, {
          rowMode: true,
          rowDy: "-1.05em"
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
          leadGap: rashiNum != null
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
        appendColoredPlanetsToText(lineEl, housePlanets, null, { firstDy: "0", gap: " " });
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
        appendColoredPlanetsToText(plEl, housePlanets, cx, { rowMode: true });
        g.appendChild(plEl);
      }
    }

    labelsGroup.appendChild(g);
  }

  svg.appendChild(labelsGroup);
  host.appendChild(svg);
}

/** Fill summary table from API ``summary_table`` rows (built in get_kundali.py). */
function renderSummaryTableFromApiRows(summaryBody, summaryRows) {
  if (!summaryBody) return;
  summaryBody.innerHTML = "";
  for (const row of summaryRows || []) {
    summaryBody.appendChild(createSummaryLabelValueRow(row.label, row.value));
  }
}

/** Fill summary, planets, and navatara tables from /api/kundali JSON. */
function renderKundaliResponseIntoPage(kundaliPayload) {
  const summaryBody = document.querySelector("#summary-table tbody");
  const planetsBody = document.querySelector("#planets-table tbody");
  const navataraBody = document.querySelector("#navatara-table tbody");

  renderSummaryTableFromApiRows(summaryBody, kundaliPayload.summary_table);
  renderKundaliChart(buildNorthIndianChartFromPayload(kundaliPayload));

  renderPlanetsTableWithColors(planetsBody, kundaliPayload.planets_table || []);
  renderNavataraTableWithColors(navataraBody, kundaliPayload.navatara_rows || []);

  if (resultsEl) resultsEl.hidden = false;
  showStatusMessage(kundaliPayload.ui_status_message || "Loaded.");
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
  const payload = await response.json();
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
    const kundaliPayload = await fetchKundaliJsonFromApi(
      birthDate.value,
      birthTime.value,
      place
    );
    renderKundaliResponseIntoPage(kundaliPayload);
  } catch (err) {
    showStatusMessage(`Failed: ${err.message}. Is Flask running on port ${C.FLASK_PORT}?`, true);
  }
}

if (placePreset) {
  placePreset.addEventListener("change", syncCustomPlaceFieldVisibility);
}

if (form) {
  form.addEventListener("submit", handleBirthFormSubmit);
}

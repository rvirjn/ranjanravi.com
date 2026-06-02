// Copyright © 2018-2026 ranjanravi.com. All rights reserved.
/** Lord strength comparison table (auspicious top slots + kundali compare). */
(function lordComparisonModule() {
  const CHROME = {
    top: {
      heading: "Lord strength differences across top slots",
      lead:
        "Top slots by house strength (ranked <strong>1</strong>, <strong>2</strong>, <strong>3</strong>… in each column). Each lord starts at <strong>100</strong> strength; +/- adjustments increase or decrease its power. Birth charts appear in each column header."
    },
    compare: {
      heading: "Lord strength differences across compared births",
      lead:
        "Each lord starts at <strong>100</strong> strength; +/- adjustments increase or decrease its power. Birth charts appear in each column header."
    }
  };

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

      otherFactors.forEach((factor) => {
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

  function setChrome(mode) {
    const heading = document.getElementById("lord-comparison-heading");
    const lead = document.querySelector(".auspicious-lord-comparison-lead");
    const cfg = CHROME[mode] || CHROME.top;
    if (heading) heading.textContent = cfg.heading;
    if (lead) lead.innerHTML = cfg.lead;
  }

  function renderTable(comparison) {
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

    columns.forEach((column, colIndex) => {
      const th = document.createElement("th");
      th.className = "auspicious-lord-col";

      const label = document.createElement("span");
      label.className = "auspicious-lord-col__label";
      label.textContent = column.label || `${column.date} ${column.time}`;

      const total = document.createElement("span");
      total.className = "auspicious-lord-col__total";
      if (typeof column.houses_strength_total === "number") {
        const rank = column.rank ?? colIndex + 1;
        const rankEl = document.createElement("strong");
        rankEl.className = "auspicious-lord-col__rank";
        rankEl.textContent = `${rank}. `;
        total.append(rankEl, document.createTextNode(`Total ${column.houses_strength_total}`));
      }

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
      const planetTd = document.createElement("td");
      planetTd.className = "planets-td-planet";
      planetTd.textContent = formatPlanetDisplayName(rowData.planet);
      tr.appendChild(planetTd);

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

  window.SaptarishiLordComparison = {
    setChrome,
    renderTable
  };
})();

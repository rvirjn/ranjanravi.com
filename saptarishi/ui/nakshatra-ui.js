const form = document.getElementById("nakshatra-form");
const select = document.getElementById("nakshatra-select");
const statusEl = document.getElementById("status");
const chakraTableBody = document.querySelector("#chakra-table tbody");
const API_BASE = "http://localhost:8081";
const API_NAKSHATRAS = `${API_BASE}/api/nakshatras`;
const API_CHAKRAS = `${API_BASE}/api/chakras`;

function fillTable(tbody, rows, columns) {
  tbody.innerHTML = "";
  rows.forEach((row) => {
    const tr = document.createElement("tr");
    columns.forEach((col) => {
      const td = document.createElement("td");
      td.textContent = row[col] ?? "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function showStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b00020" : "#333";
}

async function init() {
  try {
    const response = await fetch(API_NAKSHATRAS);
    if (!response.ok) {
      throw new Error("Failed to fetch nakshatras");
    }
    const nakshatras = await response.json();
    nakshatras.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    select.selectedIndex = 0;
    chakraTableBody.innerHTML = "";
    showStatus("Select a janma nakshatra and click Show Data.");
  } catch (err) {
    showStatus("Failed to load nakshatras from python api.", true);
  }
}

async function render(nakshatraName) {
  try {
    const response = await fetch(`${API_CHAKRAS}?nakshatra=${encodeURIComponent(nakshatraName)}`);
    if (!response.ok) {
      const errorPayload = await response.json();
      showStatus(errorPayload.error || "Nakshatra not found.", true);
      chakraTableBody.innerHTML = "";
      return;
    }

    const payload = await response.json();
    const rows = [];
    payload.chakras_with_nakshatras.forEach((chakra) => {
      (chakra.nakshatras || []).forEach((item) => {
        rows.push({
          chakra_name: chakra.name,
          auspicious: chakra.auspicious,
          nakshatra: item.nakshatra,
          ruling_planet: item.ruling_planet,
          helpful_god: item.deity,
          tree: item.tree,
          lucky_colors: (item.lucky_colors || []).join(", "),
          result: chakra.result
        });
      });
    });

    fillTable(chakraTableBody, rows, [
      "chakra_name",
      "auspicious",
      "nakshatra",
      "ruling_planet",
      "helpful_god",
      "tree",
      "lucky_colors",
      "result"
    ]);

    showStatus(`Showing details for: ${nakshatraName}`);
  } catch (err) {
    showStatus("Failed to load chakra data from python api.", true);
    chakraTableBody.innerHTML = "";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  render(select.value);
});

init();

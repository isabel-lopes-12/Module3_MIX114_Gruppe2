//filter
const SSB_URL =
  "https://data.ssb.no/api/pxwebapi/v2/tables/11820/data?lang=no&outputFormat=json-stat2&valuecodes[Tid]=2025&valuecodes[KOKkommuneregion0000]=*&codelist[KOKkommuneregion0000]=agg_KOGkommuneregion000005402&valuecodes[ContentsCode]=KOSfolkemengde0000,KOSnettoinn0000,KOSfodde0000,KOSdode0000,KOSuforepensjoni0000,KOSsamlafruktbar0000,KOSfvlevealderkv0000,KOSfvlevealderme0000&heading=Tid,ContentsCode&stub=KOKkommuneregion0000";

// Hent og vis kartdata
  const filters = [
  { id: "KOSfolkemengde0000", label: "Befolkning", unit: "innbyggere" },
  { id: "KOSnettoinn0000", label: "Netto innflytting", unit: "personer" },
  { id: "KOSfodde0000", label: "Fødte", unit: "personer" },
  { id: "KOSdode0000", label: "Døde", unit: "personer" },
  { id: "KOSuforepensjoni0000", label: "Uførhet", unit: "personer" },
  { id: "KOSsamlafruktbar0000", label: "Fødselsrate", unit: "barn per kvinne" },
  { id: "KOSfvlevealderkv0000", label: "Levealder kvinner", unit: "år" },
  { id: "KOSfvlevealderme0000", label: "Levealder menn", unit: "år" }
];

let selectedFilter = null;
let filterMode = null;
let kommuneData = {};
let mapReady = false;
let dataReady = false;

const filterList = document.getElementById("filterList");
const filterSearch = document.getElementById("filterSearch");

// Hjelpefunksjon for å rydde opp kommune-ID-er
function cleanKommuneId(id) {
  return String(id).replace("K-", "").slice(-4);
}

document.addEventListener("mapReady", async () => {
  mapReady = true;

  try {
    await fetchSsbData();
    dataReady = true;
  } catch (error) {
    console.error(error);
    alert("Kunne ikke hente data fra SSB.");
  }
});

// Hent og prosesser SSB-data
async function fetchSsbData() {
  const response = await fetch(SSB_URL);

  if (!response.ok) {
    throw new Error("SSB-feil: " + response.status);
  }

  const json = await response.json();
  const rows = jsonStatToRows(json);

  kommuneData = {};

  rows.forEach(row => {
    const kommuneNr = cleanKommuneId(row.KOKkommuneregion0000);
    const code = row.ContentsCode;
    const value = Number(row.value);

    if (!/^\d{4}$/.test(kommuneNr)) return;
    if (Number.isNaN(value)) return;

    if (!kommuneData[kommuneNr]) {
      kommuneData[kommuneNr] = {};
    }

    kommuneData[kommuneNr][code] = value;
  });

  console.log("SSB-data lastet:", kommuneData);
}

// Konverter SSB JSON-stat til rader
function jsonStatToRows(json) {
  const rows = [];
  const ids = json.id;
  const sizes = json.size;
  const values = json.value;

  for (let i = 0; i < values.length; i++) {
    if (values[i] === null || values[i] === undefined) continue;

    let remainder = i;
    const row = { value: values[i] };

    for (let d = ids.length - 1; d >= 0; d--) {
      const dimensionId = ids[d];
      const size = sizes[d];
      const position = remainder % size;

      remainder = Math.floor(remainder / size);

      const indexObj = json.dimension[dimensionId].category.index;
      const code = Object.keys(indexObj).find(key => indexObj[key] === position);

      row[dimensionId] = code;
    }

    rows.push(row);
  }

  return rows;
}


function renderFilters(list) {
  filterList.innerHTML = "";

  list.forEach(filter => {
    const item = document.createElement("div");
    item.className = "filter-item";

    if (selectedFilter === filter.id) {
      item.classList.add("active");
    }

    item.textContent = filter.label;

    item.addEventListener("click", () => {
      if (!dataReady) {
        alert("Data lastes fortsatt inn. Prøv igjen om et øyeblikk.");
        return;
      }

      selectedFilter = filter.id;
      filterMode = null;

      clearActiveButtons();
      renderFilters(filters);
      applyFilterToMap();
    });

    filterList.appendChild(item);
  });
}

//Filtrer kartdata basert på valgt filter og modus
function applyFilterToMap() {
  if (!mapReady || !dataReady || !selectedFilter) return;

  const filter = filters.find(f => f.id === selectedFilter);

  const values = Object.values(kommuneData)
    .map(data => data[selectedFilter])
    .filter(value => typeof value === "number" && !Number.isNaN(value));

  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;

  const dataForMap = Object.keys(kommuneData).map(kommuneNr => {
    const value = kommuneData[kommuneNr][selectedFilter];

    let visibleValue = value;

    if (filterMode === "above" && value < avg) {
      visibleValue = null;
    }

    if (filterMode === "below" && value >= avg) {
      visibleValue = null;
    }

    return {
      code: kommuneNr,
      value: visibleValue,
      realValue: value
    };
  });

  window.KKMap.updateMapData(dataForMap, filter.label);
}

function getMunicipalityDataHtml(kommuneNr, name) {
  kommuneNr = cleanKommuneId(kommuneNr);
  const data = kommuneData[kommuneNr];

  if (!data) {
    return "Ingen data tilgjengelig.";
  }

  return `
    <div class="key-info">
      <div class="key-row">
        <span>Innbyggere:</span>
        <strong>${formatValue(data.KOSfolkemengde0000)}</strong>
      </div>

      <div class="key-row">
        <span>Netto innflytting:</span>
        <strong>${formatValue(data.KOSnettoinn0000)}</strong>
      </div>

      <div class="key-row">
        <span>Fødte:</span>
        <strong>${formatValue(data.KOSfodde0000)}</strong>
      </div>

      <div class="key-row">
        <span>Døde:</span>
        <strong>${formatValue(data.KOSdode0000)}</strong>
      </div>

      <div class="key-row">
        <span>Fødselsrate:</span>
        <strong>${formatValue(data.KOSsamlafruktbar0000)}</strong>
      </div>
    </div>
  `;
}

function getMunicipalityTooltipHtml(kommuneNr, name) {
  kommuneNr = cleanKommuneId(kommuneNr);
  const data = kommuneData[kommuneNr];

  if (!data) {
    return `<b>${name}</b><br>Ingen data`;
  }

  if (!selectedFilter) {
    return `<b>${name}</b><br>Velg et filter`;
  }


  const filter = filters.find(f => f.id === selectedFilter);
  const value = data[selectedFilter];

  return `
    <b>${name}</b><br>
    ${filter.label}: ${formatValue(value)} ${filter.unit}
  `;
}

function formatValue(value) {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "–";
  }

  return Number(value).toLocaleString("nb-NO", {
    maximumFractionDigits: 2
  });
}

filterSearch.addEventListener("input", () => {
  const searchText = filterSearch.value.toLowerCase();

  renderFilters(
    filters.filter(filter =>
      filter.label.toLowerCase().includes(searchText)
    )
  );
});

document.getElementById("showAboveBtn").addEventListener("click", () => {
  if (!selectedFilter) {
    alert("Velg et filter først");
    return;
  }

  filterMode = "above";
  setActiveButton("showAboveBtn");
  applyFilterToMap();
});

document.getElementById("showBelowBtn").addEventListener("click", () => {
  if (!selectedFilter) {
    alert("Velg et filter først");
    return;
  }

  filterMode = "below";
  setActiveButton("showBelowBtn");
  applyFilterToMap();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  selectedFilter = null;
  filterMode = null;
  filterSearch.value = "";

  clearActiveButtons();
  renderFilters(filters);

  if (window.KKMap) {
    window.KKMap.resetMapData();
  }
});

function setActiveButton(buttonId) {
  clearActiveButtons();

  if (buttonId) {
    document.getElementById(buttonId).classList.add("active");
  }
}

function clearActiveButtons() {
  document.querySelectorAll(".filter-buttons button").forEach(button => {
    button.classList.remove("active");
  });
}

window.getMunicipalityDataHtml = getMunicipalityDataHtml;
window.getMunicipalityTooltipHtml = getMunicipalityTooltipHtml;

renderFilters(filters);
const mapDataUrl =
  "https://cdn.jsdelivr.net/gh/robhop/fylker-og-kommuner@main/Kommuner-M.geojson";

let mapChart = null;
let mapData = null;

const selectedName = document.getElementById("selectedName");
const selectedInfo = document.getElementById("selectedInfo");
const searchInput = document.getElementById("searchInput");

function getMunicipalityName(feature) {
  return (
    feature.properties.navn ||
    feature.properties.NAVN ||
    feature.properties.kommunenavn ||
    feature.properties.KOMMUNENAVN ||
    feature.properties.name ||
    feature.properties.NAME ||
    "Ukjent kommune"
  );
}

// Hent og vis kartdata
function getMunicipalityId(feature) {
  return String(
    feature.properties.kommunenummer ||
    feature.properties.KOMMUNENUMMER ||
    feature.properties.kommunenr ||
    feature.properties.KOMM ||
    feature.properties.id ||
    ""
  ).replace("K-", "").slice(-4);
}

async function loadMap() {
  const response = await fetch(mapDataUrl);
  mapData = await response.json();

  const emptyData = mapData.features.map(feature => ({
    code: getMunicipalityId(feature),
    name: getMunicipalityName(feature),
    value: 1,
    color: "#d3d3d3"
  }));

  mapChart = Highcharts.mapChart("norwayMap", {
    accessibility: {
      enabled: false
    },

    chart: {
      map: mapData
    },

    title: {
      text: ""
    },

    credits: {
      enabled: false
    },

    mapNavigation: {
      enabled: true,
      buttonOptions: {
        align: "left",
        verticalAlign: "top"
      }
    },

    colorAxis: {
      minColor: "#E6F1FB",
      maxColor: "#042C53"
    },

    legend: {
      enabled: false,
      align: "center",
      verticalAlign: "bottom",
      y: -120,
    },

    tooltip: {
      useHTML: true,
      pointFormatter: function () {
        if (window.getMunicipalityTooltipHtml) {
          return window.getMunicipalityTooltipHtml(this.code, this.name);
        }

        return `<b>${this.name}</b><br>Ingen data`;
      }
    },

    series: [{
      name: "Kommuner",
      mapData: mapData,
      data: emptyData,
      joinBy: ["kommunenummer", "code"],
      color: "#d3d3d3",
      borderColor: "#ffffff",
      borderWidth: 0.5,

      states: {
        hover: {
          color: "#7b0000"
        }
      },

      point: {
        events: {
          click: function () {
          const clickedCode =
            this.code ||
            this.options.code ||
            this.properties?.kommunenummer ||
            this.properties?.KOMMUNENUMMER;

          console.log("Klikket kommune:", this.name, clickedCode);

          selectedName.textContent = this.name;

          highlightMunicipalityAndNeighbors(clickedCode);

          if (window.getMunicipalityDataHtml) {
            selectedInfo.innerHTML =
              window.getMunicipalityDataHtml(clickedCode, this.name);
          }
        }
        }
      }
    }]
  });

  document.dispatchEvent(new CustomEvent("mapReady"));
}

function updateMapData(dataForMap, title = "Kommuner") {
  if (!mapChart) return;

  mapChart.update({
    legend: {
      enabled: true, 
      y: -120
    }
  }, false);

  mapChart.series[0].update({
    name: title,
    data: dataForMap
  }, true);
}

function resetMapData() {
  if (!mapChart || !mapData) return;

  const emptyData = mapData.features.map(feature => ({
    code: getMunicipalityId(feature),
    name: getMunicipalityName(feature),
    value: 1,
    color: "#d3d3d3"
  }));

  mapChart.update({
    legend: {
      enabled: false,
      y: -80
    }
  }, false);

  mapChart.series[0].setData(emptyData, true);{
}
}

function searchMunicipality() {
  if (!mapChart || !searchInput.value.trim()) return;

  const searchValue = searchInput.value.trim().toLowerCase();

  const point = mapChart.series[0].points.find(p =>
    String(p.name).toLowerCase().includes(searchValue)
  );

  if (!point) {
    selectedName.textContent = "Fant ikke kommune";
    selectedInfo.textContent = "Prøv å skrive et annet kommunenavn.";
    return;
  }

  selectedName.textContent = point.name;

  if (window.getMunicipalityDataHtml) {
    selectedInfo.innerHTML =
      window.getMunicipalityDataHtml(point.code, point.name);
  }

  point.zoomTo();
}

searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    searchMunicipality();
  }
});

function normalizeCode(code) {
  return String(code || "").replace("K-", "").slice(-4);
}

function findNeighborCodes(clickedCode) {
  clickedCode = normalizeCode(clickedCode);

  console.log("Leter etter naboer til:", clickedCode);

  const clickedFeature = mapData.features.find(feature =>
    normalizeCode(getMunicipalityId(feature)) === clickedCode
  );

  if (!clickedFeature) {
    console.log("Fant ikke feature for:", clickedCode);
    return [];
  }

  const buffered = turf.buffer(clickedFeature, 5, {
    units: "kilometers"
  });

  const neighbors = [];

  mapData.features.forEach(feature => {
    const code = normalizeCode(getMunicipalityId(feature));

    if (code === clickedCode) return;

    try {
      if (turf.booleanIntersects(buffered, feature)) {
        neighbors.push(code);
      }
    } catch (error) {
      console.log("Turf-feil:", code, error);
    }
  });

  console.log("Nabokommuner funnet:", neighbors);
  return neighbors;
}

function highlightMunicipalityAndNeighbors(clickedCode) {
  clickedCode = normalizeCode(clickedCode);

  const neighborCodes = findNeighborCodes(clickedCode);

  mapChart.series[0].points.forEach(point => {
    const pointCode = normalizeCode(
      point.code ||
      point.options.code ||
      point.properties?.kommunenummer ||
      point.properties?.KOMMUNENUMMER
    );

    if (pointCode === clickedCode) {
      point.update({ color: "#7b0000" }, false);
    } else if (neighborCodes.includes(pointCode)) {
      point.update({ color: "#00205B" }, false);
    } else {
      point.update({ color: "#d3d3d3" }, false);
    }
  });

  mapChart.redraw();
}

window.KKMap = {
  updateMapData,
  resetMapData,
  getMapData: () => mapData
};

loadMap();

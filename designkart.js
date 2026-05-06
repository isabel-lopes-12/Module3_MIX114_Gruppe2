// GeoJSON-fil med norske kommunegrenser.
// Denne gjør at kartet får ekte kommuneinndeling.
const geoJsonUrl =
  "https://cdn.jsdelivr.net/gh/robhop/fylker-og-kommuner@main/Kommuner-M.geojson";

// Henter SVG-elementet hvor kartet skal tegnes
const svg = d3.select("#norwayMap");

// Henter tooltipen som viser kommunenavn ved hover
const tooltip = document.getElementById("tooltip");

// Henter tekstfeltene i kommunekortet til høyre
const selectedName = document.getElementById("selectedName");
const selectedInfo = document.getElementById("selectedInfo");

// Her lagres kartdataen etter at den er lastet inn
let geoData;


// Finner kommunenavnet fra GeoJSON-dataen
function getMunicipalityName(feature) {
  return (
    feature.properties.navn ||
    feature.properties.NAVN ||
    feature.properties.kommunenavn ||
    feature.properties.KOMMUNENAVN ||
    feature.properties.name ||
    "Ukjent kommune"
  );
}


// Finner kommunenummer eller ID.
// Dette brukes for å kjenne igjen kommunene når de skal markeres.
function getMunicipalityId(feature) {
  return (
    feature.properties.kommunenummer ||
    feature.properties.KOMMUNENUMMER ||
    feature.properties.kommunenr ||
    feature.properties.KOMM ||
    feature.properties.id ||
    getMunicipalityName(feature)
  );
}


// Sjekker om to geografiske bokser overlapper.
// Dette gjør nabosøket raskere.
function boxesOverlap(boxA, boxB) {
  return !(
    boxA[2] < boxB[0] ||
    boxA[0] > boxB[2] ||
    boxA[3] < boxB[1] ||
    boxA[1] > boxB[3]
  );
}


// Finner nabokommunene til kommunen man klikker på
function findNeighborMunicipalities(clickedFeature) {
  const clickedBox = turf.bbox(clickedFeature);

  return geoData.features.filter((feature) => {
    // Ikke ta med kommunen som allerede er valgt
    if (feature === clickedFeature) {
      return false;
    }

    const featureBox = turf.bbox(feature);

    // Hopper over kommuner som er langt unna
    if (!boxesOverlap(clickedBox, featureBox)) {
      return false;
    }

    // Sjekker om kommunene faktisk berører hverandre
    try {
      return turf.booleanTouches(clickedFeature, feature);
    } catch (error) {
      return false;
    }
  });
}


// Denne funksjonen kjøres når brukeren klikker på en kommune
function selectMunicipality(event, feature) {
  // Fjerner gamle markeringer fra kartet
  d3.selectAll(".municipality")
    .classed("selected", false)
    .classed("neighbor", false);

  // Marker valgt kommune med rødt
  d3.select(event.currentTarget).classed("selected", true);

  // Finn nabokommunene
  const neighbors = findNeighborMunicipalities(feature);

  // Lager en liste med ID-ene til nabokommunene
  const neighborIds = neighbors.map((neighbor) => getMunicipalityId(neighbor));

  // Marker nabokommunene med blått
  d3.selectAll(".municipality").classed("neighbor", function (d) {
    return neighborIds.includes(getMunicipalityId(d));
  });

  // Oppdaterer kortet til høyre
  selectedName.textContent = getMunicipalityName(feature);
  selectedInfo.textContent = "Denne kommunen er markert i rødt. Nabokommunene rundt er markert i blått.";
}


// Tegner hele Norge-kartet
function drawMap() {
  const container = document.querySelector(".map-wrapper");

  // Finner størrelsen på området kartet skal tegnes i
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Tømmer kartet før det tegnes på nytt
  svg.selectAll("*").remove();

  // Setter størrelse på SVG-kartet
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Lager kartprojeksjon som tilpasser Norge til boksen
  const projection = d3.geoMercator().fitSize([width, height], geoData);

  // Gjør GeoJSON-data om til SVG-former
  const pathGenerator = d3.geoPath().projection(projection);

  // Tegner hver kommune som en egen path
  svg
    .selectAll("path")
    .data(geoData.features)
    .enter()
    .append("path")
    .attr("class", "municipality")
    .attr("d", pathGenerator)

    // Når man holder musepekeren over en kommune
    .on("mouseenter", function (event, feature) {
      tooltip.textContent = getMunicipalityName(feature);
      tooltip.style.opacity = "1";
    })

    // Flytter tooltipen etter musepekeren
    .on("mousemove", function (event) {
      const mapWrapper = document.querySelector(".map-wrapper");
      const rect = mapWrapper.getBoundingClientRect();

      tooltip.style.left = event.clientX - rect.left + 12 + "px";
      tooltip.style.top = event.clientY - rect.top + 12 + "px";
    })

    // Skjuler tooltipen når man tar musepekeren bort
    .on("mouseleave", function () {
      tooltip.style.opacity = "0";
    })

    // Når man klikker på en kommune
    .on("click", selectMunicipality);
}


// Laster inn kommunegrensene
d3.json(geoJsonUrl)
  .then((data) => {
    geoData = data;

    // Tegner kartet når dataen er lastet
    drawMap();
  })
  .catch((error) => {
    console.error("Kunne ikke laste inn kartdata:", error);
  });


// Tegner kartet på nytt hvis vindusstørrelsen endres
window.addEventListener("resize", () => {
  if (geoData) {
    drawMap();
  }
});

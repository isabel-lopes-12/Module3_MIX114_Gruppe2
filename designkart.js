// GeoJSON-fil med norske kommunegrenser.
// Denne filen gjør at vi kan tegne alle kommuner i Norge som egne områder.
const geoJsonUrl =
  "https://cdn.jsdelivr.net/gh/robhop/fylker-og-kommuner@main/Kommuner-M.geojson";

let valgtKommune = null;

// Henter SVG-elementet hvor kartet skal tegnes
const svg = d3.select("#norwayMap");

// Henter tooltipen som viser kommunenavn når man hover over kartet
const tooltip = document.getElementById("tooltip");

// Henter tekstfeltene i kommunekortet til høyre
const selectedName = document.getElementById("selectedName");
const selectedInfo = document.getElementById("selectedInfo");

// Henter søkefeltet
const searchInput = document.getElementById("searchInput");

// Her lagres kartdataen etter at den er lastet inn
let geoData;

// Her lagres path-generatoren som brukes til å tegne kommunene
let pathGenerator;


/*
  Denne funksjonen finner kommunenavnet.
  Ulike datasett kan bruke litt ulike navn på feltet,
  derfor sjekker vi flere muligheter.
*/
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


/*
  Denne funksjonen finner ID eller kommunenummer.
  Dette brukes for å kunne kjenne igjen valgt kommune og nabokommuner.
*/
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


/*
  Sjekker om to geografiske bokser overlapper.
  Dette gjør nabosøket raskere fordi vi slipper å sjekke alle kommuner nøye.
*/
function boxesOverlap(boxA, boxB) {
  return !(
    boxA[2] < boxB[0] ||
    boxA[0] > boxB[2] ||
    boxA[3] < boxB[1] ||
    boxA[1] > boxB[3]
  );
}


/*
  Finner nabokommunene til kommunen man klikker på.
  Nabokommuner er kommuner som grenser direkte til den valgte kommunen.
*/
function findNeighborMunicipalities(clickedFeature) {
  const clickedBox = turf.bbox(clickedFeature);

  return geoData.features.filter((feature) => {
    // Ikke ta med kommunen som allerede er valgt
    if (feature === clickedFeature) {
      return false;
    }

    const featureBox = turf.bbox(feature);

    // Hopper over kommuner som ligger langt unna
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


/*
  Denne funksjonen markerer valgt kommune rød
  og nabokommunene blå.
*/
function selectMunicipality(event, feature) {

  valgtKommune = {
    navn: getMunicipalityName(feature),
    kode: String(
      feature.properties.kommunenummer ||
      feature.properties.KOMMUNENUMMER
    )
  };

  // Fjerner gamle markeringer
  d3.selectAll(".municipality")
    .classed("selected", false)
    .classed("neighbor", false);

  // Marker valgt kommune med rød farge
  d3.select(event.currentTarget).classed("selected", true);

  // Finn nabokommunene til valgt kommune
  const neighbors = findNeighborMunicipalities(feature);

  // Lager en liste med ID-ene til nabokommunene
  const neighborIds = neighbors.map((neighbor) =>
    getMunicipalityId(neighbor)
  );

  // Marker alle nabokommuner med blå farge
  d3.selectAll(".municipality").classed("neighbor", function (d) {
    return neighborIds.includes(getMunicipalityId(d));
  });

  // Oppdaterer kortet til høyre med kommunenavnet
  selectedName.textContent = getMunicipalityName(feature);

  // Oppdaterer forklaringsteksten i kortet
  selectedInfo.textContent =
    "Denne kommunen er markert i rødt. Nabokommunene rundt er markert i blått.";
}


/*
  Denne funksjonen tegner hele Norge-kartet.
  Hver kommune blir tegnet som en egen SVG-path.
*/
function drawMap() {
  const container = document.querySelector(".map-wrapper");

  // Finner størrelsen på kartområdet
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Tømmer kartet før det tegnes på nytt
  svg.selectAll("*").remove();

  // Setter viewBox slik at kartet skalerer riktig
  svg.attr("viewBox", `0 0 ${width} ${height}`);

  // Lager kartprojeksjon som tilpasser Norge til boksen
  const projection = d3.geoIdentity()
  .reflectY(true)
  .fitSize([width, height], geoData);

  // Gjør GeoJSON-data om til SVG-former
  pathGenerator = d3.geoPath().projection(projection);

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

    // Skjuler tooltipen når musepekeren går bort fra kommunen
    .on("mouseleave", function () {
      tooltip.style.opacity = "0";
    })

    // Klikk på kommune markerer valgt kommune og nabokommunene
    .on("click", selectMunicipality);

    // Sender en melding til filter.js om at kartet er klart, og inkluderer alle kommunene som data
    document.dispatchEvent(new CustomEvent("mapReady", 
      { detail: { features: geoData.features}
    }));
}


/*
  Søker etter kommune i søkefeltet.
  Når brukeren skriver et kommunenavn og trykker Enter,
  blir kommunen markert på kartet.
*/
function searchMunicipality() {
  if (!geoData) return;

  const searchValue = searchInput.value.trim().toLowerCase();

  if (searchValue === "") return;

  const foundFeature = geoData.features.find((feature) =>
    getMunicipalityName(feature).toLowerCase().includes(searchValue)
  );

  if (!foundFeature) {
    selectedName.textContent = "Fant ikke kommune";
    selectedInfo.textContent = "Prøv å skrive et annet kommunenavn.";
    return;
  }

  // Finn path-elementet som hører til kommunen
  const foundPath = d3
    .selectAll(".municipality")
    .filter((d) => getMunicipalityId(d) === getMunicipalityId(foundFeature));

  // Simulerer et klikk på kommunen slik at samme markeringsfunksjon brukes
  foundPath.dispatch("click");
}


/*
  Laster inn kommunegrensene.
  Når dataen er lastet inn, tegnes kartet.
*/
d3.json(geoJsonUrl)
  .then((data) => {
    geoData = data;

    // Tegner kartet første gang
    drawMap();
  })
  .catch((error) => {
    console.error("Kunne ikke laste inn kartdata:", error);

    selectedName.textContent = "Kartet kunne ikke lastes";
    selectedInfo.textContent =
      "Sjekk at du er koblet til internett, og åpne siden med Live Server.";
  });


/*
  Tegner kartet på nytt hvis vindusstørrelsen endres.
  Dette gjør kartet mer responsivt.
*/
window.addEventListener("resize", () => {
  if (geoData) {
    drawMap();
  }
});


/*
  Lar brukeren søke etter kommune ved å trykke Enter i søkefeltet.
*/
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchMunicipality();
  }
});

const readMoreBtn = document.getElementById("readMoreBtn");

readMoreBtn.addEventListener("click", (event) => {
  event.preventDefault();

  if (!valgtKommune) {
    alert("Velg en kommune først.");
    return;
  }

  window.location.href =
    `../detaljegraferIntegrert/indexDetaljeOppdatert.html?kommune=${valgtKommune.kode}`;
});

const DATA_API_1 =
  "https://data.ssb.no/api/pxwebapi/v2/tables/07459/data";

const DATA_API_2 =
  "https://data.ssb.no/api/pxwebapi/v2/tables/11820/data";

let valgte1 = [];
let valgte2 = [];

let alleKommuner = [];
let filtrertListe = [];

// HENT KOMMUNER
async function hentKommuner() {
  const res = await fetch(
    "https://data.ssb.no/api/klass/v1/classifications/131/codes?from=2020-01-01"
  );

  const json = await res.json();

  alleKommuner = json.codes
    .filter(k => k.code.length === 4)
    .map(k => ({
      kode: k.code,
      navn: k.name
    }))
    .sort((a, b) => a.navn.localeCompare(b.navn));

  filtrertListe = alleKommuner;
}

// SØK
const searchInput = document.getElementById("search");

searchInput.addEventListener("input", e => {
  const value = e.target.value.toLowerCase();

  filtrertListe = alleKommuner.filter(k =>
    k.navn.toLowerCase().includes(value)
  );
});

// ENTER = LEGG TIL I BEGGE GRAFER
searchInput.addEventListener("keydown", async e => {
  if (e.key === "Enter") {

    if (!filtrertListe.length) return;

    const kommune = filtrertListe[0];

    // stopp duplikater
    if (valgte1.find(k => k.kode === kommune.kode)) return;

    // maks 4 kommuner
    if (valgte1.length >= 4) return;

    // hent data til graf 1
    const data1 = await hentData1(kommune.kode);

    // hent data til graf 2
    const data2 = await hentData2(kommune.kode);

    // legg til graf 1
    valgte1.push({
      kode: kommune.kode,
      navn: kommune.navn,
      data: data1.values
    });

    // legg til graf 2
    valgte2.push({
      kode: kommune.kode,
      navn: kommune.navn,
      data: data2.values
    });

    searchInput.value = "";

    render();
  }
});

// GRAF 1 - BEFOLKNINGSUTVIKLING
async function hentData1(kommune) {

  const res = await fetch(
    `${DATA_API_1}?lang=no&valueCodes[Region]=${kommune}&valueCodes[ContentsCode]=Personer1&valueCodes[Tid]=from(2015)`
  );

  const json = await res.json();

  const index = json.dimension.Tid.category.index;

  const years = Object.keys(index)
    .sort((a, b) => index[a] - index[b]);

  const values = years.map(y => {
    const i = index[y];
    return Number(json.value[i] || 0);
  });

  return {
    years: years.slice(-10),
    values: values.slice(-10)
  };
}

// GRAF 2 - FØDETALL PER KVINNE
async function hentData2(kommune) {

  const url =
    `${DATA_API_2}?lang=no&outputFormat=json-stat2` +
    `&valuecodes[Tid]=2025` +
    `&valuecodes[KOKkommuneregion0000]=${kommune}` +
    `&valuecodes[ContentsCode]=KOSsamlafruktbar0000` +
    `&heading=Tid,ContentsCode` +
    `&stub=KOKkommuneregion0000`;

  const res = await fetch(url);

  const json = await res.json();

  return {
    values: [Number(json.value[0] || 0)]
  };
}

// FJERN
function fjern(kode) {

  valgte1 = valgte1.filter(k => k.kode !== kode);
  valgte2 = valgte2.filter(k => k.kode !== kode);

  render();
}

// RENDER
function render() {

  // CHIPS
  document.getElementById("selected").innerHTML =
    valgte1.map(k => `
      <div class="chip">
        ${k.navn}
        <button onclick="fjern('${k.kode}')">×</button>
      </div>
    `).join("");

  // GRAF 1
  Highcharts.chart("chart1", {

    title: {
      text: "Befolkningsutvikling"
    },

    xAxis: {
      categories: Array.from({ length: 10 }, (_, i) => 2015 + i)
    },

    yAxis: {
      title: {
        text: "Antall personer"
      }
    },

    legend: {
      align: "center",
      verticalAlign: "top"
    },

    series: valgte1.map(k => ({
      name: k.navn,
      data: k.data
    })),

    credits: {
      enabled: false
    }

  });

  // GRAF 2
  Highcharts.chart("chart2", {

    chart: {
      type: "column"
    },

    title: {
      text: "Fødetall per kvinne 2025"
    },

    xAxis: {
      categories: valgte2.map(k => k.navn)
    },

    yAxis: {
      title: {
        text: "Fødetall"
      }
    },

    series: [{
      name: "Fødetall per kvinne",
      data: valgte2.map(k => k.data[0]),
      color: "#7B0000"
    }],

    credits: {
      enabled: false
    }

  });
}

// START
hentKommuner();
const DATA_API =
    "https://data.ssb.no/api/pxwebapi/v2/tables/07459/data";

let valgte = [];
let alleKommuner = [];
let filtrertListe = [];

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

const searchInput = document.getElementById("search");

searchInput.addEventListener("input", e => {
    const value = e.target.value.toLowerCase();

    filtrertListe = alleKommuner.filter(k =>
        k.navn.toLowerCase().includes(value)
    );
});

    searchInput.addEventListener("keydown", async e => {
    if (e.key === "Enter") {
        if (!filtrertListe.length) return;

        const kommune = filtrertListe[0];

        if (valgte.find(k => k.kode === kommune.kode)) return;
        if (valgte.length >= 4) return;

        const data = await hentData(kommune.kode);

        valgte.push({
        kode: kommune.kode,
        navn: kommune.navn,
        data: data.values
        });

        searchInput.value = "";
        render();
    }
    });

async function hentData(kommune) {
    const res = await fetch(
        `${DATA_API}?lang=no&valueCodes[Region]=${kommune}&valueCodes[ContentsCode]=Personer1&valueCodes[Tid]=from(2015)`
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

    function fjern(kode) {
        valgte = valgte.filter(k => k.kode !== kode);
        render();
}
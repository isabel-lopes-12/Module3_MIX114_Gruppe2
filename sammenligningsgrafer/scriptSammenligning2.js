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
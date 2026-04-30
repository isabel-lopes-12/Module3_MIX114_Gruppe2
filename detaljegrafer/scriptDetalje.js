const DATA_API =
    "https://data.ssb.no/api/pxwebapi/v2/tables/07459/data";

const KOMMUNE_API =
    "https://data.ssb.no/api/klass/v1/classifications/131/codes?from=2020-01-01";

function getKommuneFraURL() {
    return new URLSearchParams(window.location.search).get("kommune");
}

function setKommuneURL(kommune) {
    const url = new URL(window.location);
    url.searchParams.set("kommune", kommune);
    window.history.replaceState({}, "", url);
}

async function hentKommuner() {
    const res = await fetch(KOMMUNE_API);
    const json = await res.json();

    return json.codes
        .filter(k => k.code.length === 4)
        .map(k => ({
        kode: k.code,
        navn: k.name
    }));
}
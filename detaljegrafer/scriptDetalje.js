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


async function fyllDropdown() {
    const select = document.getElementById("kommuneSelect");
    const kommuner = await hentKommuner();

    select.innerHTML = "";

    kommuner
        .sort((a, b) => a.navn.localeCompare(b.navn))
        .forEach(k => {
            const opt = document.createElement("option");
            opt.value = k.kode;
            opt.textContent = k.navn;
            select.appendChild(opt);
    });

    return "0301";
}

async function hentBefolkning(kommune) {
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

function smooth(data) {
    return data.map((v, i, arr) =>
        i === 0 || i === arr.length - 1
        ? v
        : (arr[i - 1] + v + arr[i + 1]) / 3
    );
}

function lagDatasett(baseRaw) {
    const base = smooth(baseRaw);

    const change = base.map((v, i) =>
        i === 0 ? 0 : ((v - base[i - 1]) / base[i - 1]) * 100
    );

    return [
        base,
        base.map((_, i) => 40 + i * 0.2),
        change,
        base.map(v => v / 50000),
        base.map(v => v / 1000),
        base.map((_, i) => 15 + i * 0.15),
        base.map((_, i) => 1.8 - i * 0.02),
        change.map(v => -v * 0.5),
        change.map(v => v * 0.7)
    ];
}
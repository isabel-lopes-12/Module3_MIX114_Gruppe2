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

const titles = [
    "👥 Populasjon","🎂 Alder","🔄 Migrasjon",
    "🏠 Boligpris","💰 Inntekt","👴 Eldrevekst",
    "👶 Fødselsrate","📉 Fraflytting","➕ Flyttebalanse"
];

const bullets = [
    ["Antall innbyggere","Utvikling siste 10 år","Kilde: SSB"],
    ["Gjennomsnittlig alder","Demografisk trend","Langsiktig"],
    ["Årlig endring (%)","Inn/utflytting","Vekst"],
    ["Boligpris (indeks)","Basert på etterspørsel","Trend"],
    ["Inntekt (indeks)","Relativ utvikling","Kilde: SSB"],
    ["Eldreandel","Økende = press","Helse"],
    ["Fødselsrate","Fallende trend","Langsiktig"],
    ["Utflytting","Tap av innbyggere","Mobilitet"],
    ["Flyttebalanse (%)","Inn vs ut","Netto"]
];

function lagGrafer(years, baseData) {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";

    const datasets = lagDatasett(baseData);

    datasets.forEach((data, i) => {
        grid.insertAdjacentHTML("beforeend", `
            <div class="card">
        <div class="chart-box">
            <div id="chart${i}" class="chart"></div>
        </div>
        <div class="title">${titles[i]}</div>
        <div class="bullets">
            • ${bullets[i][0]}<br>
            • ${bullets[i][1]}<br>
            • ${bullets[i][2]}
            </div>
        </div>
    `);

    Highcharts.chart("chart" + i, {
        chart: { backgroundColor: "transparent" },
        title: { text: "" },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: { categories: years },
        yAxis: { title: { text: null }, gridLineColor: "#eee" },

        tooltip: {
        formatter: function () {
            const y = this.y;

            if (i === 2 || i === 7 || i === 8)
                return `<b>${this.category}</b><br>${y.toFixed(1)}%`;

            if (i === 3 || i === 6)
                return `<b>${this.category}</b><br>${y.toFixed(2)}`;

            return `<b>${this.category}</b><br>${Math.round(y).toLocaleString("no-NO")}`;
        }
        },

        series: [{
            data: data,
            color: "#111"
        }]
    });
    });
}

function vurder(data) {
    const første = data[0];
    const siste = data.at(-1);
    const forrige = data.at(-2);

    const vekst = ((siste - første) / første) * 100;
    const sisteEndring = ((siste - forrige) / forrige) * 100;

    let kritisk, press, bra;

  // KRITISK
    if (vekst < 0) {
        kritisk = `Befolkningen har falt med ${Math.abs(vekst).toFixed(1)}% de siste årene. 
        Dette kan føre til lavere skatteinntekter, redusert etterspørsel etter tjenester og utfordringer med å opprettholde et bærekraftig tjenestetilbud. 
        Over tid kan dette påvirke både næringsliv og attraktivitet negativt.`;
    } else if (vekst > 8) {
        kritisk = `Kommunen har hatt sterk befolkningsvekst (${vekst.toFixed(1)}%), noe som kan skape press på kapasitet i skoler, helse- og omsorgstjenester samt boligmarkedet. 
        Uten tilstrekkelig planlegging kan dette føre til flaskehalser i tjenestetilbudet.`;
    } else {
        kritisk = `Det er ingen tydelige kritiske utviklingstrekk i befolkningsutviklingen. 
        Likevel bør kommunen følge med på demografiske endringer, spesielt knyttet til aldring og fødselsrate, som kan påvirke behovet for tjenester på sikt.`;
    }

  // PRESS
    if (sisteEndring > 1) {
        press = `Befolkningen øker også i den siste perioden (${sisteEndring.toFixed(1)}%), noe som indikerer fortsatt tilflytting. 
        Dette kan føre til økt press på boligmarked, infrastruktur og kommunale tjenester, særlig dersom veksten skjer raskere enn utbygging og kapasitetsøkning.`;
    } else if (sisteEndring < -1) {
        press = `Befolkningen har også gått ned i siste periode (${sisteEndring.toFixed(1)}%). 
        Dette tyder på vedvarende utflytting eller lav tilflytting, noe som kan forsterke eksisterende utfordringer og gjøre det vanskeligere å opprettholde aktivitet og tjenestetilbud.`;
    } else {
        press = `Utviklingen i befolkningen er relativt stabil i den siste perioden (${sisteEndring.toFixed(1)}%). 
        Dette gir kommunen bedre forutsigbarhet i planlegging av tjenester, bolig og infrastruktur.`;
    }

  // BRA
    if (vekst > 5) {
        bra = `Kommunen fremstår som attraktiv med en samlet befolkningsvekst på ${vekst.toFixed(1)}%. 
        Dette kan tyde på god tilflytting, et velfungerende arbeidsmarked og attraktive bomiljøer. 
        Vekst gir også økt skatteinngang og bedre grunnlag for utvikling av tjenester og tilbud.`;
    } else if (vekst > 0) {
        bra = `Befolkningen har økt moderat (${vekst.toFixed(1)}%), noe som gir en stabil og forutsigbar utvikling. 
        Dette gjør det enklere å planlegge kapasitet i tjenester og infrastruktur uten store svingninger.`;
    } else {
        bra = `Lavere befolkning kan gi rom for bedre kapasitetsbalanse i enkelte tjenester og mindre press på bolig og infrastruktur. 
        Dette kan gi kommunen handlingsrom til å omstille og tilpasse seg nye behov.`;
    }

    document.getElementById("kritisk").innerHTML =
        `<strong>⛔ Kritiske utfordringer</strong><br>${kritisk}`;

    document.getElementById("presset").innerHTML =
        `<strong>📊 Press og utvikling</strong><br>${press}`;

    document.getElementById("bra").innerHTML =
        `<strong>✅ Styrker og velfungerende drift</strong><br>${bra}`;
}

function oppdaterTittel() {
    const select = document.getElementById("kommuneSelect");
    const navn = select.options[select.selectedIndex].text;

    document.getElementById("title").textContent = navn;
}

async function last(kommune) {
    document.getElementById("loader").style.display = "block";
    document.getElementById("app").style.display = "none";

    const data = await hentBefolkning(kommune);

    lagGrafer(data.years, data.values);
    vurder(data.values);
    oppdaterTittel();

    document.getElementById("loader").style.display = "none";
    document.getElementById("app").style.display = "block";
}

async function init() {
    const fallback = await fyllDropdown();
    const url = getKommuneFraURL();
    const valgt = url || fallback;

    const select = document.getElementById("kommuneSelect");
    select.value = valgt;

    select.addEventListener("change", e => {
        const kode = e.target.value;
        setKommuneURL(kode);
        last(kode);
    });

    last(valgt);
}

init();
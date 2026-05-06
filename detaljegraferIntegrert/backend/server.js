import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();
console.log("API key finnes:", !!process.env.OPENAI_API_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.post("/api/summary", async (req, res) => {
  try {
    const data = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `

        Du er en hjelpsom analyseassistent for kommunal planlegging.

        Lag en kort og lett forståelig oppsummering av kommunen ${data.kommune}.

        VIKTIG:
        Svar KUN i HTML-format.

        Bruk enkelt språk (ikke akademisk).
        Skriv for raskt overblikk.

        Bruke denne strukturen:
        <p><strong>Kort oppsumert:</strong> én kort setning</p>

        <ul>
          <li>Kort punkt</li>
          <li>Kort punkt</li>
          <li>Kort punkt</li>
          <li>Kort punkt</li>
        </ul>

        Format:
        - Start med 1 kort hovedpoeng (én setning)
        - Maks 5 kulepunkter
        - Du må inkludere et kulepunkt om fødselsrate
        - Korte setninger
        - Ikke lange avsnitt
        - Ikke skriv lange avsnitt
        - Enkelt språk
        - Bruk gjerne emojis for å gjøre det mer visuelt og engasjerende, for eksempel:
          - Skole: 🎓
          - Helse: 🏥
          - Bolig: 🏠
          - Kommunale tjenester: 🏛️
          - Utfordringer: ⚠️
          - Styrker: ✅
          - Press: 🔥
          - Fødselsrate: 👶


        Forklar hva utviklingen kan bety for:
        - skole
        - helse
        - bolig
        - kommunale tjenester
        - fødselsrate

        Vurder også fødselsrate spesielt:
        - Lav fødselsrate kan gi aldrende befolkning
        - Høy fødselsrate kan gi behov for flere skoler/barnehager
        - Fødselsrate er regnet i barn per kvinne, spesifiser dette i oppsummeringen

        Data:

        Kritiske utfordringer:
        ${data.kritisk}

        Press og utvikling:
        ${data.presset}

        Styrker:
        ${data.bra}

        Fødselsrate:
        ${data.fodselsrate} barn per kvinne

        Svar maks 120 ord.
        Bruk gjerne kulepunkter, emojis og korte setninger. 
        `
    });

    res.json({
      summary: response.output_text
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      summary: "Noe gikk galt med KI."
    });
  }
});

app.listen(3000, () => {
  console.log("Server kjører på http://localhost:3000");
});

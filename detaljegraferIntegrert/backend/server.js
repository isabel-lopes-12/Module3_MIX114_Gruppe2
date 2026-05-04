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
Oppsummer denne kommunen kort og tydelig:

Kommune: ${data.kommune}

Kritisk:
${data.kritisk}

Press:
${data.presset}

Bra:
${data.bra}

Svar på norsk, 4-6 setninger.
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

console.log("Fikk request:", req.body);
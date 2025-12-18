
import { GoogleGenAI } from "@google/genai";
import { Transaction } from "../types";

export const analyzeBudget = async (transactions: Transaction[]): Promise<string> => {
  try {
    // Inizializzazione corretta secondo le linee guida: deve usare l'oggetto con proprietà named
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const prompt = `
      Analizza le seguenti transazioni finanziarie di uno studio medico:
      ${JSON.stringify(transactions, null, 2)}
      
      Per favore, fornisci un'analisi dettagliata in formato Markdown che includa:
      1. Una sintesi dello stato di salute finanziario.
      2. Tre suggerimenti specifici per ridurre le spese o aumentare l'efficienza basandoti sulle categorie di spesa.
      3. Un commento sul bilancio tra entrate e uscite.
      
      Rispondi esclusivamente in lingua italiana con un tono professionale e rassicurante.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "Sei un consulente finanziario esperto in gestione di studi medici."
      },
    });

    // Accesso corretto alla proprietà .text (non metodo)
    return response.text || "Non è stato possibile generare un'analisi al momento.";
  } catch (error) {
    console.error("Errore durante l'analisi AI:", error);
    return "Errore nella comunicazione con l'assistente AI. Assicurati che l'API KEY sia configurata su Vercel.";
  }
};

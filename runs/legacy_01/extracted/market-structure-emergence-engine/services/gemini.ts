
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketAnalysis = async (progress: number) => {
  const stage = progress < 0.3 ? "Early Accumulation" : 
                progress < 0.6 ? "Peak Volatility (Structural Jitter)" : 
                "Emergent Contagion (Inter-sector Phase)";

  const prompt = `Act as a senior quantitative market analyst. 
  The current market simulation is at stage: ${stage}. 
  The structural emergence progress is ${Math.round(progress * 100)}%.
  Provide a brief, 2-sentence cryptic observation about the "hidden correlations" and the "unseen risk" emerging in this digital landscape. 
  Use financial jargon like 'liquidity cascades', 'latent dimensionality', or 'idiosyncratic noise'.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Correlation matrices are converging. Risk is becoming non-linear.";
  }
};

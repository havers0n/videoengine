
import { GoogleGenAI, Type } from "@google/genai";
import { SimConfig } from "../types";

export const adjustSimulationWithAI = async (prompt: string, currentConfig: SimConfig): Promise<Partial<SimConfig>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Based on the following request: "${prompt}", suggest changes to the parameters of a particle flow field simulation.
    
    Available parameters:
    - particleCount: 100 to 5000
    - noiseScale: 0.001 to 0.1
    - noiseSpeed: 0 to 0.01
    - particleSpeed: 0.1 to 5
    - particleColor: Hex color
    - fieldColor: Hex color
    - trailAlpha: 0.01 to 0.5 (transparency of trails)
    - showField: boolean
    - strokeWeight: 0.5 to 4
    - hueRotate: boolean (particles shift colors over time)

    Current config: ${JSON.stringify(currentConfig)}

    Output ONLY a JSON object with the keys to change.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          particleCount: { type: Type.NUMBER },
          noiseScale: { type: Type.NUMBER },
          noiseSpeed: { type: Type.NUMBER },
          particleSpeed: { type: Type.NUMBER },
          particleColor: { type: Type.STRING },
          fieldColor: { type: Type.STRING },
          trailAlpha: { type: Type.NUMBER },
          showField: { type: Type.BOOLEAN },
          strokeWeight: { type: Type.NUMBER },
          hueRotate: { type: Type.BOOLEAN },
        }
      }
    }
  });

  try {
    return JSON.parse(response.text.trim());
  } catch (e) {
    console.error("Failed to parse AI response", e);
    return {};
  }
};

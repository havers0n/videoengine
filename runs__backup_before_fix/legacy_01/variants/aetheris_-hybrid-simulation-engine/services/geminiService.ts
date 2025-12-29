
import { GoogleGenAI } from "@google/genai";
import { SimulationState } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function observeSimulation(state: SimulationState) {
  try {
    const prompt = `Analyze this physics simulation state:
    - Average System Stress: ${state.avgStress.toFixed(2)}
    - Active Clusters: ${state.activeClusters}
    - Simulation Tick: ${state.tickCount}
    - Total Entities: ${state.particles.length}

    Act as a "Quantum Observer". Provide a brief, poetic, yet scientific observation (max 2 sentences) about the current harmony or chaos of the system. Mention if the noise seems to be overpowering the deterministic logic.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.8,
        maxOutputTokens: 100,
      }
    });

    return response.text || "The system hums in a state of silent equilibrium.";
  } catch (error) {
    console.error("Gemini Observation Error:", error);
    return "The observer is momentarily blinded by the kinetic complexity.";
  }
}

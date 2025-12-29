import { GoogleGenAI, Type } from "@google/genai";
import { Particle, CognitiveState } from '../types';

export const generateCognitiveSeed = async (topic: string, count: number): Promise<Partial<Particle>[]> => {
  if (!process.env.API_KEY) {
    console.warn("No API_KEY found for Gemini");
    return generateMockData(topic, count);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `Generate ${count} distinct cognitive thoughts/observations about the topic: "${topic}".
    For each thought, estimate a confidence level (0.1-0.9) and an uncertainty level (0.1-0.9) representing a starting cognitive state.
    Return JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING, description: "Short textual representation of the thought (max 6 words)" },
              confidence: { type: Type.NUMBER, description: "Float between 0.1 and 0.9" },
              uncertainty: { type: Type.NUMBER, description: "Float between 0.1 and 0.9" }
            },
            required: ["text", "confidence", "uncertainty"]
          }
        }
      }
    });

    const rawData = JSON.parse(response.text || "[]");
    
    return rawData.map((item: any) => ({
      text: item.text,
      state: CognitiveState.PERCEPTION, // All external inputs start as Perception
      confidence: item.confidence,
      uncertainty: item.uncertainty,
      decay: 0,
      age: 0
    }));

  } catch (error) {
    console.error("Gemini API Error:", error);
    return generateMockData(topic, count);
  }
};

const generateMockData = (topic: string, count: number): Partial<Particle>[] => {
  const mocks = [];
  for (let i = 0; i < count; i++) {
    mocks.push({
      text: `${topic} observation ${i + 1}`,
      state: CognitiveState.PERCEPTION,
      confidence: Math.random() * 0.8 + 0.1,
      uncertainty: Math.random() * 0.8 + 0.1,
      decay: 0,
      age: 0
    });
  }
  return mocks;
};

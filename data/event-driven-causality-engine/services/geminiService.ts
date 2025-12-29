
import { GoogleGenAI } from "@google/genai";
import { CausalityEventType } from "../types";

export class GeminiNarrator {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  }

  public async getCausalityAnalysis(eventType: CausalityEventType): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze the current state of a deterministic event-driven simulation. 
        Current State: ${eventType}. 
        Provide a single short, philosophical sentence (max 15 words) describing the causality of this phase.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      return response.text || "The causal chain persists in silence.";
    } catch (e) {
      console.error(e);
      return "Communication with the higher intelligence interrupted.";
    }
  }
}

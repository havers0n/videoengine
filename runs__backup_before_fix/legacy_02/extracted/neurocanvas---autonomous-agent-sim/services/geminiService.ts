import { GoogleGenAI, Type } from "@google/genai";
import { AgentData, WorldConfig } from "../types";

// Ensure API key is present
const apiKey = process.env.API_KEY || '';

/**
 * Generates a world configuration based on a user's text description.
 */
export const generateScenarioConfig = async (
  userPrompt: string,
  baseWidth: number,
  baseHeight: number
): Promise<Partial<WorldConfig>> => {
  if (!apiKey) {
    console.error("No API KEY provided");
    return {};
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `
      You are an expert simulation architect. 
      Your goal is to configure a 2D agent simulation based on the user's scenario description.
      The simulation has agents and resources.
      
      Parameters you can tune:
      - initialAgentCount: 5 to 100
      - initialResourceCount: 5 to 50
      - globalDecay: 0.0 to 1.0 (Higher means harsher environment)
      - agentConfig:
        - visionRadius: 50 to 300
        - maxSpeed: 1 to 5
        - metabolism: 0.1 to 1.0 (Cost of living)
        - aggressiveness: 0 to 1 (Likelihood to steal/fight)
        - social: 0 to 1 (Likelihood to share info)
        - greed: 0 to 1 (Priority on food)
        - color: Hex code string
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a configuration for this scenario: "${userPrompt}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            initialAgentCount: { type: Type.INTEGER },
            initialResourceCount: { type: Type.INTEGER },
            globalDecay: { type: Type.NUMBER },
            agentConfig: {
              type: Type.OBJECT,
              properties: {
                visionRadius: { type: Type.NUMBER },
                maxSpeed: { type: Type.NUMBER },
                metabolism: { type: Type.NUMBER },
                aggressiveness: { type: Type.NUMBER },
                social: { type: Type.NUMBER },
                greed: { type: Type.NUMBER },
                color: { type: Type.STRING },
              },
              required: ["visionRadius", "maxSpeed", "metabolism", "aggressiveness", "social", "greed", "color"]
            }
          },
          required: ["initialAgentCount", "initialResourceCount", "globalDecay", "agentConfig"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from Gemini");

    return JSON.parse(jsonText);

  } catch (error) {
    console.error("Gemini Scenario Generation Error:", error);
    // Fallback or rethrow
    throw error;
  }
};

/**
 * Analyzes a specific agent's behavior and recent memory to provide a "thought process" summary.
 */
export const analyzeAgentBehavior = async (agent: AgentData, nearbyResources: number, nearbyAgents: number): Promise<string> => {
   if (!apiKey) return "API Key missing. Cannot analyze agent.";

   try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analyze this agent's state and explain its current behavior.
      
      Agent ID: ${agent.id.substring(0, 4)}
      State: ${agent.state}
      Energy: ${agent.energy.toFixed(1)} / ${agent.maxEnergy}
      Personality: [Aggression: ${agent.config.aggressiveness}, Social: ${agent.config.social}, Greed: ${agent.config.greed}]
      Context: ${nearbyResources} resources nearby, ${nearbyAgents} other agents nearby.
      Recent Memory: ${agent.memory.slice(-3).map(m => m.event).join(', ')}
      
      Provide a short, 1-2 sentence "internal monologue" or observation in the first person.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      }
    });

    return response.text || "Thinking...";
   } catch (error) {
     console.error("Gemini Analysis Error", error);
     return "Thinking process interrupted.";
   }
};

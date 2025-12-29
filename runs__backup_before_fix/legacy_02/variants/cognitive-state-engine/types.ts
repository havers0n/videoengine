export enum CognitiveState {
  IDLE = 'IDLE',
  PERCEPTION = 'PERCEPTION',
  ANALYSIS = 'ANALYSIS',
  SYNTHESIS = 'SYNTHESIS',
  DECISION = 'DECISION',
  MEMORY = 'MEMORY',
  DECAYED = 'DECAYED'
}

export interface Particle {
  id: string;
  text: string;
  state: CognitiveState;
  confidence: number; // 0.0 to 1.0
  uncertainty: number; // 0.0 to 1.0
  decay: number; // 0.0 to 1.0
  age: number; // Ticks
  
  // D3 Simulation properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimulationLink {
  source: string | Particle;
  target: string | Particle;
  strength?: number;
}

export interface SimulationConfig {
  decayRate: number;
  learningRate: number;
  uncertaintyVolatility: number;
  autoSpawn: boolean;
}

export interface GeminiInput {
  topic: string;
  count: number;
}

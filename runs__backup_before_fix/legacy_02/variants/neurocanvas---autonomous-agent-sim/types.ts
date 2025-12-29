export enum AgentState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  GATHERING = 'GATHERING',
  SHARING = 'SHARING',
  FLEEING = 'FLEEING',
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface MemoryLog {
  tick: number;
  event: string;
  location: Vec2;
  value: number; // Utility value of the memory
}

export interface AgentConfig {
  visionRadius: number;
  maxSpeed: number;
  metabolism: number; // Energy cost per tick
  aggressiveness: number; // 0-1
  social: number; // 0-1 (Tendency to share info)
  greed: number; // 0-1 (Priority on gathering)
  color: string;
}

export interface AgentData {
  id: string;
  position: Vec2;
  velocity: Vec2;
  energy: number;
  maxEnergy: number;
  state: AgentState;
  target: Vec2 | null;
  score: number;
  config: AgentConfig;
  memory: MemoryLog[];
  generation: number;
}

export interface Resource {
  id: string;
  position: Vec2;
  value: number;
  type: 'FOOD' | 'WATER' | 'DATA';
  color: string;
}

export interface WorldConfig {
  seed: string;
  width: number;
  height: number;
  initialAgentCount: number;
  initialResourceCount: number;
  globalDecay: number; // How fast resources rot or energy drains
  agentConfig: AgentConfig;
  scenarioDescription: string;
}

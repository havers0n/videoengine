
export interface Vector {
  x: number;
  y: number;
}

export enum AgentState {
  IDLE = 'IDLE',
  ALERT = 'ALERT',
}

export interface Agent {
  id: number;
  position: Vector;
  velocity: Vector;
  acceleration: Vector;
  state: AgentState;
  stress: number; // 0 to 1
  perceptionRadius: number;
  maxSpeed: number;
  maxForce: number;
}

export interface SimulationConfig {
  agentCount: number;
  neighborRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  boundaryForce: number;
  stressDecay: number;
  stressThreshold: number;
}

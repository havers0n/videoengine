
export enum SystemPhase {
  DORMANT = 'DORMANT',     // Static state
  GATHERING = 'GATHERING', // Pulling energy in
  SURGING = 'SURGING',     // Rapid orbital activity
  DISCHARGE = 'DISCHARGE', // High-velocity explosion
  COOLING = 'COOLING'      // Decay and stabilization
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  color: string;
  size: number;
}

export interface EngineState {
  phase: SystemPhase;
  energy: number; // 0 to 100
  particleCount: number;
  cycleCount: number;
}

export const THRESHOLDS = {
  GATHER_TO_SURGE: 40,
  SURGE_TO_DISCHARGE: 100,
  DISCHARGE_DURATION: 60, // frames
  COOLING_DURATION: 120, // frames
};

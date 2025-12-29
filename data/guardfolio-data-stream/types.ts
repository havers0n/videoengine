export enum StreamPhase {
  FLOW = 'FLOW',
  TURBULENCE = 'TURBULENCE',
  CHANNELING = 'CHANNELING'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseY: number; // The "home" Y position for flow state
  offset: number; // Random offset for sine wave calculation
  color: string;
  life: number;
}

export interface SimulationState {
  phase: StreamPhase;
  progress: number; // 0 to 1 within the current phase
  time: number; // Global time
}
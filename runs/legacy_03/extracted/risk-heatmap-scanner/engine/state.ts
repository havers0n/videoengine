export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  basePos: Vec2; // Anchor for cluster gravity
  clusterId: number;
  id: number;
}

export interface Hotspot {
  pos: Vec2;
  radius: number;
  intensity: number;
  active: boolean;
  spawnTime: number;
}

export interface Scanner {
  pos: Vec2;
  angle: number; // For rotation animation
  phaseX: number; // Lissajous phase
  phaseY: number;
}

export interface Grid {
  width: number;
  height: number;
  cells: Float32Array; // 0.0 to 1.0 risk level
}

export interface SimulationState {
  t: number; // Simulation time in seconds
  dtAccumulator: number;
  
  width: number;
  height: number;
  
  particles: Particle[];
  hotspots: Hotspot[];
  grid: Grid;
  scanner: Scanner;
  
  // Global effects
  stressLevel: number; // 0.0 to 1.0, triggers glitch/shake
  globalRisk: number; // Aggregated risk
  
  // Narrative control
  phase: 'IDLE' | 'BREACH' | 'CONTAINMENT';
}

export const GRID_W = 64;
export const GRID_H = 36;
export const FIXED_STEP = 1 / 60;
export const TOTAL_DURATION = 18.0;

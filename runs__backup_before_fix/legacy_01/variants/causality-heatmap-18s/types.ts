export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  history: Vector2[]; // For trails
  activation: number; // 0 to 1, based on heat
}

export interface GridCell {
  x: number; // Grid coordinate
  y: number; // Grid coordinate
  value: number; // 0.0 to 1.0 (Temperature/Risk)
}

export interface PulseEvent {
  id: number;
  startTime: number; // 0.0 to 1.0 (fraction of loop)
  duration: number; // fraction of loop
  centerX: number; // Grid coordinate
  centerY: number; // Grid coordinate
  intensity: number;
}

export interface Hotspot {
  x: number;
  y: number;
  radius: number;
  baseIntensity: number;
  pulseSpeed: number; // For breathing effect
}

export interface SimulationConfig {
  width: number;
  height: number;
  cols: number;
  rows: number;
  loopDuration: number;
  seed: number;
}
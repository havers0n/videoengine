export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  radius: number;
  hue: number;
  life: number;
  maxLife: number;
}

export interface Hotspot {
  pos: Vector2;
  strength: number;
  radius: number;
  orbitSpeed: number;
  color: string;
}

export interface EngineState {
  t: number; // Simulation time in seconds
  particles: Particle[];
  hotspots: Hotspot[];
  rng: () => number; // Current RNG state closure
  width: number;
  height: number;
}

export const DT = 1 / 120; // Fixed timestep
export const MAX_FRAME_TIME = 0.25; // Cap to prevent spiral of death
export const DURATION = 18.0; // Loop duration

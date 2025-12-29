export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2;
  life: number;     // 0.0 to 1.0
  maxLife: number;
  hue: number;
  size: number;
}

export interface Hotspot {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  strength: number; // positive = attract, negative = repel
  color: string;
}

export interface EngineState {
  t: number;           // total simulation time
  particles: Particle[];
  hotspots: Hotspot[];
  width: number;
  height: number;
}

export interface SimulationConfig {
  particleCount: number;
  connectionDistance: number;
  baseSpeed: number;
  dt: number; // 1/120
  duration: number; // 18 seconds
}
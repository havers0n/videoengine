export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  color: string;
  baseSpeed: number;
}

export interface Hotspot {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  intensity: number;
  colorStart: string;
  colorEnd: string;
}

export interface EngineConfig {
  fixedTimeStep: number;
  particleCount: number;
  connectionDistance: number;
  trailFade: number; // 0 to 1, where 1 is instant clear, 0.1 is long trails
}

export interface WorldState {
  width: number;
  height: number;
  particles: Particle[];
  hotspots: Hotspot[];
  time: number;
}

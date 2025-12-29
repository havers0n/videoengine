export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  radius: number;
  hue: number;
  life: number; // 0 to 1
  maxLife: number;
}

export interface Hotspot {
  pos: Vector2;
  vel: Vector2;
  radius: number;
  hue: number;
}

export interface EngineState {
  particles: Particle[];
  hotspots: Hotspot[];
  width: number;
  height: number;
  time: number; // Simulation time in ms
}

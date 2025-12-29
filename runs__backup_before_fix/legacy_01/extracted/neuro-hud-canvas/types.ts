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
  history: Vector2[]; // For trails
}

export interface Hotspot {
  id: number;
  pos: Vector2;
  label: string;
  active: boolean;
  scanProgress: number;
}

export interface SimulationState {
  particles: Particle[];
  hotspots: Hotspot[];
  t: number;
}
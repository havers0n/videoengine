export interface Vector2 {
  x: number;
  y: number;
}

export interface Cluster {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  phaseOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  clusterIndex: number;
  history: Vector2[];
  heat: number; // 0 to 1, determines redness
}

export interface Hotspot {
  x: number;
  y: number;
  active: boolean;
  angle: number;
  speed: number;
  radius: number;
}

export interface SimulationState {
  time: number;
  clusters: Cluster[];
  particles: Particle[];
  hotspots: Hotspot[];
}